// Dashboard functionality
function initializeDashboard() {
    console.log('Dashboard initialized');
}

async function loadDashboard() {
    try {
        showLoading();
        const dashboardData = await apiCall('/api/dashboard');
        renderDashboard(dashboardData);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        hideLoading();
    }
}

function renderDashboard(data) {
    const container = document.getElementById('dashboard-content');
    
    container.innerHTML = `
        <!-- Net Worth Hero Section -->
        <div class="card" style="text-align: center; margin-bottom: var(--space-2xl);">
            <div style="margin-bottom: var(--space-lg);">
                <div class="metric-value" style="font-size: 3rem; background: linear-gradient(135deg, var(--moss), var(--amber)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                    ${formatCurrency(data.netWorth)}
                </div>
                <div class="metric-label" style="font-size: 1.125rem;">Net Worth</div>
            </div>
            
            ${data.percentileRanking ? `
                <div style="max-width: 400px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                        <span style="color: var(--muted-gray); font-size: 0.875rem;">Age ${data.age} Percentile</span>
                        <span style="color: var(--amber); font-weight: 600;">${Math.round(data.percentileRanking)}th</span>
                    </div>
                    <div class="percentile-bar">
                        <div class="percentile-fill" style="width: ${data.percentileRanking}%"></div>
                    </div>
                    <div style="color: var(--muted-gray); font-size: 0.875rem; margin-top: var(--space-sm);">
                        You're ahead of ${Math.round(data.percentileRanking)}% of people your age
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- Key Metrics Grid -->
        <div class="card-grid">
            <!-- Monthly Income -->
            <div class="metric-card">
                <div class="metric-value metric-positive">${formatCurrency(data.monthlyIncome)}</div>
                <div class="metric-label">Monthly Income</div>
            </div>

            <!-- Monthly Expenses -->
            <div class="metric-card">
                <div class="metric-value metric-negative">${formatCurrency(data.monthlyExpenses)}</div>
                <div class="metric-label">Monthly Expenses</div>
            </div>

            <!-- Monthly Savings -->
            <div class="metric-card">
                <div class="metric-value ${data.monthlySavings >= 0 ? 'metric-positive' : 'metric-negative'}">
                    ${formatCurrency(data.monthlySavings)}
                </div>
                <div class="metric-label">Monthly Savings</div>
            </div>

            <!-- Savings Rate -->
            <div class="metric-card">
                <div class="metric-value ${data.savingsRate >= 20 ? 'metric-positive' : data.savingsRate >= 10 ? 'metric-neutral' : 'metric-negative'}">
                    ${formatPercentage(data.savingsRate)}
                </div>
                <div class="metric-label">Savings Rate</div>
            </div>
        </div>

        <!-- FIRE Metrics -->
        ${data.yearsToFI ? `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">🔥 FIRE Progress</h3>
                </div>
                <div class="card-grid">
                    <div class="metric-card">
                        <div class="metric-value metric-neutral">${data.yearsToFI.toFixed(1)}</div>
                        <div class="metric-label">Years to FI</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value metric-neutral">${formatCurrency(data.additionalSavingsNeeded)}</div>
                        <div class="metric-label">Amount Needed</div>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- Account Summaries -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">💰 Account Overview</h3>
                <button class="btn btn-secondary" onclick="showPage('settings')">Manage Accounts</button>
            </div>
            
            ${data.accountSummaries.length > 0 ? `
                <div class="card-grid">
                    ${data.accountSummaries.map(account => `
                        <div class="metric-card">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                                <span style="font-weight: 600; color: var(--soft-white);">${account.name}</span>
                                <span style="font-size: 0.875rem; color: var(--muted-gray); text-transform: uppercase;">${account.type}</span>
                            </div>
                            <div class="metric-value ${account.balance >= 0 ? 'metric-positive' : 'metric-negative'}">
                                ${formatCurrency(account.balance)}
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: var(--space-md); font-size: 0.875rem;">
                                <span style="color: var(--success-green);">+${formatCurrency(account.monthlyIncome)}</span>
                                <span style="color: var(--error-red);">-${formatCurrency(account.monthlyExpenses)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div style="text-align: center; padding: var(--space-2xl); color: var(--muted-gray);">
                    <p>No accounts found. <a href="#" onclick="showPage('settings')" style="color: var(--moss);">Add your first account</a> to get started!</p>
                </div>
            `}
        </div>

        <!-- Quick Actions -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">⚡ Quick Actions</h3>
            </div>
            <div style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="showPage('transactions')">View Transactions</button>
                <button class="btn btn-primary" onclick="document.getElementById('csv-file').click()">Import CSV</button>
                <button class="btn btn-secondary" onclick="showPage('analytics')">View Analytics</button>
                <button class="btn btn-secondary" onclick="showPage('goals')">Manage Goals</button>
            </div>
        </div>
    `;

    // Add CSV file handler if not already added
    const csvInput = document.getElementById('csv-file');
    if (csvInput && !csvInput.hasAttribute('data-handler-added')) {
        csvInput.setAttribute('data-handler-added', 'true');
        csvInput.addEventListener('change', handleCsvUpload);
    }
}

function handleCsvUpload() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // For now, redirect to transactions page for CSV upload
    // In a full implementation, we'd show an account selection modal first
    showPage('transactions');
    showNotification('Go to Transactions page to complete CSV import', 'info');
}