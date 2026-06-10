const express = require('express');
const http    = require('http');
const https   = require('https');
const path    = require('path');
const router  = express.Router();
const { resolvePinned, pinnedLookup } = require('../lib/safe-host');

const MAX_REDIRECTS = 5;
const MAX_BYTES = 1_000_000;
const TIMEOUT = 8_000;

function fetchSafe(rawUrl, depth = 0) {
    return new Promise(async (resolve, reject) => {
        if (depth > MAX_REDIRECTS) return reject(new Error('too many redirects'));

        let parsed;
        try { parsed = new URL(rawUrl); } catch { return reject(new Error('invalid url')); }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
            return reject(new Error('only http/https allowed'));

        const pin = await resolvePinned(parsed.hostname);
        if (!pin) return reject(new Error('url not allowed'));

        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(parsed.href, {
            method: 'GET',
            timeout: TIMEOUT,
            lookup: pinnedLookup(pin),
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; hrz-meta/1.0)',
                'Accept': 'text/html,application/xhtml+xml',
            },
        }, (response) => {
            const status = response.statusCode;

            if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
                response.resume();
                const next = new URL(response.headers.location, parsed).href;
                return fetchSafe(next, depth + 1).then(resolve).catch(reject);
            }

            if (status < 200 || status >= 300) {
                response.resume();
                return reject(new Error(`upstream ${status}`));
            }

            const ct = response.headers['content-type'] || '';
            if (!ct.includes('text/html')) {
                response.resume();
                return reject(new Error('not an html page'));
            }

            let body = '';
            let bytes = 0;
            response.on('data', c => {
                bytes += c.length;
                if (bytes > MAX_BYTES) { response.destroy(); return; }
                body += c;
            });
            response.on('end', () => resolve({ body, finalUrl: parsed }));
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

router.get('/api/meta', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url required' });

    let initial;
    try { initial = url.startsWith('http') ? url : 'https://' + url; }
    catch { return res.status(400).json({ error: 'invalid url' }); }

    try {
        const { body: html, finalUrl } = await fetchSafe(initial);

        function getMeta(patterns) {
            for (const p of patterns) {
                const m = html.match(p);
                if (m?.[1]) return m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
            }
            return null;
        }

        const title   = getMeta([/property="og:title"\s+content="([^"]+)"/i, /name="twitter:title"\s+content="([^"]+)"/i, /<title[^>]*>([^<]+)<\/title>/i]) || finalUrl.hostname;
        const desc    = getMeta([/property="og:description"\s+content="([^"]+)"/i, /name="twitter:description"\s+content="([^"]+)"/i, /name="description"\s+content="([^"]+)"/i]);
        const image   = getMeta([/property="og:image"\s+content="([^"]+)"/i, /name="twitter:image"\s+content="([^"]+)"/i]);
        const siteName= getMeta([/property="og:site_name"\s+content="([^"]+)"/i]);
        const twitterCard = getMeta([/name="twitter:card"\s+content="([^"]+)"/i]);

        let favicon = null;
        const favM = html.match(/<link[^>]+rel="[^"]*icon[^"]*"[^>]+href="([^"]+)"/i)
                  || html.match(/<link[^>]+href="([^"]+)"[^>]+rel="[^"]*icon[^"]*"/i);
        if (favM?.[1]) {
            try {
                const favUrl = new URL(favM[1], finalUrl.href);
                if (favUrl.protocol === 'http:' || favUrl.protocol === 'https:') {
                    favicon = favUrl.href;
                }
            } catch {}
        }
        if (!favicon) favicon = `${finalUrl.protocol}//${finalUrl.host}/favicon.ico`;

        res.json({ title, desc, image, siteName, twitterCard, favicon, url: finalUrl.href, host: finalUrl.hostname });
    } catch (e) {
        res.status(422).json({ error: e.message || 'fetch failed' });
    }
});

router.get('/meta', (_req, res) => res.sendFile(path.join(__dirname, '../public/meta/index.html')));
module.exports = router;
