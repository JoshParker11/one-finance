const express = require('express');
const { query, run, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all categories for user
router.get('/', async (req, res) => {
    try {
        const categories = await query(
            'SELECT * FROM categories WHERE user_id = ? ORDER BY is_default DESC, name ASC',
            [req.user.id]
        );

        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new category
router.post('/', async (req, res) => {
    try {
        const { name, color = '#4C9A2A' } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        // Check if category already exists for user
        const existingCategory = await get(
            'SELECT id FROM categories WHERE user_id = ? AND name = ?',
            [req.user.id, name]
        );

        if (existingCategory) {
            return res.status(409).json({ error: 'Category already exists' });
        }

        const result = await run(
            'INSERT INTO categories (user_id, name, color, is_default) VALUES (?, ?, ?, ?)',
            [req.user.id, name, color, false]
        );

        const category = await get('SELECT * FROM categories WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        const { name, color } = req.body;

        // Verify category belongs to user
        const existingCategory = await get(
            'SELECT id, is_default FROM categories WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existingCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check if new name conflicts with existing category
        if (name) {
            const nameConflict = await get(
                'SELECT id FROM categories WHERE user_id = ? AND name = ? AND id != ?',
                [req.user.id, name, req.params.id]
            );

            if (nameConflict) {
                return res.status(409).json({ error: 'Category name already exists' });
            }
        }

        await run(
            'UPDATE categories SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ? AND user_id = ?',
            [name, color, req.params.id, req.user.id]
        );

        const updatedCategory = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);

        res.json({
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        // Verify category belongs to user
        const existingCategory = await get(
            'SELECT id, is_default FROM categories WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existingCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (existingCategory.is_default) {
            return res.status(400).json({ error: 'Cannot delete default categories' });
        }

        // Check if category is used by transactions
        const transactionCount = await get(
            'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
            [req.params.id]
        );

        if (transactionCount.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete category that is used by transactions. Change transaction categories first.' 
            });
        }

        await run('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;