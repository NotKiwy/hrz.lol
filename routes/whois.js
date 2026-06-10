const express = require('express');
const https   = require('https');
const dns     = require('dns').promises;
const router  = express.Router();

const RDAP_MAP = {
    com: 'https://rdap.verisign.com/com/v1/domain/',
    net: 'https://rdap.verisign.com/com/v1/domain/',
    cc:  'https://rdap.verisign.com/com/v1/domain/',
    tv:  'https://rdap.verisign.com/com/v1/domain/',
    org: 'https://rdap.publicinterestregistry.net/rdap/domain/',
    info:'https://rdap.afilias.info/rdap/info/domain/',
    io:  'https://rdap.nic.io/domain/',
    app: 'https://rdap.nic.google/domain/',
    dev: 'https://rdap.nic.google/domain/',
    page:'https://rdap.nic.google/domain/',
    gov: 'https://rdap.arin.net/registry/domain/',
    edu: 'https://rdap.educause.edu/domain/',
    lol: 'https://rdap.org/domain/',
    ai:  'https://rdap.nic.ai/domain/',
    co:  'https://rdap.nic.co/rdap/domain/',
};

function httpsGet(url, depth = 0) {
    return new Promise((resolve, reject) => {
        if (depth > 5) return reject(new Error('too many redirects'));
        let parsed;
        try { parsed = new URL(url); } catch { return reject(new Error('invalid url')); }
        if (parsed.protocol !== 'https:') return reject(new Error('non-https redirect'));

        const req = https.get(parsed.href, { headers: { Accept: 'application/rdap+json' }, timeout: 8000 }, res => {
            if ([301, 302, 307, 308].includes(res.statusCode)) {
                res.resume();
                const next = res.headers.location ? new URL(res.headers.location, parsed).href : null;
                if (!next) return reject(new Error('redirect without location'));
                return httpsGet(next, depth + 1).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', c => { data += c; if (data.length > 500_000) req.destroy(); });
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

router.get('/api/whois', async (req, res) => {
    let domain = (req.query.domain || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!domain) return res.status(400).json({ error: 'domain required' });
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(domain))
        return res.status(400).json({ error: 'invalid domain' });

    const tld    = domain.split('.').pop();
    const base   = RDAP_MAP[tld] || `https://rdap.org/domain/`;
    const rdapUrl = base + domain;

    try {
        const { status, body } = await httpsGet(rdapUrl);
        if (status === 404) return res.status(404).json({ error: 'domain not found' });
        if (status !== 200) return res.status(502).json({ error: `rdap error ${status}` });

        const d = JSON.parse(body);

        const events = {};
        (d.events || []).forEach(e => { events[e.eventAction] = e.eventDate; });

        const nameservers = (d.nameservers || []).map(n => n.ldhName || n.unicodeName || '').filter(Boolean);
        const status_list = (d.status || []);
        const entities    = (d.entities || []);

        let registrar = null;
        for (const e of entities) {
            if ((e.roles || []).includes('registrar')) {
                const vcard = e.vcardArray?.[1] || [];
                const fn = vcard.find(v => v[0] === 'fn');
                registrar = fn?.[3] || e.handle || null;
                break;
            }
        }

        res.json({
            domain:      d.ldhName || domain,
            status:      status_list,
            registered:  events.registration,
            updated:     events['last changed'],
            expires:     events.expiration,
            registrar,
            nameservers,
            raw: d,
        });
    } catch (e) {
        res.status(502).json({ error: e.message || 'lookup failed' });
    }
});

module.exports = router;
