// Main JavaScript file - App initialization and utilities
let currentUser = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 One Finance App initialized');
    
    // Check for stored auth token
    authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        // Verify token and load user
        verifyAuthToken();
    } else {
        // Show login form
        showAuthContainer();
    }
    
    // Initialize app features
    initializeApp();
});

function initializeApp() {
    // Set up auth form handlers
    setupAuthHandlers();
    
    // Set up navigation
    setupNavigation();
    
    // Initialize page-specific features
    if (typeof initializeDashboard === 'function') initializeDashboard();
    if (typeof initializeTransactions === 'function') initializeTransactions();
    if (typeof initializeAnalytics === 'function') initializeAnalytics();
    if (typeof initializeGoals === 'function') initializeGoals();
    if (typeof initializeSettings === 'function') initializeSettings();
}

// Authentication helpers
async function verifyAuthToken() {
    try {
        showLoading();
        const response = await apiCall('/api/auth/me');
        
        if (response.user) {
            currentUser = response.user;
            showAppContainer();
            loadDashboard();
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
        authToken = null;
        showAuthContainer();
    } finally {
        hideLoading();
    }
}

function showAuthContainer() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showAppContainer() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
}

// Navigation
function setupNavigation() {
    // Set up nav link click handlers
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.onclick.toString().match(/showPage\('([^']+)'\)/)[1];
            showPage(page);
        });
    });
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Add active class to corresponding nav link
    const activeLink = document.querySelector(`[onclick="showPage('${pageName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load page content
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'goals':
            loadGoals();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Loading overlay
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// API helper function
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(endpoint, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API call failed');
    }
    
    return await response.json();
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        z-index: 1001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 350px;
    `;
    
    switch(type) {
        case 'success':
            notification.style.background = 'var(--success-green)';
            break;
        case 'error':
            notification.style.background = 'var(--error-red)';
            break;
        case 'warning':
            notification.style.background = 'var(--warning-orange)';
            break;
        default:
            notification.style.background = 'var(--accent-blue)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showAuthContainer();
    showNotification('Logged out successfully', 'success');
}

// Auth form toggle
function toggleAuthMode() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Auth handlers setup
function setupAuthHandlers() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            showLoading();
            const response = await apiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            authToken = response.token;
            currentUser = response.user;
            localStorage.setItem('authToken', authToken);
            
            showAppContainer();
            loadDashboard();
            showNotification('Welcome back!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const birthYear = document.getElementById('register-birth-year').value;
        
        try {
            showLoading();
            const response = await apiCall('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ 
                    email, 
                    password, 
                    birthYear: birthYear ? parseInt(birthYear) : null 
                })
            });
            
            authToken = response.token;
            currentUser = response.user;
            localStorage.setItem('authToken', authToken);
            
            showAppContainer();
            loadDashboard();
            showNotification('Account created successfully!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    });
}