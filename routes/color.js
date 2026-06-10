const express = require('express');
const path    = require('path');
const router  = express.Router();
router.get('/color', (_req, res) => res.sendFile(path.join(__dirname, '../public/color/index.html')));
module.exports = router;
