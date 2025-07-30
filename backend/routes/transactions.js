const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { query, run, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// All routes require authentication
router.use(authenticateToken);

// Get transactions with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const {
            accountId,
            categoryId,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            sortBy = 'date',
            sortOrder = 'DESC'
        } = req.query;

        let whereClause = 'WHERE t.user_id = ?';
        const params = [req.user.id];

        if (accountId) {
            whereClause += ' AND t.account_id = ?';
            params.push(accountId);
        }

        if (categoryId) {
            whereClause += ' AND t.category_id = ?';
            params.push(categoryId);
        }

        if (startDate) {
            whereClause += ' AND t.date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND t.date <= ?';
            params.push(endDate);
        }

        const validSortColumns = ['date', 'amount', 'description'];
        const validSortOrders = ['ASC', 'DESC'];
        const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'date';
        const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        const offset = (page - 1) * limit;

        const transactionsQuery = `
            SELECT 
                t.*,
                a.name as account_name,
                c.name as category_name,
                c.color as category_color
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            ${whereClause}
            ORDER BY t.${safeSortBy} ${safeSortOrder}
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM transactions t
            ${whereClause}
        `;

        const [transactions, countResult] = await Promise.all([
            query(transactionsQuery, [...params, limit, offset]),
            get(countQuery, params)
        ]);

        const totalPages = Math.ceil(countResult.total / limit);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single transaction
router.get('/:id', async (req, res) => {
    try {
        const transaction = await get(`
            SELECT 
                t.*,
                a.name as account_name,
                c.name as category_name,
                c.color as category_color
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = ? AND t.user_id = ?
        `, [req.params.id, req.user.id]);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ transaction });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new transaction
router.post('/', async (req, res) => {
    try {
        const { accountId, categoryId, date, description, amount, memo } = req.body;

        if (!accountId || !date || !description || amount === undefined) {
            return res.status(400).json({ error: 'Account ID, date, description, and amount are required' });
        }

        // Verify account belongs to user
        const account = await get(
            'SELECT id, balance FROM accounts WHERE id = ? AND user_id = ?',
            [accountId, req.user.id]
        );

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Calculate new balance
        const newBalance = parseFloat(account.balance) + parseFloat(amount);

        // Create transaction
        const result = await run(`
            INSERT INTO transactions (user_id, account_id, category_id, date, description, amount, balance_after, memo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, accountId, categoryId || null, date, description, amount, newBalance, memo || null]);

        // Update account balance
        await run('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, accountId]);

        const transaction = await get(`
            SELECT 
                t.*,
                a.name as account_name,
                c.name as category_name,
                c.color as category_color
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = ?
        `, [result.lastID]);

        res.status(201).json({
            message: 'Transaction created successfully',
            transaction
        });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update transaction
router.put('/:id', async (req, res) => {
    try {
        const { categoryId, memo, description } = req.body;

        // Verify transaction belongs to user
        const existingTransaction = await get(
            'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existingTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        await run(`
            UPDATE transactions SET 
                category_id = COALESCE(?, category_id),
                memo = COALESCE(?, memo),
                description = COALESCE(?, description)
            WHERE id = ? AND user_id = ?
        `, [categoryId, memo, description, req.params.id, req.user.id]);

        const updatedTransaction = await get(`
            SELECT 
                t.*,
                a.name as account_name,
                c.name as category_name,
                c.color as category_color
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = ?
        `, [req.params.id]);

        res.json({
            message: 'Transaction updated successfully',
            transaction: updatedTransaction
        });
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await get(
            'SELECT account_id, amount FROM transactions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Get current account balance and subtract the transaction amount
        const account = await get('SELECT balance FROM accounts WHERE id = ?', [transaction.account_id]);
        const newBalance = parseFloat(account.balance) - parseFloat(transaction.amount);

        // Delete transaction and update account balance
        await run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        await run('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, transaction.account_id]);

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import transactions from CSV
router.post('/import', upload.single('csv'), async (req, res) => {
    try {
        const { accountId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'CSV file is required' });
        }

        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required' });
        }

        // Verify account belongs to user
        const account = await get(
            'SELECT id, balance FROM accounts WHERE id = ? AND user_id = ?',
            [accountId, req.user.id]
        );

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const results = [];
        const errors = [];
        let rowNumber = 0;

        return new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => {
                    rowNumber++;
                    
                    // Parse and validate required fields
                    const date = parseDate(data.date || data.Date);
                    const description = sanitizeString(data.description || data.Description || data.desc);
                    const amount = parseFloat(data.amount || data.Amount);

                    if (!date) {
                        errors.push({ row: rowNumber, error: 'Invalid or missing date' });
                        return;
                    }

                    if (!description) {
                        errors.push({ row: rowNumber, error: 'Missing description' });
                        return;
                    }

                    if (isNaN(amount)) {
                        errors.push({ row: rowNumber, error: 'Invalid amount' });
                        return;
                    }

                    results.push({ date, description, amount });
                })
                .on('end', async () => {
                    try {
                        // Clean up uploaded file
                        fs.unlinkSync(req.file.path);

                        if (results.length === 0) {
                            return res.status(400).json({ 
                                error: 'No valid transactions found in CSV', 
                                errors 
                            });
                        }

                        let currentBalance = parseFloat(account.balance);
                        const importedTransactions = [];

                        // Insert valid transactions
                        for (const transaction of results) {
                            currentBalance += transaction.amount;
                            
                            const result = await run(`
                                INSERT INTO transactions (user_id, account_id, date, description, amount, balance_after)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `, [req.user.id, accountId, transaction.date, transaction.description, transaction.amount, currentBalance]);

                            importedTransactions.push({
                                id: result.lastID,
                                ...transaction,
                                balance_after: currentBalance
                            });
                        }

                        // Update account balance
                        await run('UPDATE accounts SET balance = ? WHERE id = ?', [currentBalance, accountId]);

                        res.json({
                            message: `Successfully imported ${results.length} transactions`,
                            imported: importedTransactions.length,
                            errors: errors.length,
                            errorDetails: errors
                        });

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    // Clean up uploaded file
                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                    reject(error);
                });
        });
    } catch (error) {
        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('CSV import error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions
function parseDate(dateString) {
    if (!dateString) return null;
    
    // Try ISO format first (YYYY-MM-DD)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    // Try MM/DD/YYYY format
    const mmddyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    return null;
}

function sanitizeString(str) {
    if (!str) return null;
    return str.toString().trim().replace(/[<>]/g, '');
}

module.exports = router;