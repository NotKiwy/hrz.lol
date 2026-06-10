const express = require('express');
const path    = require('path');

const router = express.Router();

router.get('/fake', (_req, res) =>
    res.sendFile(path.join(__dirname, '../public/fake/index.html'))
);

module.exports = router;
