const express = require('express');
const dns     = require('dns').promises;
const router  = express.Router();

function clientIp(req) {
    const cf = req.headers['cf-connecting-ip'];
    if (cf) return cf;
    const xff = req.headers['x-forwarded-for'];
    if (xff) return xff.split(',')[0].trim();
    return req.socket.remoteAddress || '';
}

function ipFamily(ip) {
    if (!ip) return null;
    if (ip.includes(':')) return 'ipv6';
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return 'ipv4';
    return null;
}

function ipKind(ip) {
    if (!ip) return null;
    if (ip === '127.0.0.1' || ip === '::1') return 'loopback';
    if (ip.startsWith('10.')) return 'private (RFC1918)';
    if (ip.startsWith('192.168.')) return 'private (RFC1918)';
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 'private (RFC1918)';
    if (ip.startsWith('169.254.')) return 'link-local';
    if (ip.startsWith('fc') || ip.startsWith('fd')) return 'unique-local (IPv6)';
    if (ip.startsWith('fe80')) return 'link-local (IPv6)';
    return 'public';
}

router.get('/api/ip', async (req, res) => {
    const ip = clientIp(req);
    const family = ipFamily(ip);
    const kind = ipKind(ip);

    let rdns = null;
    if (family && kind === 'public') {
        try {
            const names = await Promise.race([
                dns.reverse(ip),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
            ]);
            rdns = names && names.length ? names[0] : null;
        } catch (_) {}
    }

    const cfCountry = req.headers['cf-ipcountry'] || null;
    const cfRay     = req.headers['cf-ray'] || null;

    res.json({
        ip,
        family,
        kind,
        reverse: rdns,
        country: cfCountry && cfCountry !== 'XX' ? cfCountry : null,
        cf_ray: cfRay,
        user_agent: req.headers['user-agent'] || null,
        accept_language: req.headers['accept-language'] || null,
    });
});

module.exports = router;
