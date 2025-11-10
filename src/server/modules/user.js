const express = require('express');
const router = express.Router();

router.get('/info', (req, res) => {
    if (req.user && req.user.username) {
        res.json({ username: req.user.username });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

module.exports = router;