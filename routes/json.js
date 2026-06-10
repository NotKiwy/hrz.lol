const express = require('express');
const path    = require('path');
const router  = express.Router();

router.get('/json', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/json/index.html'))
);

module.exports = router;
