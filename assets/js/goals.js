// Goals functionality
function initializeGoals() {
    console.log('Goals initialized');
}

async function loadGoals() {
    try {
        showLoading();
        const goalsResponse = await apiCall('/api/goals');
        renderGoals(goalsResponse.goals);
    } catch (error) {
        console.error('Failed to load goals:', error);
        showNotification('Failed to load goals', 'error');
        document.getElementById('goals-content').innerHTML = `
            <div class="card" style="text-align: center; color: var(--muted-gray);">
                <p>Failed to load goals. Please try again.</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function renderGoals(goals) {
    const container = document.getElementById('goals-content');
    
    if (goals.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: var(--space-2xl);">
                <h3 style="color: var(--amber); margin-bottom: var(--space-lg);">🎯 No Goals Yet</h3>
                <p style="color: var(--muted-gray); margin-bottom: var(--space-xl);">
                    Set financial goals to track your progress towards FIRE and other milestones.
                </p>
                <button class="btn btn-primary" onclick="showAddGoalModal()">Create Your First Goal</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="card-grid">
            ${goals.map(goal => `
                <div class="card">
                    <div class="card-header">
                        <h4 style="margin: 0; color: var(--soft-white);">${goal.title}</h4>
                        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="editGoal(${goal.id})">Edit</button>
                    </div>
                    
                    <div style="margin-bottom: var(--space-lg);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                            <span style="color: var(--muted-gray);">Progress</span>
                            <span style="color: var(--soft-white); font-weight: 600;">
                                ${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount)}
                            </span>
                        </div>
                        
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, goal.progressPercentage)}%"></div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-top: var(--space-sm);">
                            <span style="color: var(--amber); font-weight: 600;">${formatPercentage(goal.progressPercentage)}</span>
                            ${goal.target_date ? `
                                <span style="color: var(--muted-gray); font-size: 0.875rem;">
                                    Due: ${formatDate(goal.target_date)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${goal.description ? `
                        <p style="color: var(--muted-gray); font-size: 0.875rem; margin: 0;">
                            ${goal.description}
                        </p>
                    ` : ''}
                    
                    <div style="margin-top: var(--space-lg);">
                        <button class="btn btn-primary" style="width: 100%;" onclick="updateGoalProgress(${goal.id})">
                            Update Progress
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <!-- Goal Stats -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">📊 Goal Statistics</h3>
            </div>
            <div class="card-grid">
                <div class="metric-card">
                    <div class="metric-value metric-neutral">${goals.length}</div>
                    <div class="metric-label">Total Goals</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value metric-positive">${goals.filter(g => g.progressPercentage >= 100).length}</div>
                    <div class="metric-label">Completed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value metric-amber">${goals.filter(g => g.progressPercentage >= 50 && g.progressPercentage < 100).length}</div>
                    <div class="metric-label">In Progress</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value metric-neutral">
                        ${formatCurrency(goals.reduce((sum, goal) => sum + goal.target_amount, 0))}
                    </div>
                    <div class="metric-label">Total Target</div>
                </div>
            </div>
        </div>
    `;
}

function showAddGoalModal() {
    // Create modal HTML
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
                <h3 style="margin: 0; color: var(--soft-white);">Add New Goal</h3>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="background: none; border: none; color: var(--muted-gray); font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            
            <form id="add-goal-form">
                <div class="form-group">
                    <label>Goal Title</label>
                    <input type="text" id="goal-title" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                </div>
                
                <div class="form-group">
                    <label>Target Amount</label>
                    <input type="number" id="goal-target" required min="0" step="0.01" style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                </div>
                
                <div class="form-group">
                    <label>Current Amount (Optional)</label>
                    <input type="number" id="goal-current" min="0" step="0.01" style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                </div>
                
                <div class="form-group">
                    <label>Target Date (Optional)</label>
                    <input type="date" id="goal-date" style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white);">
                </div>
                
                <div class="form-group">
                    <label>Description (Optional)</label>
                    <textarea id="goal-description" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid var(--slate); border-radius: 8px; background: rgba(13, 27, 42, 0.6); color: var(--soft-white); resize: vertical;"></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" onclick="this.closest('div[style*=\"position: fixed\"]').remove()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Goal</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('add-goal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('goal-title').value;
        const targetAmount = parseFloat(document.getElementById('goal-target').value);
        const currentAmount = parseFloat(document.getElementById('goal-current').value) || 0;
        const targetDate = document.getElementById('goal-date').value || null;
        const description = document.getElementById('goal-description').value || null;
        
        try {
            showLoading();
            await apiCall('/api/goals', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    targetAmount,
                    currentAmount,
                    targetDate,
                    description
                })
            });
            
            modal.remove();
            loadGoals();
            showNotification('Goal created successfully!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    });
}

function editGoal(goalId) {
    showNotification('Goal editing feature coming soon!', 'info');
}

function updateGoalProgress(goalId) {
    showNotification('Progress update feature coming soon!', 'info');
}