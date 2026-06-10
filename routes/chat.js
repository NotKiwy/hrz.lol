const express  = require('express');
const { nanoid } = require('nanoid');
const path      = require('path');

const router = express.Router();

router.post('/api/chat', (req, res) => {
    const io    = req.app.get('io');
    const rooms = io._chatRooms;
    if (!rooms) return res.status(500).json({ error: 'not ready' });
    const id = nanoid(6);
    rooms.set(id, { users: new Map(), messages: [], timer: null });
    res.json({ id });
});

router.get('/chat/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/chat/room.html'));
});

router.get('/chat', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/chat/index.html'))
);

module.exports = router;
