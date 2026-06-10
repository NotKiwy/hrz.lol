const express = require('express');
const QRCode  = require('qrcode');
const router  = express.Router();

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

router.get('/api/qr', async (req, res) => {
    let { text, size = '200', ec = 'L', dark = '#111111', light = '#faf8f3' } = req.query;

    if (!text) return res.status(400).json({ error: 'text required' });
    if (text.length > 2000) return res.status(400).json({ error: 'text too long (max 2000 chars)' });

    const s = Math.min(Math.max(parseInt(size, 10) || 200, 64), 1000);
    const ecLevel = ['L','M','Q','H'].includes((ec||'').toUpperCase()) ? ec.toUpperCase() : 'L';
    const darkColor  = HEX_RE.test(dark)  ? dark  : '#111111';
    const lightColor = HEX_RE.test(light) ? light : '#faf8f3';

    try {
        const buf = await QRCode.toBuffer(text, {
            width: s,
            margin: 2,
            errorCorrectionLevel: ecLevel,
            color: { dark: darkColor, light: lightColor },
        });
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=3600');
        res.send(buf);
    } catch (e) {
        res.status(400).json({ error: e.message || 'qr generation failed' });
    }
});

module.exports = router;
