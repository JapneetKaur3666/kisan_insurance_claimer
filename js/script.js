/* ============================================
   KISAN INSURANCE - LANDING PAGE JAVASCRIPT
   ============================================ */

// Wait for entire page to load before running scripts
// Why? Ensures all HTML elements exist before we try to access them
document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🌾 Kisan Insurance Portal Loaded Successfully!');
    
    // ============================================
    // LANGUAGE SELECTOR FUNCTIONALITY
    // ============================================
    const languageSelect = document.getElementById('languageSelect');
    
    // Load saved language preference from browser storage
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
    languageSelect.value = savedLanguage;
    
    // When user changes language
    languageSelect.addEventListener('change', function() {
        const selectedLanguage = this.value;
        
        // Save preference to browser (persists across sessions)
        localStorage.setItem('preferredLanguage', selectedLanguage);
        
        // Show confirmation message
        showNotification(`Language changed to ${this.options[this.selectedIndex].text}`, 'success');
        
        // In a real app, you'd load translations here
        // For now, we just log it
        console.log('Language changed to:', selectedLanguage);
        
        // Future: Load language-specific content
        // loadTranslations(selectedLanguage);
    });
    
    // ============================================
    // VOICE BUTTON FUNCTIONALITY
    // ============================================
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) voiceBtn.addEventListener('click', function() {
        console.log('Voice button clicked');
        
        // Add visual feedback - button shake animation
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = '';
        }, 10);
        
        // Check if browser supports speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            showNotification('🎤 Voice feature coming soon! This will open voice input page.', 'info');
            
            // In the next phase, this will navigate to voice input page
            // window.location.href = 'voice-input.html';
        } else {
            // Browser doesn't support voice
            showNotification('❌ Voice input not supported on this browser. Please use Manual Entry.', 'error');
        }
    });
    
    // ============================================
    // MANUAL BUTTON FUNCTIONALITY
    // ============================================
    const manualBtn = document.getElementById('manualBtn');
    if (manualBtn) manualBtn.addEventListener('click', function() {
        console.log('Manual entry button clicked');
        
        showNotification('📝 Manual entry form coming soon! This will open the form page.', 'info');
        
        // In the next phase, this will navigate to manual entry page
        // window.location.href = 'manual-entry.html';
    });
    
    // ============================================
    // ANIMATED STATISTICS COUNTER
    // ============================================
    // Makes numbers count up from 0 for visual appeal
    
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasAnimated = false;
    
    // Function to animate counting
    function animateCounter(element, target, duration = 2000) {
        // Extract just the number from text like "1,234" or "₹45 Cr"
        const numberMatch = target.match(/[\d,]+/);
        if (!numberMatch) return;
        
        const targetNumber = parseInt(numberMatch[0].replace(/,/g, ''));
        const startTime = Date.now();
        const prefix = target.split(numberMatch[0])[0];
        const suffix = target.split(numberMatch[0])[1] || '';
        
        function update() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentNumber = Math.floor(targetNumber * easeOutQuart);
            
            // Format with commas for Indian numbering
            const formatted = currentNumber.toLocaleString('en-IN');
            element.textContent = prefix + formatted + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target; // Ensure final value is exact
            }
        }
        
        update();
    }
    
    // Intersection Observer - animates when stats come into view
    // Why? Better performance and only animates when user scrolls to section
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                statNumbers.forEach(stat => {
                    const targetValue = stat.textContent;
                    stat.textContent = '0';
                    animateCounter(stat, targetValue);
                });
            }
        });
    }, { threshold: 0.5 }); // Trigger when 50% visible
    
    // Observe the stats section
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }
    
    // ============================================
    // NOTIFICATION SYSTEM
    // ============================================
    // Shows temporary messages to user
    
    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles dynamically
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: '10000',
            maxWidth: '400px',
            animation: 'slideInRight 0.4s ease',
            cursor: 'pointer'
        });
        
        // Set background color based on type
        const colors = {
            success: '#4CAF50',
            error: '#D32F2F',
            warning: '#FFC107',
            info: '#2196F3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
        
        // Click to dismiss
        notification.addEventListener('click', function() {
            this.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => this.remove(), 400);
        });
    }
    
    // ============================================
    // SMOOTH SCROLLING FOR ANCHOR LINKS
    // ============================================
    // Makes clicking footer links scroll smoothly
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // ============================================
    // FEATURE CARDS ANIMATION ON SCROLL
    // ============================================
    // Cards fade in as user scrolls to them
    
    const featureCards = document.querySelectorAll('.feature-card');
    
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger animation - each card appears slightly after previous
                setTimeout(() => {
                    entry.target.style.opacity = '0';
                    entry.target.style.transform = 'translateY(30px)';
                    entry.target.style.transition = 'all 0.5s ease';
                    
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, 50);
                }, index * 100); // 100ms delay between each card
                
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    featureCards.forEach(card => cardObserver.observe(card));
    
    // ============================================
    // RESPONSIVE NAVIGATION FOR MOBILE
    // ============================================
    // In future phases, we'll add hamburger menu here
    
    // ============================================
    // PERFORMANCE MONITORING
    // ============================================
    // Log page load time for optimization
    
    window.addEventListener('load', function() {
        const loadTime = performance.now();
        console.log(`⚡ Page fully loaded in ${Math.round(loadTime)}ms`);
        
        // In production, you might send this to analytics
        // analytics.track('page_load_time', { time: loadTime });
    });
    
    // ============================================
    // KEYBOARD ACCESSIBILITY
    // ============================================
    // Add keyboard navigation support
    
    document.addEventListener('keydown', function(e) {
        // Press 'V' key to trigger voice button
        if (e.key === 'v' || e.key === 'V') {
            if (document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'SELECT') {
                voiceBtn.click();
            }
        }
        
        // Press 'M' key to trigger manual entry
        if (e.key === 'm' || e.key === 'M') {
            if (document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'SELECT') {
                manualBtn.click();
            }
        }
    });
    
    console.log('💡 Keyboard shortcuts: Press V for Voice, M for Manual');
    
});

// ============================================
// ADD CSS ANIMATIONS DYNAMICALLY
// ============================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

/* ============================================
   SESSION — show farmer name, sign out
   ============================================ */
(function() {
    const session = localStorage.getItem('kisan_session');
    if (!session) return;
    try {
        const s = JSON.parse(session);
        const greeting = document.getElementById('userGreeting');
        const menu = document.getElementById('userMenu');
        if (greeting) greeting.textContent = s.name ? s.name.split(' ')[0] : '';
        if (menu) menu.style.display = 'flex';
    } catch (e) { /* ignore */ }
})();

function signOut() {
    localStorage.removeItem('kisan_session');
    window.location.href = 'auth.html';
}

