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

router.get('/settings', async (req, res) => {
    try {
        const username = req.user.username;
        const [settings] = await db.query('SELECT fullName, age, email, telegramBotToken, telegramChannelId FROM settings WHERE username = ?', [username]);
        
        if (settings.length > 0) {
            res.json(settings[0]);
        } else {
            res.status(404).json({ message: 'Settings not found.' });
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server error while fetching settings.' });
    }
});

router.post('/settings', async (req, res) => {
    try {
        const username = req.user.username;
        const { fullName, email, age, telegramBotToken, telegramChannelId } = req.body;

        await db.query(
            'UPDATE settings SET fullName = ?, email = ?, age = ?, telegramBotToken = ?, telegramChannelId = ? WHERE username = ?',
            [fullName, email, age || null, telegramBotToken, telegramChannelId, username]
        );

        res.status(200).json({ message: 'Settings saved successfully.' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Server error while saving settings.' });
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