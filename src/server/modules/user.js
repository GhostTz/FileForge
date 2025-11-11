const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/info', (req, res) => {
    if (req.user && req.user.username) {
        res.json({ username: req.user.username });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

router.delete('/delete', async (req, res) => {
    try {
        const username = req.user.username;
        if (!username) {
            return res.status(401).json({ message: 'Authentication error.' });
        }

        await db.query('DELETE FROM users WHERE username = ?', [username]);

        res.clearCookie('token');
        res.status(200).json({ message: 'Account successfully deleted.' });

    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Server error during account deletion.' });
    }
});

module.exports = router;