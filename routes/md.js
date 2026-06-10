const express = require('express');
const path    = require('path');
const router  = express.Router();
router.get('/md', (_req, res) => res.sendFile(path.join(__dirname, '../public/md/index.html')));
module.exports = router;
