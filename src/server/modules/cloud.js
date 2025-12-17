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

// --- MAINTENANCE / DANGER ZONE ENDPOINTS ---

// Clear Database Only
router.delete('/maintenance/db', async (req, res) => {
    try {
        const owner = req.user.username;
        await db.query('DELETE FROM cloud_items WHERE owner_username = ?', [owner]);
        res.status(200).json({ message: 'Database cleared successfully.' });
    } catch (error) {
        console.error('Database Clear Error:', error);
        res.status(500).json({ message: 'Failed to clear database.' });
    }
});

// --- STANDARD ENDPOINTS ---

router.get('/stats', async (req, res) => {
    try {
        const owner = req.user.username;
        
        // 1. Count Cloud Items
        const [cloudRows] = await db.query(
            'SELECT COUNT(*) as count FROM cloud_items WHERE owner_username = ? AND type = "file" AND is_trashed = false',
            [owner]
        );

        // 2. Count Downloaded Media (nur erfolgreiche)
        const [dlRows] = await db.query(
            'SELECT COUNT(*) as count FROM downloaded_media WHERE username = ? AND success = true',
            [owner]
        );

        res.json({ 
            fileCount: cloudRows[0].count,
            downloadCount: dlRows[0].count 
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ message: 'Failed to fetch stats.' });
    }
});

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

        const fileSlot = sentMessage.document || sentMessage.audio || sentMessage.video || sentMessage.voice;

        if (!sentMessage || !fileSlot) {
            console.error('Telegram Unexpected Response:', JSON.stringify(sentMessage, null, 2));
            throw new Error('Failed to send file to Telegram: Response missing file information.');
        }

        const fileMeta = {
            message_id: sentMessage.message_id,
            chat_id: sentMessage.chat.id,
            file_id: fileSlot.file_id,
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
        const statusCode = error.response && error.response.statusCode ? error.response.statusCode : 500;
        res.status(statusCode).json({
            message: 'Failed to upload file.',
            error: error.message,
            details: error.response ? error.response.body : undefined
        });
    }
});

router.get('/download/:id', async (req, res) => {
    const owner = req.user.username;
    const itemId = req.params.id;
    const type = req.query.type || 'preview'; // 'preview' or 'download'

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
        
        const bot = new TelegramBot(token);
        const fileInfo = await bot.getFile(meta.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
        const currentFileSize = fileInfo.file_size; 

        if (type === 'preview') {
            const allowedExtensions = [
                'mp4', 'mp3', 'mov', 'txt', 'png', 'jpg', 'jpeg',
                'ico', 'pdf', 'gif', 'webp', 'svg', 'webm', 'wav'
            ];
            const fileExt = path.extname(item.name).substring(1).toLowerCase();

            if (!allowedExtensions.includes(fileExt)) {
                return res.status(403).json({ message: 'Preview not allowed for this file type.' });
            }

            const MAX_SIZE = 30 * 1024 * 1024;
            if (currentFileSize > MAX_SIZE) {
                return res.status(403).json({ message: 'File too large for preview (Max 30MB).' });
            }

            const tempFilePath = path.join(__dirname, '..', '..', '..', 'temp', item.name);
            const writer = fs.createWriteStream(tempFilePath);

            https.get(fileUrl, (response) => {
                response.pipe(writer);
                writer.on('finish', () => {
                    res.json({ tempPath: `temp/${item.name}` });
                });
                writer.on('error', (err) => {
                    console.error('File write stream error:', err);
                    res.status(500).json({ message: 'Failed to save temporary file.' });
                });
            }).on('error', (err) => {
                console.error('HTTPS request error for file download:', err);
                res.status(500).json({ message: 'Failed to download file from source.' });
            });

        } else if (type === 'download') {
            res.setHeader('Content-Disposition', `attachment; filename="${item.name}"`);
            res.setHeader('Content-Type', 'application/octet-stream');

            https.get(fileUrl, (response) => {
                response.pipe(res);
            }).on('error', (err) => {
                console.error('Streaming download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Failed to stream file.' });
                }
            });
        } else {
            res.status(400).json({ message: 'Invalid download type.' });
        }

    } catch (error) {
        console.error('Download preparation error:', error.response ? error.response.body : error.message);
        res.status(500).json({ message: 'Failed to prepare file.' });
    }
});

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
        while (currentId) {
            const [rows] = await db.query('SELECT id, name, parent_id FROM cloud_items WHERE id = ? AND owner_username = ?', [currentId, owner]);
            if (rows.length === 0) break;
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

router.get('/folders', async (req, res) => {
    try {
        const owner = req.user.username;
        const [folders] = await db.query(
            "SELECT id, name, parent_id FROM cloud_items WHERE owner_username = ? AND type = 'folder' AND is_trashed = false ORDER BY name ASC",
            [owner]
        );

        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_id === parentId)
                .map(item => ({
                    ...item,
                    children: buildTree(items, item.id)
                }));
        };

        const folderTree = buildTree(folders);
        res.json(folderTree);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching folder structure.' });
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

router.post('/items/trash', async (req, res) => {
    try {
        const owner = req.user.username;
        const { itemIds } = req.body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ message: 'No item IDs provided.' });
        }

        const [result] = await db.query(
            'UPDATE cloud_items SET is_trashed = true, is_favorite = false WHERE id IN (?) AND owner_username = ?',
            [itemIds, owner]
        );

        res.status(200).json({ message: `${result.affectedRows} items moved to trash.` });
    } catch (error) {
        res.status(500).json({ message: 'Error moving items to trash.' });
    }
});

