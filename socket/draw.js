const { nanoid } = require('nanoid');
const { makeIpGuard, makeRateLimiter } = require('../lib/socket-limits');

const rooms = new Map();
const MAX_STROKE_POINTS = 5000;
const MAX_USERS_PER_ROOM = 50;

const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63'];

function cleanup(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.users.size > 0) return;
    room.timer = setTimeout(() => {
        if (rooms.get(roomId)?.users.size === 0) rooms.delete(roomId);
    }, 30_000);
}

function sanitizeStroke(stroke) {
    if (!stroke || typeof stroke !== 'object') return null;
    if (!Array.isArray(stroke.points)) return null;
    const points = stroke.points.slice(0, MAX_STROKE_POINTS).filter(
        p => p && Number.isFinite(p.x) && Number.isFinite(p.y)
    );
    if (!points.length) return null;
    return {
        points,
        color: typeof stroke.color === 'string' ? stroke.color.slice(0, 16) : '#111',
        size: Number.isFinite(stroke.size) ? Math.min(Math.max(stroke.size, 1), 100) : 3,
        eraser: !!stroke.eraser,
    };
}

function sanitizeSegment(d) {
    if (!d || typeof d !== 'object') return null;
    const out = {};
    for (const k of ['x', 'y', 'x0', 'y0', 'x1', 'y1', 'size']) {
        if (k in d) {
            if (!Number.isFinite(d[k])) return null;
            out[k] = d[k];
        }
    }
    out.color = typeof d.color === 'string' ? d.color.slice(0, 16) : '#111';
    out.eraser = !!d.eraser;
    return out;
}

module.exports = (io) => {
    const drawNS = io.of('/draw');
    const ipGuard = makeIpGuard();
    const moveLimit = makeRateLimiter(120);
    const startLimit = makeRateLimiter(30);

    drawNS.use((socket, next) => {
        if (!ipGuard.accept(socket)) return next(new Error('too many connections'));
        next();
    });

    drawNS.on('connection', (socket) => {
        let currentRoom = null;

        socket.on('join', ({ roomId, name }) => {
            if (typeof roomId !== 'string' || !rooms.has(roomId)) {
                socket.emit('error', 'room not found');
                return;
            }
            if (currentRoom) return;
            const room = rooms.get(roomId);
            if (room.users.size >= MAX_USERS_PER_ROOM) {
                socket.emit('error', 'room is full');
                return;
            }
            if (room.timer) { clearTimeout(room.timer); room.timer = null; }

            currentRoom = roomId;
            const color = COLORS[room.users.size % COLORS.length];
            const displayName = (name || 'anon').slice(0, 20).trim() || 'anon';
            room.users.set(socket.id, { name: displayName, color });

            socket.join(roomId);
            socket.emit('canvas_state', room.strokes);
            socket.emit('self', { name: displayName, color });
            drawNS.to(roomId).emit('users', room.users.size);
        });

        socket.on('stroke_start', (data) => {
            if (!currentRoom) return;
            if (!startLimit(socket)) return;
            const clean = sanitizeSegment(data);
            if (!clean) return;
            socket.to(currentRoom).emit('stroke_start', clean);
        });

        socket.on('stroke_move', (data) => {
            if (!currentRoom) return;
            if (!moveLimit(socket)) return;
            const clean = sanitizeSegment(data);
            if (!clean) return;
            socket.to(currentRoom).emit('stroke_move', clean);
        });

        socket.on('stroke_end', (stroke) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            const clean = sanitizeStroke(stroke);
            if (!clean) return;
            room.strokes.push(clean);
            if (room.strokes.length > 2000) room.strokes.shift();
            socket.to(currentRoom).emit('stroke_end', clean);
        });

        socket.on('clear', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            room.strokes = [];
            drawNS.to(currentRoom).emit('clear');
        });

        socket.on('disconnect', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            room.users.delete(socket.id);
            drawNS.to(currentRoom).emit('users', room.users.size);
            cleanup(currentRoom);
        });
    });

    io._drawRooms = rooms;
};
