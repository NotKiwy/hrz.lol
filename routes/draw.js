const express    = require('express');
const { nanoid } = require('nanoid');
const path       = require('path');

const router = express.Router();

router.post('/api/draw', (req, res) => {
    const io    = req.app.get('io');
    const rooms = io._drawRooms;
    if (!rooms) return res.status(500).json({ error: 'not ready' });
    const id = nanoid(6);
    rooms.set(id, { strokes: [], users: new Map(), timer: null });
    res.json({ id });
});

router.get('/draw/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/draw/room.html'));
});

router.get('/draw', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/draw/index.html'))
);

module.exports = router;
