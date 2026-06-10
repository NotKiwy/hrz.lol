const express = require('express');
const sharp   = require('sharp');
const router  = express.Router();

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const TOOLS = {
    home:  { name: 'hrz.lol',    tagline: 'free developer tools' },
    paste: { name: 'paste',      tagline: 'share code in seconds' },
    lnk:   { name: 'link',       tagline: 'shorten any url instantly' },
    conv:  { name: 'convert',    tagline: 'convert images to any format' },
    chat:  { name: 'chat',       tagline: "let's talk, then disappear" },
    draw:  { name: 'draw',       tagline: "let's draw something together" },
    hook:  { name: 'webhook',    tagline: 'inspect every request live' },
    img:   { name: 'images',     tagline: 'placeholder images on demand' },
    fake:  { name: 'fake data',  tagline: 'generate realistic test data' },
    json:  { name: 'json',       tagline: 'format, validate & explore' },
    cron:  { name: 'cron',       tagline: 'build cron expressions visually' },
    diff:  { name: 'diff',       tagline: 'compare text side by side' },
    meta:  { name: 'meta',       tagline: 'preview any url before sharing' },
    ts:    { name: 'timestamp',  tagline: 'unix / date converter' },
    md:    { name: 'markdown',   tagline: 'write and preview markdown' },
    color: { name: 'color',      tagline: 'pick, convert & generate palettes' },
    qr:    { name: 'qr code',    tagline: 'generate qr codes instantly' },
    url:   { name: 'url parser', tagline: 'inspect & decode any url' },
    whois: { name: 'whois',      tagline: 'domain registration lookup' },
    chars: { name: 'chars',      tagline: 'count characters, words & more' },
    req:   { name: 'http client',tagline: 'send requests from the browser' },
    hash:  { name: 'hash',       tagline: 'md5 · sha-1 · sha-256 · sha-512' },
    jwt:   { name: 'jwt',        tagline: 'decode & inspect jwt tokens' },
    enc:   { name: 'encode',     tagline: 'base64 · url · html · hex' },
};

function buildSvg({ name, tagline }) {
    const isHome = name === 'hrz.lol';

    const len = name.length;
    const fs  = len <= 4 ? 108 : len <= 6 ? 92 : len <= 8 ? 78 : len <= 10 ? 66 : 56;

    const labelY   = 452;
    const nameY    = 554;
    const taglineY = 603;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#faf8f3"/>
  <rect width="1200" height="9" fill="#f0c040"/>

  ${!isHome ? `<text x="62" y="${labelY}"
        font-family="Arial,'Liberation Sans','DejaVu Sans',sans-serif"
        font-size="32" font-weight="900" letter-spacing="-0.5" fill="#f0c040">${esc('hrz.lol')}</text>` : ''}

  <text x="60" y="${nameY}"
        font-family="Arial,'Liberation Sans','DejaVu Sans',sans-serif"
        font-size="${fs}" font-weight="900" letter-spacing="-2" fill="#111111">${esc(name)}</text>

  <text x="62" y="${taglineY}"
        font-family="Arial,'Liberation Sans','DejaVu Sans',sans-serif"
        font-size="30" font-weight="600" fill="#999999">${esc(tagline)}</text>
</svg>`;
}

const cache = new Map();

router.get('/og/:tool', async (req, res) => {
    const raw = req.params.tool.replace(/\.png$/i, '').toLowerCase();
    const key = TOOLS[raw] ? raw : 'home';
    const tool = TOOLS[key];

    if (cache.has(key)) {
        res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
        return res.send(cache.get(key));
    }

    try {
        const buf = await sharp(Buffer.from(buildSvg(tool))).png({ compressionLevel: 8 }).toBuffer();
        cache.set(key, buf);
        res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
        res.send(buf);
    } catch (e) {
        console.error('og error:', e);
        res.status(500).send('error');
    }
});

module.exports = router;
