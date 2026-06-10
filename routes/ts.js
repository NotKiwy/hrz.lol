const express = require('express');
const path    = require('path');
const router  = express.Router();
router.get('/ts', (_req, res) => res.sendFile(path.join(__dirname, '../public/ts/index.html')));
module.exports = router;
