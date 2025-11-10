const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../../server/middleware/authMiddleware');

router.use(authMiddleware);

router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

router.get('/modules/:moduleName', (req, res) => {
    const moduleName = req.params.moduleName;
    res.sendFile(path.join(__dirname, `../views/modules/${moduleName}`));
});

const pages = ['start', 'download', 'convert', 'sharing', 'settings'];
pages.forEach(page => {
    const filePath = path.join(__dirname, `../views/${page}.html`);
    if (fs.existsSync(filePath)) {
        router.get(`/page/${page}.html`, (req, res) => {
            res.sendFile(filePath);
        });
    }
});

module.exports = router;