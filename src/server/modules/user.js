const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/info', async (req, res) => {
    if (req.user && req.user.username) {
        try {
            // Fetch theme setting along with basic info
            const [settings] = await db.query('SELECT colormode FROM settings WHERE username = ?', [req.user.username]);
            const colormode = settings.length > 0 ? settings[0].colormode : 'dark';
            
            res.json({ 
                username: req.user.username,
                colormode: colormode
            });
        } catch (error) {
            console.error('Error fetching user info details:', error);
            // Fallback if DB query fails
            res.json({ username: req.user.username, colormode: 'dark' });
        }
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const username = req.user.username;
        const [settings] = await db.query('SELECT fullName, age, email, telegramBotToken, telegramChannelId, colormode FROM settings WHERE username = ?', [username]);

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
        const { fullName, email, age, telegramBotToken, telegramChannelId, colormode } = req.body;

        await db.query(
            'UPDATE settings SET fullName = ?, email = ?, age = ?, telegramBotToken = ?, telegramChannelId = ?, colormode = ? WHERE username = ?',
            [fullName || null, email || null, age || null, telegramBotToken || null, telegramChannelId || null, colormode || 'dark', username]
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