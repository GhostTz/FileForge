const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/index.html'));
});

router.get('/models/:modelName', (req, res) => {
    const modelName = req.params.modelName;
    res.sendFile(path.join(__dirname, `../../views/models/${modelName}`));
});

module.exports = router;