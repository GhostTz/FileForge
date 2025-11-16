const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const https = require('https');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

router.post('/upload', upload.single('file'), async (req, res) => {
    const owner = req.user.username;
    const { parentId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No file uploaded.' });

    try {
        const [settings] = await db.query('SELECT telegramBotToken, telegramChannelId FROM settings WHERE username = ?', [owner]);
        if (settings.length === 0 || !settings[0].telegramBotToken || !settings[0].telegramChannelId) {
            return res.status(400).json({ message: 'Telegram settings are not configured.' });
        }
        const { telegramBotToken, telegramChannelId } = settings[0];

        const bot = new TelegramBot(telegramBotToken);
        const sentMessage = await bot.sendDocument(telegramChannelId, file.buffer, {}, {
            filename: file.originalname,
            contentType: file.mimetype
        });
        
        if (!sentMessage || !sentMessage.document) {
            throw new Error('Failed to send file to Telegram or document is missing.');
        }

        // KORREKTUR: file_id wird jetzt gespeichert
        const fileMeta = {
            message_id: sentMessage.message_id,
            chat_id: sentMessage.chat.id,
            file_id: sentMessage.document.file_id, // WICHTIG!
            size: formatBytes(file.size),
            fileType: path.extname(file.originalname).substring(1) || 'file'
        };

        await db.query(
            'INSERT INTO cloud_items (owner_username, parent_id, name, type, file_meta) VALUES (?, ?, ?, ?, ?)',
            [owner, parentId === 'null' ? null : parentId, file.originalname, 'file', JSON.stringify(fileMeta)]
        );

        res.status(201).json({ message: 'File uploaded successfully.' });

    } catch (error) {
        console.error('Upload Error:', error.response ? error.response.body : error.message);
        res.status(500).json({ message: 'Failed to upload file.' });
    }
});

router.get('/download/:id', async (req, res) => {
    const owner = req.user.username;
    const itemId = req.params.id;

    try {
        const [settings] = await db.query('SELECT telegramBotToken FROM settings WHERE username = ?', [owner]);
        if (settings.length === 0 || !settings[0].telegramBotToken) {
            return res.status(400).json({ message: 'Telegram Bot Token not configured.' });
        }
        const token = settings[0].telegramBotToken;

        const [items] = await db.query('SELECT name, file_meta FROM cloud_items WHERE id = ? AND owner_username = ? AND type = "file"', [itemId, owner]);
        if (items.length === 0) {
            return res.status(404).json({ message: 'File not found.' });
        }

        const item = items[0];
        const meta = JSON.parse(item.file_meta);
        
        // KORREKTUR: Stabile Methode zum herunterladen
        const bot = new TelegramBot(token);
        const fileInfo = await bot.getFile(meta.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;

        const tempFilePath = path.join(__dirname, '..', '..', '..', 'temp', item.name);
        const writer = fs.createWriteStream(tempFilePath);
        
        https.get(fileUrl, (response) => {
            response.pipe(writer);
            writer.on('finish', () => {
                res.json({ tempPath: `/temp/${item.name}` });
            });
            writer.on('error', (err) => {
                console.error('File write stream error:', err);
                res.status(500).json({ message: 'Failed to save temporary file.' });
            });
        }).on('error', (err) => {
            console.error('HTTPS request error for file download:', err);
            res.status(500).json({ message: 'Failed to download file from source.' });
        });

    } catch (error) {
        console.error('Download preparation error:', error.response ? error.response.body : error.message);
        res.status(500).json({ message: 'Failed to prepare file for preview.' });
    }
});


// Other routes remain unchanged...
router.get('/items', async (req, res) => {
    try {
        const owner = req.user.username;
        let parentId = req.query.parentId || null;
        if (parentId === 'null' || parentId === 'root') parentId = null;
        const query = parentId
            ? 'SELECT * FROM cloud_items WHERE owner_username = ? AND parent_id = ? AND is_trashed = false'
            : 'SELECT * FROM cloud_items WHERE owner_username = ? AND parent_id IS NULL AND is_trashed = false';
        const params = parentId ? [owner, parentId] : [owner];
        const [items] = await db.query(query, params);
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items.' });
    }
});

router.get('/path/:id', async (req, res) => {
    try {
        const owner = req.user.username;
        const itemId = req.params.id;
        const path = [];
        let currentId = itemId;
        while(currentId) {
            const [rows] = await db.query('SELECT id, name, parent_id FROM cloud_items WHERE id = ? AND owner_username = ?', [currentId, owner]);
            if(rows.length === 0) break;
            const item = rows[0];
            path.unshift({ id: item.id, name: item.name });
            currentId = item.parent_id;
        }
        path.unshift({ id: null, name: 'Home' });
        res.json(path);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching path.' });
    }
});

router.get('/favorites', async (req, res) => {
    try {
        const owner = req.user.username;
        const [items] = await db.query('SELECT * FROM cloud_items WHERE owner_username = ? AND is_favorite = true AND is_trashed = false', [owner]);
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching favorites.' });
    }
});

router.get('/trash', async (req, res) => {
    try {
        const owner = req.user.username;
        const [items] = await db.query('SELECT * FROM cloud_items WHERE owner_username = ? AND is_trashed = true', [owner]);
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trash.' });
    }
});

router.post('/folder', async (req, res) => {
    try {
        const owner = req.user.username;
        const { name, parentId } = req.body;
        if (!name) return res.status(400).json({ message: 'Folder name is required.' });
        const [result] = await db.query(
            'INSERT INTO cloud_items (owner_username, parent_id, name, type) VALUES (?, ?, ?, ?)',
            [owner, parentId === 'root' || parentId === null ? null : parentId, name, 'folder']
        );
        res.status(201).json({ id: result.insertId, name, parent_id: parentId, type: 'folder' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating folder.' });
    }
});

router.patch('/item/:id/favorite', async (req, res) => {
    try {
        const owner = req.user.username;
        const itemId = req.params.id;
        const { isFavorite } = req.body;
        await db.query('UPDATE cloud_items SET is_favorite = ? WHERE id = ? AND owner_username = ?', [isFavorite, itemId, owner]);
        res.status(200).json({ message: 'Favorite status updated.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating favorite status.' });
    }
});

router.delete('/item/:id', async (req, res) => {
    try {
        const owner = req.user.username;
        const itemId = req.params.id;
        await db.query('UPDATE cloud_items SET is_trashed = true, is_favorite = false WHERE id = ? AND owner_username = ?', [itemId, owner]);
        res.status(200).json({ message: 'Item moved to trash.' });
    } catch(error) {
        res.status(500).json({ message: 'Error deleting item.' });
    }
});

module.exports = router;