const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

router.post('/api/hash', express.json({ limit: '4mb' }), (req, res) => {
    const { text, data: b64data, algo } = req.body || {};
    const algos = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];

    if (algo && !algos.includes(algo)) return res.status(400).json({ error: 'unknown algorithm' });

    let buf;
    if (b64data !== undefined) {
        if (typeof b64data !== 'string' || b64data.length > 4_000_000)
            return res.status(400).json({ error: 'input too large (max ~3 MB)' });
        try {
            buf = Buffer.from(b64data, 'base64');
        } catch {
            return res.status(400).json({ error: 'invalid base64 data' });
        }
    } else {
        const t = text ?? '';
        if (t.length > 1_000_000) return res.status(400).json({ error: 'input too large (max 1 MB)' });
        buf = Buffer.from(t, 'utf8');
    }

    const target = algo ? [algo] : algos;
    const result = {};
    for (const a of target) {
        result[a] = crypto.createHash(a).update(buf).digest('hex');
    }
    res.json(result);
});

module.exports = router;
