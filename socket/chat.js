const { nanoid } = require('nanoid');
const { makeIpGuard, makeRateLimiter } = require('../lib/socket-limits');

const rooms = new Map();

const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63'];

function cleanup(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.users.size === 0) {
        if (room.timer) clearTimeout(room.timer);
        room.timer = setTimeout(() => {
            if (rooms.get(roomId)?.users.size === 0) rooms.delete(roomId);
        }, 30_000);
    }
}

module.exports = (io) => {
    const chatNS = io.of('/chat');
    const ipGuard = makeIpGuard();
    const msgLimit = makeRateLimiter(5);

    chatNS.use((socket, next) => {
        if (!ipGuard.accept(socket)) return next(new Error('too many connections'));
        next();
    });

    chatNS.on('connection', (socket) => {
        let currentRoom = null;

        socket.on('join', ({ roomId, name }) => {
            if (typeof roomId !== 'string' || !rooms.has(roomId)) {
                socket.emit('error', 'room not found');
                return;
            }
            if (currentRoom) return;

            const room = rooms.get(roomId);
            if (room.users.size >= 100) {
                socket.emit('error', 'room is full');
                return;
            }
            if (room.timer) { clearTimeout(room.timer); room.timer = null; }

            currentRoom = roomId;
            const color = COLORS[room.users.size % COLORS.length];
            const displayName = (name || 'anon').slice(0, 20).trim() || 'anon';
            room.users.set(socket.id, { name: displayName, color });

            socket.join(roomId);
            socket.emit('history', room.messages.slice(-50));
            socket.emit('self', { name: displayName, color });

            const joined = { type: 'system', text: `${displayName} joined`, ts: Date.now() };
            room.messages.push(joined);
            chatNS.to(roomId).emit('message', joined);
            chatNS.to(roomId).emit('users', [...room.users.values()]);
        });

        socket.on('message', (text) => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            const user = room.users.get(socket.id);
            if (!user) return;
            if (!msgLimit(socket)) return;

            const msg = {
                type: 'user',
                name: user.name,
                color: user.color,
                text: String(text).slice(0, 1000),
                ts: Date.now(),
            };
            room.messages.push(msg);
            if (room.messages.length > 200) room.messages.shift();
            chatNS.to(currentRoom).emit('message', msg);
        });

        socket.on('disconnect', () => {
            if (!currentRoom) return;
            const room = rooms.get(currentRoom);
            if (!room) return;
            const user = room.users.get(socket.id);
            room.users.delete(socket.id);

            if (user) {
                const left = { type: 'system', text: `${user.name} left`, ts: Date.now() };
                room.messages.push(left);
                chatNS.to(currentRoom).emit('message', left);
                chatNS.to(currentRoom).emit('users', [...room.users.values()]);
            }
            cleanup(currentRoom);
        });
    });

    io._chatRooms = rooms;
    io._chatNS = chatNS;
};
