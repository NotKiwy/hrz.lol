const express   = require('express');
const { nanoid } = require('nanoid');
const path      = require('path');
const { db }    = require('../db');

const router = express.Router();

const EXPIRY = { '1h': 3600, '1d': 86400, '1w': 604800, '1m': 2592000, never: null };

const LANGUAGES = new Set([
    'plaintext','javascript','typescript','python','rust','go','java','c','cpp',
    'csharp','php','ruby','swift','kotlin','scala','html','css','sql','bash',
    'shell','json','yaml','toml','xml','markdown','dockerfile','nginx','makefile',
    'lua','perl','r','dart','elixir','erlang','haskell','clojure','fsharp',
    'vim','powershell','graphql','protobuf','groovy','coffeescript',
]);

function getService(hostname = '') {
    const sub = hostname.split('.')[0].toLowerCase();
    return sub === 'paste' ? 'paste' : sub === 'lnk' ? 'lnk' : 'home';
}

router.post('/api/paste', async (req, res) => {
    try {
        let { title, content, language = 'plaintext', expires = 'never' } = req.body;
        if (!LANGUAGES.has(language)) language = 'plaintext';

        if (!content?.trim())
            return res.status(400).json({ error: 'Content is required' });
        if (content.length > 500_000)
            return res.status(400).json({ error: 'Max size is 500 KB' });
        if (!(expires in EXPIRY))
            return res.status(400).json({ error: 'Invalid expiry' });

        const id = nanoid(8);
        const seconds = EXPIRY[expires];
        const now = Math.floor(Date.now() / 1000);
        const expires_at = seconds ? now + seconds : null;

        await db().collection('pastes').insertOne({
            id,
            title: (typeof title === 'string' ? title.trim().slice(0, 200) : '') || null,
            content,
            language,
            created_at: now,
            expires_at,
            views: 0,
        });

        res.json({ id });
    } catch (e) {
        console.error('paste POST:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/api/paste/:id', async (req, res) => {
    try {
        const doc = await db().collection('pastes').findOne({ id: req.params.id });
        if (!doc) return res.status(404).json({ error: 'Paste not found' });

        const now = Math.floor(Date.now() / 1000);
        if (doc.expires_at && doc.expires_at < now) {
            await db().collection('pastes').deleteOne({ id: doc.id });
            return res.status(410).json({ error: 'This paste has expired' });
        }

        await db().collection('pastes').updateOne({ id: doc.id }, { $inc: { views: 1 } });

        const { _id, ...paste } = doc;
        res.json({ ...paste, views: paste.views + 1 });
    } catch (e) {
        console.error('paste GET:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/raw/:id', async (req, res) => {
    try {
        const doc = await db().collection('pastes').findOne(
            { id: req.params.id },
            { projection: { content: 1, expires_at: 1 } }
        );
        if (!doc) return res.status(404).send('Not found');

        const now = Math.floor(Date.now() / 1000);
        if (doc.expires_at && doc.expires_at < now) return res.status(410).send('Expired');

        res.type('text/plain; charset=utf-8').send(doc.content);
    } catch (e) {
        res.status(500).send('Server error');
    }
});

router.get('/:id([A-Za-z0-9_-]{8})', (req, res) => {
    if (getService(req.hostname) !== 'paste') return res.status(404).end();
    res.sendFile(path.join(__dirname, '../public/paste/view.html'));
});

router.get('/paste', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/paste/index.html'))
);

module.exports = router;
