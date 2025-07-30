// Settings functionality
function initializeSettings() {
    console.log('Settings initialized');
}

async function loadSettings() {
    try {
        showLoading();
        
        // Load accounts and FIRE settings
        const [accountsResponse, userResponse] = await Promise.all([
            apiCall('/api/accounts'),
            apiCall('/api/auth/me')
        ]);
        
        let fireSettings = null;
        try {
            const fireResponse = await apiCall('/api/analytics/fire');
            fireSettings = fireResponse.fireSettings;
        } catch (error) {
            console.warn('Could not load FIRE settings:', error);
        }
        
        renderSettings(accountsResponse.accounts, userResponse.user, fireSettings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        showNotification('Failed to load settings', 'error');
        document.getElementById('settings-content').innerHTML = `
            <div class="card" style="text-align: center; color: var(--muted-gray);">
                <p>Failed to load settings. Please try again.</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function renderSettings(accounts, user, fireSettings) {
    const container = document.getElementById('settings-content');
    
    container.innerHTML = `
        <!-- Account Management -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">🏦 Account Management</h3>
                <button class="btn btn-primary" onclick="showAddAccountModal()">Add Account</button>
            </div>
            
            ${accounts.length > 0 ? `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Balance</th>
                                <th>Interest Rate</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${accounts.map(account => `
                                <tr>
                                    <td>${account.name}</td>
                                    <td style="text-transform: capitalize;">${account.type}</td>
                                    <td class="${account.balance >= 0 ? 'amount-positive' : 'amount-negative'}">
                                        ${formatCurrency(account.balance)}
                                    </td>
                                    <td>${formatPercentage(account.interest_rate * 100)}</td>
                                    <td>
                                        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-right: 0.5rem;" onclick="editAccount(${account.id})">Edit</button>
                                        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--error-red);" onclick="deleteAccount(${account.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div style="text-align: center; padding: var(--space-2xl); color: var(--muted-gray);">
                    <p>No accounts added yet. Add your first account to start tracking your finances!</p>
                </div>
            `}
        </div>

        <!-- FIRE Settings -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">🔥 FIRE Configuration</h3>
            </div>
            
            <form id="fire-settings-form">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-lg);">
                    <div class="form-group">
                        <label>Expected Return Rate (%)</label>
                        <input type="number" id="return-rate" step="0.01" min="0" max="100" 
                               value="${fireSettings ? (fireSettings.expected_return_rate * 100).toFixed(2) : '7.00'}"
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                        <small style="color: var(--muted-gray);">Typical stock market return: 7-10%</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Inflation Rate (%)</label>
                        <input type="number" id="inflation-rate" step="0.01" min="0" max="100"
                               value="${fireSettings ? (fireSettings.inflation_rate * 100).toFixed(2) : '3.00'}"
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                        <small style="color: var(--muted-gray);">Historical average: 2-4%</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Withdrawal Rate (%)</label>
                        <input type="number" id="withdrawal-rate" step="0.01" min="0" max="100"
                               value="${fireSettings ? (fireSettings.withdrawal_rate * 100).toFixed(2) : '4.00'}"
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                        <small style="color: var(--muted-gray);">4% rule is standard</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Target Annual Withdrawal ($)</label>
                        <input type="number" id="target-withdrawal" step="100" min="0"
                               value="${fireSettings?.target_withdrawal_amount || ''}"
                               placeholder="Leave empty to use current expenses"
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                        <small style="color: var(--muted-gray);">How much you want to withdraw per year</small>
                    </div>
                </div>
                
                <div style="margin-top: var(--space-xl);">
                    <button type="submit" class="btn btn-primary">Update FIRE Settings</button>
                </div>
            </form>
        </div>

        <!-- User Profile -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">👤 Profile Settings</h3>
            </div>
            
            <form id="profile-form">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-lg);">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="${user.email}" disabled
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.4); color: var(--muted-gray);">
                        <small style="color: var(--muted-gray);">Email cannot be changed</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Birth Year</label>
                        <input type="number" id="birth-year" min="1900" max="2020"
                               value="${user.birth_year || ''}"
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                        <small style="color: var(--muted-gray);">Used for net worth percentile ranking</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Target Retirement Date</label>
                        <input type="date" id="retirement-date"
                               value="${user.target_retirement_date || ''}"
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                        <small style="color: var(--muted-gray);">When you want to achieve FIRE</small>
                    </div>
                </div>
                
                <div style="margin-top: var(--space-xl);">
                    <button type="submit" class="btn btn-primary">Update Profile</button>
                </div>
            </form>
        </div>
    `;

    // Set up form handlers
    setupSettingsFormHandlers();
}

function setupSettingsFormHandlers() {
    // FIRE settings form
    document.getElementById('fire-settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const expectedReturnRate = parseFloat(document.getElementById('return-rate').value) / 100;
        const inflationRate = parseFloat(document.getElementById('inflation-rate').value) / 100;
        const withdrawalRate = parseFloat(document.getElementById('withdrawal-rate').value) / 100;
        const targetWithdrawalAmount = parseFloat(document.getElementById('target-withdrawal').value) || null;
        
        try {
            showLoading();
            await apiCall('/api/analytics/fire-settings', {
                method: 'PUT',
                body: JSON.stringify({
                    expectedReturnRate,
                    inflationRate,
                    withdrawalRate,
                    targetWithdrawalAmount
                })
            });
            
            showNotification('FIRE settings updated successfully!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    });

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const birthYear = parseInt(document.getElementById('birth-year').value) || null;
        const targetRetirementDate = document.getElementById('retirement-date').value || null;
        
        try {
            showLoading();
            await apiCall('/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    birthYear,
                    targetRetirementDate
                })
            });
            
            showNotification('Profile updated successfully!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    });
}

function showAddAccountModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(13, 27, 42, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div style="background: rgba(27, 38, 59, 0.95); border-radius: 16px; padding: 2rem; width: 90%; max-width: 500px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: var(--soft-white);">Add New Account</h3>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="background: none; border: none; color: var(--muted-gray); font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            
            <form id="add-account-form">
                <div class="form-group">
                    <label>Account Name</label>
                    <input type="text" id="account-name" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                </div>
                
                <div class="form-group">
                    <label>Account Type</label>
                    <select id="account-type" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="investment">Investment</option>
                        <option value="credit">Credit Card</option>
                        <option value="loan">Loan</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Current Balance</label>
                    <input type="number" id="account-balance" step="0.01" style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                </div>
                
                <div class="form-group">
                    <label>Interest Rate (% per year)</label>
                    <input type="number" id="account-interest" step="0.01" min="0" style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" onclick="this.closest('div[style*=\"position: fixed\"]').remove()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Account</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('add-account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('account-name').value;
        const type = document.getElementById('account-type').value;
        const balance = parseFloat(document.getElementById('account-balance').value) || 0;
        const interestRate = parseFloat(document.getElementById('account-interest').value) / 100 || 0;
        
        try {
            showLoading();
            await apiCall('/api/accounts', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    type,
                    balance,
                    interestRate
                })
            });
            
            modal.remove();
            loadSettings();
            showNotification('Account added successfully!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    });
}

function editAccount(accountId) {
    showNotification('Account editing feature coming soon!', 'info');
}

function deleteAccount(accountId) {
    if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        showNotification('Account deletion feature coming soon!', 'info');
    }
}