const express = require('express');
const { query, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard data
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user details for age calculation
        const user = await get('SELECT birth_year FROM users WHERE id = ?', [userId]);
        const currentYear = new Date().getFullYear();
        const age = user.birth_year ? currentYear - user.birth_year : null;

        // Calculate net worth (total assets - total liabilities)
        const assetsQuery = `
            SELECT SUM(balance) as total 
            FROM accounts 
            WHERE user_id = ? AND type IN ('checking', 'savings', 'investment')
        `;
        const liabilitiesQuery = `
            SELECT SUM(ABS(balance)) as total 
            FROM accounts 
            WHERE user_id = ? AND type IN ('credit', 'loan')
        `;

        const [assets, liabilities] = await Promise.all([
            get(assetsQuery, [userId]),
            get(liabilitiesQuery, [userId])
        ]);

        const netWorth = (assets.total || 0) - (liabilities.total || 0);

        // Get account summaries
        const accounts = await query(
            'SELECT id, name, type, balance FROM accounts WHERE user_id = ? ORDER BY balance DESC',
            [userId]
        );

        // Calculate monthly income and expenses for each account (last 30 days)
        const accountSummaries = [];
        for (const account of accounts) {
            const monthlyData = await get(`
                SELECT 
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
                FROM transactions 
                WHERE account_id = ? AND date >= date('now', '-30 days')
            `, [account.id]);

            accountSummaries.push({
                ...account,
                monthlyIncome: monthlyData.income || 0,
                monthlyExpenses: monthlyData.expenses || 0
            });
        }

        // Calculate global income and expenses (last 30 days)
        const globalMonthly = await get(`
            SELECT 
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses
            FROM transactions 
            WHERE user_id = ? AND date >= date('now', '-30 days')
        `, [userId]);

        const monthlyIncome = globalMonthly.total_income || 0;
        const monthlyExpenses = globalMonthly.total_expenses || 0;
        const monthlySavings = monthlyIncome - monthlyExpenses;
        const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

        // Get FIRE settings for calculations
        const fireSettings = await get(
            'SELECT * FROM fire_settings WHERE user_id = ?',
            [userId]
        );

        // Calculate basic FIRE metrics
        let yearsToFI = null;
        let additionalSavingsNeeded = null;

        if (fireSettings && monthlySavings > 0) {
            const annualSavings = monthlySavings * 12;
            const withdrawalAmount = fireSettings.target_withdrawal_amount || (monthlyExpenses * 12);
            const targetAmount = withdrawalAmount / fireSettings.withdrawal_rate;
            const realReturnRate = (1 + fireSettings.expected_return_rate) / (1 + fireSettings.inflation_rate) - 1;

            if (annualSavings > 0 && targetAmount > netWorth) {
                // Years to FI calculation using compound interest formula
                yearsToFI = Math.log(1 + ((targetAmount - netWorth) / annualSavings) * realReturnRate) / Math.log(1 + realReturnRate);
                additionalSavingsNeeded = targetAmount - netWorth;
            }
        }

        // Mock percentile data (in a real app, this would come from actual data)
        const getPercentileRanking = (netWorth, age) => {
            if (!age) return null;
            
            // Mock percentile thresholds by age group
            const thresholds = {
                25: [0, 5000, 15000, 35000, 75000, 150000],
                35: [0, 25000, 65000, 140000, 300000, 650000],
                45: [0, 75000, 185000, 400000, 850000, 1800000],
                55: [0, 180000, 450000, 950000, 2000000, 4200000]
            };

            const ageGroup = age < 30 ? 25 : age < 40 ? 35 : age < 50 ? 45 : 55;
            const ageThresholds = thresholds[ageGroup];

            for (let i = ageThresholds.length - 1; i >= 0; i--) {
                if (netWorth >= ageThresholds[i]) {
                    return Math.min(90, (i / (ageThresholds.length - 1)) * 90 + 10);
                }
            }
            return 5;
        };

        const percentileRanking = getPercentileRanking(netWorth, age);

        res.json({
            netWorth,
            percentileRanking,
            age,
            accountSummaries,
            monthlyIncome,
            monthlyExpenses,
            monthlySavings,
            savingsRate,
            yearsToFI,
            additionalSavingsNeeded,
            fireSettings
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;