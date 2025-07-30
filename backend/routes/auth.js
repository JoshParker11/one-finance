const express = require('express');
const bcrypt = require('bcrypt');
const { run, get } = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, birthYear } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await run(
            'INSERT INTO users (email, password_hash, birth_year) VALUES (?, ?, ?)',
            [email, passwordHash, birthYear || null]
        );

        // Create default categories for the new user
        const defaultCategories = [
            { name: 'Food & Dining', color: '#FF6B35' },
            { name: 'Transportation', color: '#4A90E2' },
            { name: 'Shopping', color: '#D87C2A' },
            { name: 'Entertainment', color: '#2E8B57' },
            { name: 'Bills & Utilities', color: '#DC3545' },
            { name: 'Income', color: '#28A745' },
            { name: 'Savings', color: '#4C9A2A' },
            { name: 'Other', color: '#6C757D' }
        ];

        for (const category of defaultCategories) {
            await run(
                'INSERT INTO categories (user_id, name, color, is_default) VALUES (?, ?, ?, ?)',
                [result.lastID, category.name, category.color, true]
            );
        }

        // Create default FIRE settings
        await run(
            'INSERT INTO fire_settings (user_id) VALUES (?)',
            [result.lastID]
        );

        // Generate token
        const token = generateToken(result.lastID);

        res.status(201).json({
            message: 'User created successfully',
            user: { id: result.lastID, email },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await get('SELECT id, email, password_hash FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user.id);

        res.json({
            message: 'Login successful',
            user: { id: user.id, email: user.email },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await get(
            'SELECT id, email, birth_year, target_retirement_date, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { birthYear, targetRetirementDate } = req.body;

        await run(
            'UPDATE users SET birth_year = ?, target_retirement_date = ? WHERE id = ?',
            [birthYear || null, targetRetirementDate || null, req.user.id]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;