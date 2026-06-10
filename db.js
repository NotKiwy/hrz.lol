const { MongoClient } = require('mongodb');

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrz';
const client = new MongoClient(URI);

let _db = null;

async function connect() {
    await client.connect();
    _db = client.db('hrz');

    const pastes = _db.collection('pastes');
    const links  = _db.collection('links');

    await pastes.createIndex({ id: 1 }, { unique: true });
    await pastes.createIndex({ expires_at: 1 }, { sparse: true });
    await links.createIndex({ code: 1 }, { unique: true });

    const purge = () => {
        const now = Math.floor(Date.now() / 1000);
        pastes.deleteMany({ expires_at: { $ne: null, $lte: now } }).catch(() => {});
    };
    purge();
    setInterval(purge, 3_600_000);

    console.log('MongoDB connected');
    return _db;
}

function db() {
    if (!_db) throw new Error('DB not connected yet');
    return _db;
}

module.exports = { connect, db };
