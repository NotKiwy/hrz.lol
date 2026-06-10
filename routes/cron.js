const express = require('express');
const path    = require('path');
const router  = express.Router();
router.get('/cron', (_req, res) => res.sendFile(path.join(__dirname, '../public/cron/index.html')));
module.exports = router;
