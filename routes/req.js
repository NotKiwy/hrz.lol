const express = require('express');
const http    = require('http');
const https   = require('https');
const router  = express.Router();
const { resolvePinned, pinnedLookup } = require('../lib/safe-host');

const HEADER_VALUE_OK = /^[\x20-\x7E\t]+$/;

router.post('/api/req', express.json({ limit: '512kb' }), async (req, res) => {
    const { method = 'GET', url, headers = {}, body } = req.body || {};

    if (!url) return res.status(400).json({ error: 'url required' });

    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'invalid url' }); }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        return res.status(400).json({ error: 'only http/https allowed' });

    const pin = await resolvePinned(parsed.hostname);
    if (!pin) return res.status(403).json({ error: 'private or disallowed url' });

    const cleanHeaders = {};
    for (const [k, v] of Object.entries(headers).slice(0, 30)) {
        if (/^(host|connection|transfer-encoding|content-length)$/i.test(k)) continue;
        const value = String(v);
        if (!HEADER_VALUE_OK.test(value)) continue;
        cleanHeaders[k] = value;
    }
    cleanHeaders['User-Agent'] = cleanHeaders['User-Agent'] || 'hrz.lol/req';

    const lib  = parsed.protocol === 'https:' ? https : http;
    const opts = {
        method: (method || 'GET').toUpperCase().slice(0, 10),
        headers: cleanHeaders,
        timeout: 10_000,
        lookup: pinnedLookup(pin),
    };

    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    if (bodyStr && opts.headers['content-type'] === undefined)
        opts.headers['content-type'] = 'application/json';

    try {
        const start = Date.now();
        const data  = await new Promise((resolve, reject) => {
            const r = lib.request(url, opts, response => {
                let raw = '';
                let bytes = 0;
                response.on('data', c => {
                    bytes += c.length;
                    if (bytes < 512_000) raw += c;
                });
                response.on('end', () => resolve({ response, raw }));
            });
            r.on('error', reject);
            r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });
            if (bodyStr) r.write(bodyStr);
            r.end();
        });

        const elapsed = Date.now() - start;
        const { response, raw } = data;

        let parsedBody = null;
        const ct = response.headers['content-type'] || '';
        if (ct.includes('application/json')) {
            try { parsedBody = JSON.parse(raw); } catch { parsedBody = null; }
        }

        res.json({
            status:  response.statusCode,
            statusText: response.statusMessage,
            elapsed,
            headers: response.headers,
            body:    parsedBody ?? raw.slice(0, 200_000),
            truncated: raw.length >= 512_000,
        });
    } catch (e) {
        res.status(502).json({ error: e.message || 'request failed' });
    }
});

module.exports = router;
