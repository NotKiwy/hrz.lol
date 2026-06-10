const express = require('express');
const path    = require('path');
const router  = express.Router();
router.get('/support', (_req, res) => res.sendFile(path.join(__dirname, '../public/support/index.html')));
router.get('/support/crypto', (_req, res) => res.sendFile(path.join(__dirname, '../public/support/crypto/index.html')));
module.exports = router;
