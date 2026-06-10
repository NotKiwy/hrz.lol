module.exports = {
    apps: [{
        name: 'hrz',
        script: './server.js',
        cwd: '/var/www/hrz',
        instances: 1,
        exec_mode: 'fork',
        env: {
            NODE_ENV: 'production',
            PORT: 3001,
            MONGODB_URI: 'mongodb://127.0.0.1:27017/hrz',
        },
        max_memory_restart: '512M',
    }],
};
