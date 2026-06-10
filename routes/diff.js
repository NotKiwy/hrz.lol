const express = require('express');
const path    = require('path');
const router  = express.Router();
router.get('/diff', (_req, res) => res.sendFile(path.join(__dirname, '../public/diff/index.html')));
module.exports = router;
