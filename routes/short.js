const express    = require('express');
const { nanoid } = require('nanoid');
const path       = require('path');
const { db }     = require('../db');

const router = express.Router();

function normalizeUrl(raw) {
    try {
        const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return u.href;
    } catch {
        return null;
    }
}

router.post('/api/short', async (req, res) => {
    try {
        const { url, max_clicks } = req.body;
        const normalized = normalizeUrl(url?.trim() || '');
        if (!normalized) return res.status(400).json({ error: 'Invalid URL' });

        const maxC = max_clicks ? Math.max(1, Math.min(10000, parseInt(max_clicks))) : null;
        const code = nanoid(6);

        await db().collection('links').insertOne({
            code,
            url: normalized,
            created_at: Math.floor(Date.now() / 1000),
            clicks: 0,
            max_clicks: maxC,
        });

        res.json({
            code,
            short: `${req.protocol}://${req.get('host')}/s/${code}`,
            max_clicks: maxC,
        });
    } catch (e) {
        console.error('short POST:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/api/short/:code', async (req, res) => {
    try {
        const doc = await db().collection('links').findOne({ code: req.params.code });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        const { _id, ...link } = doc;
        res.json(link);
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/s/:code', async (req, res) => {
    try {
        const doc = await db().collection('links').findOne({ code: req.params.code });
        if (!doc) return res.status(404).sendFile(path.join(__dirname, '../public/short/404.html'));

        if (doc.max_clicks !== null && doc.max_clicks !== undefined && doc.clicks >= doc.max_clicks) {
            await db().collection('links').deleteOne({ code: req.params.code });
            return res.status(410).sendFile(path.join(__dirname, '../public/short/expired.html'));
        }

        const newClicks = doc.clicks + 1;
        await db().collection('links').updateOne({ code: req.params.code }, { $inc: { clicks: 1 } });

        if (doc.max_clicks !== null && doc.max_clicks !== undefined && newClicks >= doc.max_clicks) {
            await db().collection('links').deleteOne({ code: req.params.code });
        }

        res.redirect(302, doc.url);
    } catch (e) {
        console.error('short redirect:', e);
        res.status(500).send('Server error');
    }
});

router.get('/short', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/short/index.html'))
);

module.exports = router;
