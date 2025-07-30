// Transactions functionality
function initializeTransactions() {
    console.log('Transactions initialized');
}

async function loadTransactions() {
    try {
        showLoading();
        
        // Load accounts for filtering
        const accountsResponse = await apiCall('/api/accounts');
        const transactionsResponse = await apiCall('/api/transactions?limit=50');
        
        renderTransactions(transactionsResponse, accountsResponse.accounts);
    } catch (error) {
        console.error('Failed to load transactions:', error);
        showNotification('Failed to load transactions', 'error');
        document.getElementById('transactions-content').innerHTML = `
            <div class="card" style="text-align: center; color: var(--muted-gray);">
                <p>Failed to load transactions. Please try again.</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function renderTransactions(transactionsData, accounts) {
    const container = document.getElementById('transactions-content');
    
    container.innerHTML = `
        <!-- Filters -->
        <div class="card">
            <div class="filter-controls">
                <select id="account-filter">
                    <option value="">All Accounts</option>
                    ${accounts.map(account => `<option value="${account.id}">${account.name}</option>`).join('')}
                </select>
                <input type="date" id="start-date" placeholder="Start Date">
                <input type="date" id="end-date" placeholder="End Date">
                <button class="btn btn-secondary" onclick="applyTransactionFilters()">Filter</button>
                <button class="btn btn-secondary" onclick="clearTransactionFilters()">Clear</button>
            </div>
        </div>

        <!-- Transactions Table -->
        <div class="table-container">
            ${transactionsData.transactions.length > 0 ? `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Account</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactionsData.transactions.map(transaction => `
                            <tr>
                                <td>${formatDate(transaction.date)}</td>
                                <td>${transaction.description}</td>
                                <td>${transaction.account_name || 'Unknown'}</td>
                                <td>
                                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${transaction.category_color || '#6C757D'}; margin-right: 8px;"></span>
                                    ${transaction.category_name || 'Uncategorized'}
                                </td>
                                <td class="${transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}">
                                    ${formatCurrency(transaction.amount)}
                                </td>
                                <td>
                                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editTransaction(${transaction.id})">Edit</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Pagination -->
                ${transactionsData.pagination.totalPages > 1 ? `
                    <div style="display: flex; justify-content: center; gap: var(--space-md); margin-top: var(--space-lg);">
                        ${transactionsData.pagination.page > 1 ? `<button class="btn btn-secondary" onclick="loadTransactionPage(${transactionsData.pagination.page - 1})">Previous</button>` : ''}
                        <span style="color: var(--muted-gray); display: flex; align-items: center;">
                            Page ${transactionsData.pagination.page} of ${transactionsData.pagination.totalPages}
                        </span>
                        ${transactionsData.pagination.page < transactionsData.pagination.totalPages ? `<button class="btn btn-secondary" onclick="loadTransactionPage(${transactionsData.pagination.page + 1})">Next</button>` : ''}
                    </div>
                ` : ''}
            ` : `
                <div style="text-align: center; padding: var(--space-2xl); color: var(--muted-gray);">
                    <p>No transactions found. Import a CSV file or add transactions manually to get started!</p>
                </div>
            `}
        </div>
    `;
}

function applyTransactionFilters() {
    // Implementation for filtering transactions
    showNotification('Filtering feature coming soon!', 'info');
}

function clearTransactionFilters() {
    document.getElementById('account-filter').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
}

function editTransaction(transactionId) {
    showNotification('Transaction editing coming soon!', 'info');
}

function showAddTransactionModal() {
    showNotification('Add transaction modal coming soon!', 'info');
}

function loadTransactionPage(page) {
    showNotification(`Loading page ${page}...`, 'info');
}