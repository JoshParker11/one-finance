// Main JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Application initialized');
    
    // Initialize any features based on what's available on the page
    initializeFeatures();
});

function initializeFeatures() {
    // Coffee button analytics
    const coffeeButton = document.querySelector('.coffee-button');
    if (coffeeButton) {
        coffeeButton.addEventListener('click', function() {
            console.log('☕ Coffee button clicked');
            // Track with analytics if available
            if (typeof gtag !== 'undefined') {
                gtag('event', 'click', {
                    event_category: 'engagement',
                    event_label: 'buy_me_coffee'
                });
            }
        });
    }
    
    // Add any other feature initializations here
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
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    switch(type) {
        case 'success':
            notification.style.background = 'var(--success-green)';
            break;
        case 'error':
            notification.style.background = 'var(--error-red)';
            break;
        default:
            notification.style.background = 'var(--accent-blue)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}
