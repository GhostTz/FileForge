const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET items by parent_id (or root if not provided)
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

// GET full path for breadcrumbs
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

// GET favorited items
router.get('/favorites', async (req, res) => {
    try {
        const owner = req.user.username;
        const [items] = await db.query('SELECT * FROM cloud_items WHERE owner_username = ? AND is_favorite = true AND is_trashed = false', [owner]);
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching favorites.' });
    }
});

// GET trashed items
router.get('/trash', async (req, res) => {
    try {
        const owner = req.user.username;
        const [items] = await db.query('SELECT * FROM cloud_items WHERE owner_username = ? AND is_trashed = true', [owner]);
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trash.' });
    }
});

// POST create a new folder
router.post('/folder', async (req, res) => {
    try {
        const owner = req.user.username;
        const { name, parentId } = req.body;
        if (!name) return res.status(400).json({ message: 'Folder name is required.' });

        const [result] = await db.query(
            'INSERT INTO cloud_items (owner_username, parent_id, name, type) VALUES (?, ?, ?, ?)',
            [owner, parentId === 'root' ? null : parentId, name, 'folder']
        );
        
        res.status(201).json({ id: result.insertId, name, parent_id: parentId, type: 'folder' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating folder.' });
    }
});

// PATCH toggle favorite status
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

// DELETE (soft delete) an item
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