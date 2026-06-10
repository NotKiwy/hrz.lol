const net = require('net');
const dns = require('dns').promises;

const BLOCKED_HOSTS = [/^localhost$/i, /\.localhost$/i, /\.local$/i, /\.internal$/i];

function ipv4Blocked(ip) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 0 || b === 168)) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
}

function ipBlocked(ip) {
    if (net.isIPv4(ip)) return ipv4Blocked(ip);
    const low = ip.toLowerCase();
    const mapped = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return ipv4Blocked(mapped[1]);
    if (low === '::' || low === '::1') return true;
    if (/^f[cd]/.test(low)) return true;
    if (/^fe[89ab]/.test(low)) return true;
    if (low.startsWith('ff')) return true;
    return false;
}

async function resolvePinned(hostname) {
    if (BLOCKED_HOSTS.some(r => r.test(hostname))) return null;

    if (net.isIP(hostname)) {
        return ipBlocked(hostname)
            ? null
            : { address: hostname, family: net.isIP(hostname) };
    }

    let addrs;
    try { addrs = await dns.lookup(hostname, { all: true }); }
    catch { return null; }

    if (!addrs.length || addrs.some(a => ipBlocked(a.address))) return null;
    return addrs[0];
}

const pinnedLookup = pin => (hostname, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    if (opts && opts.all) return cb(null, [{ address: pin.address, family: pin.family }]);
    cb(null, pin.address, pin.family);
};

module.exports = { ipBlocked, resolvePinned, pinnedLookup };
