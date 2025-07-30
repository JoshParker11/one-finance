// Analytics functionality
function initializeAnalytics() {
    console.log('Analytics initialized');
}

async function loadAnalytics() {
    try {
        showLoading();
        
        // Load analytics data
        const [spendingData, networthData, fireData] = await Promise.all([
            apiCall('/api/analytics/spending?period=30'),
            apiCall('/api/analytics/networth?period=365'),
            apiCall('/api/analytics/fire')
        ]);
        
        renderAnalytics(spendingData, networthData, fireData);
    } catch (error) {
        console.error('Failed to load analytics:', error);
        showNotification('Failed to load analytics data', 'error');
        document.getElementById('analytics-content').innerHTML = `
            <div class="card" style="text-align: center; color: var(--muted-gray);">
                <p>Failed to load analytics. Please try again.</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function renderAnalytics(spendingData, networthData, fireData) {
    const container = document.getElementById('analytics-content');
    
    container.innerHTML = `
        <!-- FIRE Summary -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">🔥 FIRE Analysis</h3>
            </div>
            <div class="card-grid">
                <div class="metric-card">
                    <div class="metric-value metric-neutral">${formatCurrency(fireData.currentNetWorth)}</div>
                    <div class="metric-label">Current Net Worth</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value metric-amber">${formatCurrency(fireData.fireNumber)}</div>
                    <div class="metric-label">FIRE Number</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value ${fireData.currentSavingsRate >= 0.2 ? 'metric-positive' : 'metric-neutral'}">
                        ${formatPercentage(fireData.currentSavingsRate * 100)}
                    </div>
                    <div class="metric-label">Savings Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value metric-neutral">
                        ${fireData.yearsToFire ? fireData.yearsToFire.toFixed(1) : 'N/A'}
                    </div>
                    <div class="metric-label">Years to FIRE</div>
                </div>
            </div>
        </div>

        <!-- Spending Breakdown Chart -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">💸 Spending Breakdown (Last 30 Days)</h3>
            </div>
            <div class="chart-container">
                <canvas id="spending-chart"></canvas>
            </div>
        </div>

        <!-- Net Worth Over Time -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">📈 Net Worth Progression</h3>
            </div>
            <div class="chart-container">
                <canvas id="networth-chart"></canvas>
            </div>
        </div>

        <!-- FIRE Projection -->
        ${fireData.projectionData && fireData.projectionData.length > 0 ? `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">🎯 FIRE Projection</h3>
                </div>
                <div class="chart-container">
                    <canvas id="projection-chart"></canvas>
                </div>
            </div>
        ` : ''}

        <!-- Scenarios -->
        ${fireData.scenarios && fireData.scenarios.length > 0 ? `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">🎮 FIRE Scenarios</h3>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Savings Rate</th>
                                <th>Monthly Savings</th>
                                <th>Years to FIRE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fireData.scenarios.map(scenario => `
                                <tr>
                                    <td>${formatPercentage(scenario.savingsRate * 100)}</td>
                                    <td>${formatCurrency(scenario.monthlySavingsRequired)}</td>
                                    <td>${scenario.yearsToFire ? scenario.yearsToFire.toFixed(1) : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}
    `;

    // Create charts
    createSpendingChart(spendingData);
    createNetworthChart(networthData);
    if (fireData.projectionData && fireData.projectionData.length > 0) {
        createProjectionChart(fireData);
    }
}

function createSpendingChart(data) {
    const ctx = document.getElementById('spending-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.spending.map(item => item.category || 'Other'),
            datasets: [{
                data: data.spending.map(item => item.total),
                backgroundColor: data.spending.map(item => item.color || '#6C757D'),
                borderWidth: 2,
                borderColor: '#1B263B'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#F8F9FA',
                        padding: 20
                    }
                }
            }
        }
    });
}

function createNetworthChart(data) {
    const ctx = document.getElementById('networth-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.networth.map(item => formatDate(item.date)),
            datasets: [{
                label: 'Net Worth',
                data: data.networth.map(item => item.net_worth),
                borderColor: '#4C9A2A',
                backgroundColor: 'rgba(76, 154, 42, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#F8F9FA'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#F8F9FA' },
                    grid: { color: '#415A77' }
                },
                y: {
                    ticks: { 
                        color: '#F8F9FA',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: { color: '#415A77' }
                }
            }
        }
    });
}

function createProjectionChart(fireData) {
    const ctx = document.getElementById('projection-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: fireData.projectionData.map(item => `Year ${item.years.toFixed(1)}`),
            datasets: [
                {
                    label: 'Projected Net Worth',
                    data: fireData.projectionData.map(item => item.projectedNetWorth),
                    borderColor: '#4C9A2A',
                    backgroundColor: 'rgba(76, 154, 42, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'FIRE Number',
                    data: fireData.projectionData.map(() => fireData.fireNumber),
                    borderColor: '#D87C2A',
                    backgroundColor: 'rgba(216, 124, 42, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#F8F9FA'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#F8F9FA' },
                    grid: { color: '#415A77' }
                },
                y: {
                    ticks: { 
                        color: '#F8F9FA',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: { color: '#415A77' }
                }
            }
        }
    });
}