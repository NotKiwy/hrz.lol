const express = require('express');
const sharp   = require('sharp');
const path    = require('path');

const router = express.Router();

router.get('/img/:dims/:color?/:label?', async (req, res) => {
    const { dims, color = 'cccccc', label } = req.params;
    const match = dims.match(/^(\d{1,5})x(\d{1,5})$/i);
    if (!match) return res.status(400).send('Bad dimensions. Use WxH e.g. 800x600');

    const w = Math.min(parseInt(match[1]), 4096);
    const h = Math.min(parseInt(match[2]), 4096);
    if (w < 1 || h < 1) return res.status(400).send('Dimensions too small');

    const hex = color.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).padStart(6, '0');
    const r   = parseInt(hex.slice(0, 2), 16);
    const g   = parseInt(hex.slice(2, 4), 16);
    const b   = parseInt(hex.slice(4, 6), 16);

    const lum  = 0.299 * r + 0.587 * g + 0.114 * b;
    const fg   = lum > 128 ? '#333333' : '#eeeeee';
    const rawLabel = label ? label.slice(0, 60) : `${w}×${h}`;
    const text = rawLabel.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fs   = Math.max(12, Math.min(Math.floor(Math.min(w, h) / 8), 48));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#${hex}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="sans-serif" font-size="${fs}" fill="${fg}" font-weight="600">${text}</text>
</svg>`;

    try {
        const buf = await sharp(Buffer.from(svg)).png().toBuffer();
        res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
        res.send(buf);
    } catch {
        res.status(500).send('error');
    }
});

router.get('/img', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/img/index.html'))
);

module.exports = router;
