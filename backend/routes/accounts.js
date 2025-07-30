const express = require('express');
const { query, run, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all accounts for user
router.get('/', async (req, res) => {
    try {
        const accounts = await query(
            'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json({ accounts });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get account by ID
router.get('/:id', async (req, res) => {
    try {
        const account = await get(
            'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({ account });
    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new account
router.post('/', async (req, res) => {
    try {
        const { name, type, balance = 0, interestRate = 0, compoundFrequency = 'monthly' } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        const validTypes = ['checking', 'savings', 'investment', 'credit', 'loan'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid account type' });
        }

        const validFrequencies = ['daily', 'monthly', 'quarterly', 'annually'];
        if (!validFrequencies.includes(compoundFrequency)) {
            return res.status(400).json({ error: 'Invalid compound frequency' });
        }

        const result = await run(
            'INSERT INTO accounts (user_id, name, type, balance, interest_rate, compound_frequency) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, name, type, balance, interestRate, compoundFrequency]
        );

        const account = await get('SELECT * FROM accounts WHERE id = ?', [result.lastID]);

        res.status(201).json({
            message: 'Account created successfully',
            account
        });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update account
router.put('/:id', async (req, res) => {
    try {
        const { name, type, balance, interestRate, compoundFrequency } = req.body;

        // Verify account belongs to user
        const existingAccount = await get(
            'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existingAccount) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Validate types if provided
        if (type) {
            const validTypes = ['checking', 'savings', 'investment', 'credit', 'loan'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: 'Invalid account type' });
            }
        }

        if (compoundFrequency) {
            const validFrequencies = ['daily', 'monthly', 'quarterly', 'annually'];
            if (!validFrequencies.includes(compoundFrequency)) {
                return res.status(400).json({ error: 'Invalid compound frequency' });
            }
        }

        await run(
            `UPDATE accounts SET 
                name = COALESCE(?, name),
                type = COALESCE(?, type),
                balance = COALESCE(?, balance),
                interest_rate = COALESCE(?, interest_rate),
                compound_frequency = COALESCE(?, compound_frequency)
            WHERE id = ? AND user_id = ?`,
            [name, type, balance, interestRate, compoundFrequency, req.params.id, req.user.id]
        );

        const updatedAccount = await get('SELECT * FROM accounts WHERE id = ?', [req.params.id]);

        res.json({
            message: 'Account updated successfully',
            account: updatedAccount
        });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete account
router.delete('/:id', async (req, res) => {
    try {
        // Verify account belongs to user
        const existingAccount = await get(
            'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existingAccount) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Check if account has transactions
        const transactionCount = await get(
            'SELECT COUNT(*) as count FROM transactions WHERE account_id = ?',
            [req.params.id]
        );

        if (transactionCount.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete account with existing transactions. Delete transactions first.' 
            });
        }

        await run('DELETE FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;