router.patch('/items/move', async (req, res) => {
    try {
        const owner = req.user.username;
        let { itemIds, destinationId } = req.body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ message: 'No item IDs provided.' });
        }
        if (destinationId === 'root') {
            destinationId = null;
        }

        const [result] = await db.query(
            'UPDATE cloud_items SET parent_id = ? WHERE id IN (?) AND owner_username = ?',
            [destinationId, itemIds, owner]
        );

        res.status(200).json({ message: `${result.affectedRows} items moved.` });
    } catch (error) {
        res.status(500).json({ message: 'Error moving items.' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const owner = req.user.username;
        const searchTerm = req.query.term;

        if (!searchTerm) {
            return res.status(400).json({ message: 'Search term is required.' });
        }

        const [items] = await db.query(
            'SELECT * FROM cloud_items WHERE owner_username = ? AND name LIKE ? AND is_trashed = false',
            [owner, `%${searchTerm}%`]
        );

        res.json(items);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error searching items.' });
    }
});

router.patch('/trash/restore', async (req, res) => {
    try {
        const owner = req.user.username;
        const { itemIds } = req.body;
        if (!itemIds || itemIds.length === 0) {
            return res.status(400).json({ message: 'No item IDs provided.' });
        }
        await db.query('UPDATE cloud_items SET is_trashed = false WHERE id IN (?) AND owner_username = ?', [itemIds, owner]);
        res.status(200).json({ message: 'Items restored.' });
    } catch (error) {
        res.status(500).json({ message: 'Error restoring items.' });
    }
});

router.delete('/trash/item/:id', async (req, res) => {
    const owner = req.user.username;
    const itemId = req.params.id;

    async function collectAllItems(parentId) {
        const allItems = [];
        const [children] = await db.query(
            'SELECT * FROM cloud_items WHERE parent_id = ? AND owner_username = ?',
            [parentId, owner]
        );

        for (const child of children) {
            allItems.push(child);
            if (child.type === 'folder') {
                const nestedItems = await collectAllItems(child.id);
                allItems.push(...nestedItems);
            }
        }
        return allItems;
    }

    try {
        const [items] = await db.query('SELECT * FROM cloud_items WHERE id = ? AND owner_username = ?', [itemId, owner]);
        if (items.length === 0) {
            return res.status(404).json({ message: 'Item not found.' });
        }
        const item = items[0];

        let itemsToDelete = [item];

        if (item.type === 'folder') {
            const nestedItems = await collectAllItems(item.id);
            itemsToDelete.push(...nestedItems);
        }

        const idsToDelete = itemsToDelete.map(i => i.id);
        await db.query('DELETE FROM cloud_items WHERE id IN (?)', [idsToDelete]);

        res.status(200).json({
            message: 'Item deleted from database.',
            deletedCount: itemsToDelete.length
        });

    } catch (error) {
        console.error(`DB Deletion Error for item ${itemId}:`, error);
        res.status(500).json({ message: 'Server error during deletion.' });
    }
});

router.post('/download/zip', async (req, res) => {
    const owner = req.user.username;
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: 'No items selected.' });
    }

    try {
        const [settings] = await db.query('SELECT telegramBotToken FROM settings WHERE username = ?', [owner]);
        if (settings.length === 0 || !settings[0].telegramBotToken) {
            return res.status(400).json({ message: 'Telegram Bot Token not configured.' });
        }
        const token = settings[0].telegramBotToken;
        const bot = new TelegramBot(token);

        async function collectItemsRecursively(ids, currentPath = '') {
            const items = [];
            if (ids.length === 0) return items;

            const [rows] = await db.query('SELECT * FROM cloud_items WHERE id IN (?) AND owner_username = ?', [ids, owner]);

            for (const item of rows) {
                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;

                if (item.type === 'folder') {
                    items.push({ ...item, zipPath: itemPath, isDir: true });

                    const [children] = await db.query('SELECT id FROM cloud_items WHERE parent_id = ? AND owner_username = ?', [item.id, owner]);
                    const childIds = children.map(c => c.id);

                    if (childIds.length > 0) {
                        const childItems = await collectItemsRecursively(childIds, itemPath);
                        items.push(...childItems);
                    }
                } else {
                    items.push({ ...item, zipPath: itemPath, isDir: false });
                }
            }
            return items;
        }

        const itemsToZip = await collectItemsRecursively(itemIds);

        if (itemsToZip.length === 0) {
            return res.status(404).json({ message: 'No files found.' });
        }

        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });

        res.attachment('download.zip');
        archive.pipe(res);

        for (const item of itemsToZip) {
            try {
                if (item.isDir) {
                    archive.append(null, { name: item.zipPath + '/' });
                } else {
                    const meta = JSON.parse(item.file_meta);
                    const fileInfo = await bot.getFile(meta.file_id);
                    const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;

                    await new Promise((resolve, reject) => {
                        https.get(fileUrl, (response) => {
                            archive.append(response, { name: item.zipPath });
                            resolve();
                        }).on('error', (err) => {
                            console.error(`Error downloading file ${item.name} for zip:`, err);
                            resolve();
                        });
                    });
                }
            } catch (err) {
                console.error(`Error processing item ${item.name} for zip:`, err);
            }
        }

        await archive.finalize();

    } catch (error) {
        console.error('Zip creation error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to create zip archive.' });
        }
    }
});

module.exports = router;