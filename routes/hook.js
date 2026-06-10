const express  = require('express');
const { nanoid } = require('nanoid');
const path      = require('path');

const router = express.Router();

const hooks = new Map();

const EXPIRY = 3_600_000;
const MAX_CLIENTS = 20;
const MAX_HOOKS = 5000;

function touch(id) {
    const h = hooks.get(id);
    if (!h) return;
    if (h.timer) clearTimeout(h.timer);
    h.timer = setTimeout(() => hooks.delete(id), EXPIRY);
}

router.post('/api/hook', (req, res) => {
    if (hooks.size >= MAX_HOOKS) return res.status(503).json({ error: 'capacity full' });
    const id = nanoid(8);
    hooks.set(id, { requests: [], clients: new Set(), timer: null });
    touch(id);
    res.json({ id });
});

router.get('/hook/:id', (req, res) => {
    if (!hooks.has(req.params.id))
        return res.status(404).sendFile(path.join(__dirname, '../public/hook/404.html'));
    res.sendFile(path.join(__dirname, '../public/hook/inspect.html'));
});

router.get('/hook/:id/stream', (req, res) => {
    const h = hooks.get(req.params.id);
    if (!h) return res.status(404).end();
    if (h.clients.size >= MAX_CLIENTS) return res.status(429).end();

    res.set({
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'Connection':        'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'history', requests: h.requests })}\n\n`);

    h.clients.add(res);
    req.on('close', () => h.clients.delete(res));
});

router.all('/h/:id', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    const h = hooks.get(req.params.id);
    if (!h) return res.status(404).json({ error: 'hook not found' });
    touch(req.params.id);

    let body = null;
    if (req.body?.length) {
        try { body = JSON.parse(req.body.toString()); }
        catch { body = req.body.toString().slice(0, 4096); }
    }

    const entry = {
        id:      nanoid(6),
        method:  req.method,
        path:    req.path,
        headers: req.headers,
        query:   req.query,
        body,
        ts:      Date.now(),
    };

    h.requests.unshift(entry);
    if (h.requests.length > 50) h.requests.pop();

    const payload = `data: ${JSON.stringify({ type: 'request', request: entry })}\n\n`;
    for (const client of h.clients) {
        try { client.write(payload); } catch {}
    }

    res.json({ ok: true });
});

router.get('/hook', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/hook/index.html'))
);

module.exports = router;
