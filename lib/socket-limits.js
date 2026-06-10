const MAX_CONN_PER_IP = 20;

function ipOf(socket) {
    const fwd = socket.handshake.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return socket.handshake.address || 'unknown';
}

function makeIpGuard() {
    const counts = new Map();

    return {
        accept(socket) {
            const ip = ipOf(socket);
            const n = counts.get(ip) || 0;
            if (n >= MAX_CONN_PER_IP) return false;
            counts.set(ip, n + 1);
            socket.once('disconnect', () => {
                const cur = counts.get(ip) || 0;
                if (cur <= 1) counts.delete(ip);
                else counts.set(ip, cur - 1);
            });
            return true;
        },
    };
}

function makeRateLimiter(maxPerSecond) {
    const state = new WeakMap();
    return (socket) => {
        const now = Date.now();
        const s = state.get(socket) || { count: 0, windowStart: now };
        if (now - s.windowStart > 1000) {
            s.count = 0;
            s.windowStart = now;
        }
        s.count++;
        state.set(socket, s);
        return s.count <= maxPerSecond;
    };
}

module.exports = { makeIpGuard, makeRateLimiter, ipOf };
