const express = require('express');
const { query, get } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get spending breakdown by category
router.get('/spending', async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        
        const spendingData = await query(`
            SELECT 
                c.name as category,
                c.color as color,
                SUM(ABS(t.amount)) as total,
                COUNT(t.id) as transaction_count
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ? 
                AND t.amount < 0 
                AND t.date >= date('now', '-${parseInt(period)} days')
            GROUP BY t.category_id, c.name, c.color
            ORDER BY total DESC
        `, [req.user.id]);

        // Calculate total spending for percentages
        const totalSpending = spendingData.reduce((sum, item) => sum + item.total, 0);

        const spendingWithPercentages = spendingData.map(item => ({
            ...item,
            percentage: totalSpending > 0 ? (item.total / totalSpending) * 100 : 0
        }));

        res.json({
            spending: spendingWithPercentages,
            totalSpending,
            period: parseInt(period)
        });
    } catch (error) {
        console.error('Get spending analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get net worth over time
router.get('/networth', async (req, res) => {
    try {
        const { period = '365' } = req.query; // days

        // Get net worth progression by calculating balance after each transaction
        const networthData = await query(`
            SELECT 
                DATE(t.date) as date,
                SUM(CASE WHEN a.type IN ('checking', 'savings', 'investment') 
                    THEN t.balance_after 
                    ELSE -ABS(t.balance_after) 
                END) as net_worth
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = ? 
                AND t.date >= date('now', '-${parseInt(period)} days')
            GROUP BY DATE(t.date)
            ORDER BY date ASC
        `, [req.user.id]);

        // If no transactions, get current net worth
        if (networthData.length === 0) {
            const currentNetWorth = await get(`
                SELECT 
                    SUM(CASE WHEN type IN ('checking', 'savings', 'investment') 
                        THEN balance 
                        ELSE -ABS(balance) 
                    END) as net_worth
                FROM accounts 
                WHERE user_id = ?
            `, [req.user.id]);

            networthData.push({
                date: new Date().toISOString().split('T')[0],
                net_worth: currentNetWorth.net_worth || 0
            });
        }

        res.json({
            networth: networthData,
            period: parseInt(period)
        });
    } catch (error) {
        console.error('Get net worth analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get income vs expenses over time
router.get('/income-expenses', async (req, res) => {
    try {
        const { period = '365' } = req.query; // days

        const monthlyData = await query(`
            SELECT 
                strftime('%Y-%m', date) as month,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
            FROM transactions 
            WHERE user_id = ? 
                AND date >= date('now', '-${parseInt(period)} days')
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month ASC
        `, [req.user.id]);

        const dataWithSavings = monthlyData.map(item => ({
            ...item,
            savings: item.income - item.expenses,
            savings_rate: item.income > 0 ? ((item.income - item.expenses) / item.income) * 100 : 0
        }));

        res.json({
            monthlyData: dataWithSavings,
            period: parseInt(period)
        });
    } catch (error) {
        console.error('Get income/expenses analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get FIRE projection data
router.get('/fire', async (req, res) => {
    try {
        // Get user's FIRE settings
        const fireSettings = await get(
            'SELECT * FROM fire_settings WHERE user_id = ?',
            [req.user.id]
        );

        if (!fireSettings) {
            return res.status(404).json({ error: 'FIRE settings not found' });
        }

        // Get current net worth
        const currentNetWorth = await get(`
            SELECT 
                SUM(CASE WHEN type IN ('checking', 'savings', 'investment') 
                    THEN balance 
                    ELSE -ABS(balance) 
                END) as net_worth
            FROM accounts 
            WHERE user_id = ?
        `, [req.user.id]);

        const netWorth = currentNetWorth.net_worth || 0;

        // Get recent savings rate (last 90 days)
        const recentSavingsData = await get(`
            SELECT 
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
            FROM transactions 
            WHERE user_id = ? 
                AND date >= date('now', '-90 days')
        `, [req.user.id]);

        const monthlyIncome = (recentSavingsData.income || 0) / 3; // Average monthly
        const monthlyExpenses = (recentSavingsData.expenses || 0) / 3; // Average monthly
        const monthlySavings = monthlyIncome - monthlyExpenses;
        const annualSavings = monthlySavings * 12;
        const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) : 0;

        // Calculate FIRE numbers
        const withdrawalAmount = fireSettings.target_withdrawal_amount || (monthlyExpenses * 12);
        const fireNumber = withdrawalAmount / fireSettings.withdrawal_rate;
        const realReturnRate = (1 + fireSettings.expected_return_rate) / (1 + fireSettings.inflation_rate) - 1;

        let yearsToFire = null;
        let monthsToFire = null;
        let projectionData = [];

        if (annualSavings > 0 && fireNumber > netWorth) {
            // Calculate years to FIRE using compound interest formula
            if (realReturnRate > 0) {
                const timeToFire = Math.log(1 + ((fireNumber - netWorth) / annualSavings) * realReturnRate) / Math.log(1 + realReturnRate);
                yearsToFire = Math.max(0, timeToFire);
                monthsToFire = yearsToFire * 12;
            } else {
                // Simple calculation if no return rate
                yearsToFire = (fireNumber - netWorth) / annualSavings;
                monthsToFire = yearsToFire * 12;
            }

            // Generate projection data (monthly points for next 30 years or until FIRE)
            const maxMonths = Math.min(360, Math.ceil(monthsToFire) + 12); // 30 years max or until FIRE + 1 year
            let currentValue = netWorth;

            for (let month = 0; month <= maxMonths; month += 6) { // Every 6 months
                const years = month / 12;
                const projectedValue = netWorth * Math.pow(1 + realReturnRate, years) + 
                    annualSavings * ((Math.pow(1 + realReturnRate, years) - 1) / realReturnRate);

                projectionData.push({
                    month,
                    years: Math.round(years * 100) / 100,
                    projectedNetWorth: Math.round(projectedValue),
                    fireAchieved: projectedValue >= fireNumber
                });

                if (projectedValue >= fireNumber && !yearsToFire) {
                    yearsToFire = years;
                    monthsToFire = month;
                }
            }
        }

        // Calculate different scenarios
        const scenarios = [];
        const savingsRateScenarios = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]; // 10% to 60%

        for (const rate of savingsRateScenarios) {
            const scenarioSavings = monthlyIncome * rate * 12;
            if (scenarioSavings > 0 && fireNumber > netWorth) {
                let scenarioYears = null;
                if (realReturnRate > 0) {
                    const timeToFire = Math.log(1 + ((fireNumber - netWorth) / scenarioSavings) * realReturnRate) / Math.log(1 + realReturnRate);
                    scenarioYears = Math.max(0, timeToFire);
                } else {
                    scenarioYears = (fireNumber - netWorth) / scenarioSavings;
                }

                scenarios.push({
                    savingsRate: rate,
                    yearsToFire: scenarioYears,
                    monthlySavingsRequired: scenarioSavings / 12
                });
            }
        }

        res.json({
            currentNetWorth: netWorth,
            fireNumber,
            remainingAmount: Math.max(0, fireNumber - netWorth),
            yearsToFire,
            monthsToFire,
            currentSavingsRate: savingsRate,
            monthlySavings,
            monthlyExpenses,
            withdrawalAmount,
            projectionData,
            scenarios,
            fireSettings
        });
    } catch (error) {
        console.error('Get FIRE analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update FIRE settings
router.put('/fire-settings', async (req, res) => {
    try {
        const { 
            expectedReturnRate, 
            inflationRate, 
            targetWithdrawalAmount, 
            withdrawalRate 
        } = req.body;

        await run(`
            UPDATE fire_settings SET 
                expected_return_rate = COALESCE(?, expected_return_rate),
                inflation_rate = COALESCE(?, inflation_rate),
                target_withdrawal_amount = COALESCE(?, target_withdrawal_amount),
                withdrawal_rate = COALESCE(?, withdrawal_rate),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [expectedReturnRate, inflationRate, targetWithdrawalAmount, withdrawalRate, req.user.id]);

        const updatedSettings = await get(
            'SELECT * FROM fire_settings WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            message: 'FIRE settings updated successfully',
            fireSettings: updatedSettings
        });
    } catch (error) {
        console.error('Update FIRE settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;