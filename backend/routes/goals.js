const express = require('express');
const { query, run, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all goals for user
router.get('/', async (req, res) => {
    try {
        const goals = await query(
            'SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC, created_at DESC',
            [req.user.id]
        );

        // Calculate progress percentage for each goal
        const goalsWithProgress = goals.map(goal => ({
            ...goal,
            progressPercentage: goal.target_amount > 0 ? 
                Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
        }));

        res.json({ goals: goalsWithProgress });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single goal
router.get('/:id', async (req, res) => {
    try {
        const goal = await get(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        const goalWithProgress = {
            ...goal,
            progressPercentage: goal.target_amount > 0 ? 
                Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
        };

        res.json({ goal: goalWithProgress });
    } catch (error) {
        console.error('Get goal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new goal
router.post('/', async (req, res) => {
    try {
        const { title, targetAmount, currentAmount = 0, targetDate, description } = req.body;

        if (!title || !targetAmount) {
            return res.status(400).json({ error: 'Title and target amount are required' });
        }

        if (targetAmount <= 0) {
            return res.status(400).json({ error: 'Target amount must be positive' });
        }

        if (currentAmount < 0) {
            return res.status(400).json({ error: 'Current amount cannot be negative' });
        }

        const result = await run(
            'INSERT INTO goals (user_id, title, target_amount, current_amount, target_date, description) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, title, targetAmount, currentAmount, targetDate || null, description || null]
        );

        const goal = await get('SELECT * FROM goals WHERE id = ?', [result.lastID]);
        
        const goalWithProgress = {
            ...goal,
            progressPercentage: goal.target_amount > 0 ? 
                Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
        };

        res.status(201).json({
            message: 'Goal created successfully',
            goal: goalWithProgress
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update goal
router.put('/:id', async (req, res) => {
    try {
        const { title, targetAmount, currentAmount, targetDate, description } = req.body;

        // Verify goal belongs to user
        const existingGoal = await get(
            'SELECT id FROM goals WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existingGoal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Validate amounts if provided
        if (targetAmount !== undefined && targetAmount <= 0) {
            return res.status(400).json({ error: 'Target amount must be positive' });
        }

        if (currentAmount !== undefined && currentAmount < 0) {
            return res.status(400).json({ error: 'Current amount cannot be negative' });
        }

        await run(
            `UPDATE goals SET 
                title = COALESCE(?, title),
                target_amount = COALESCE(?, target_amount),
                current_amount = COALESCE(?, current_amount),
                target_date = COALESCE(?, target_date),
                description = COALESCE(?, description)
            WHERE id = ? AND user_id = ?`,
            [title, targetAmount, currentAmount, targetDate, description, req.params.id, req.user.id]
        );

        const updatedGoal = await get('SELECT * FROM goals WHERE id = ?', [req.params.id]);
        
        const goalWithProgress = {
            ...updatedGoal,
            progressPercentage: updatedGoal.target_amount > 0 ? 
                Math.min(100, (updatedGoal.current_amount / updatedGoal.target_amount) * 100) : 0
        };

        res.json({
            message: 'Goal updated successfully',
            goal: goalWithProgress
        });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete goal
router.delete('/:id', async (req, res) => {
    try {
        // Verify goal belongs to user
        const existingGoal = await get(
            'SELECT id FROM goals WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existingGoal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await run('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;