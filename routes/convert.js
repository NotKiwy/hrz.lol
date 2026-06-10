const express  = require('express');
const multer   = require('multer');
const sharp    = require('sharp');
const path     = require('path');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/'))
            return cb(new Error('Images only'));
        cb(null, true);
    },
});

const FORMATS = {
    jpg:  { mime: 'image/jpeg', ext: 'jpg' },
    png:  { mime: 'image/png',  ext: 'png' },
    webp: { mime: 'image/webp', ext: 'webp' },
    avif: { mime: 'image/avif', ext: 'avif' },
    tiff: { mime: 'image/tiff', ext: 'tiff' },
    gif:  { mime: 'image/gif',  ext: 'gif' },
};

router.post('/api/convert', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const fmt = req.body.format || 'webp';
    const q   = Math.min(100, Math.max(1, parseInt(req.body.quality) || 80));

    if (!FORMATS[fmt]) return res.status(400).json({ error: 'Unknown format' });

    try {
        let img = sharp(req.file.buffer);

        if      (fmt === 'jpg')  img = img.jpeg({ quality: q, mozjpeg: true });
        else if (fmt === 'png')  img = img.png({ compressionLevel: Math.round((100 - q) / 11) });
        else if (fmt === 'webp') img = img.webp({ quality: q });
        else if (fmt === 'avif') img = img.avif({ quality: q });
        else if (fmt === 'tiff') img = img.tiff({ quality: q });
        else if (fmt === 'gif')  img = img.gif();

        const buf  = await img.toBuffer();
        const safeName = path.parse(req.file.originalname).name.replace(/[^\w\-. ]/g, '_').slice(0, 100);
        const name = safeName + '.' + FORMATS[fmt].ext;

        res.set({
            'Content-Type':        FORMATS[fmt].mime,
            'Content-Disposition': `attachment; filename="${name}"`,
            'Content-Length':      buf.length,
            'X-Original-Size':     req.file.size,
            'X-Output-Size':       buf.length,
        });
        res.send(buf);
    } catch {
        res.status(422).json({ error: 'Could not process image — is it a valid file?' });
    }
});

router.use((err, _req, res, _next) => {
    res.status(400).json({ error: err.message || 'Upload error' });
});

router.get('/convert', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/convert/index.html'))
);

router.get('/conv', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/convert/index.html'))
);

module.exports = router;
