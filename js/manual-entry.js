/* ============================================
   MANUAL ENTRY FORM JAVASCRIPT
   ============================================ */

/* INTERVIEW POINT: IIFE pattern for encapsulation */
(function() {
    'use strict';
    
    const API_BASE = 'http://localhost:8001';

    console.log('📝 Manual Entry Module Loaded');
    
    // ============================================
    // GET FORM ELEMENTS
    // ============================================
    
    const form = document.getElementById('claimForm');
    const applicationNumber = document.getElementById('applicationNumber');
    const season = document.getElementById('season');
    const year = document.getElementById('year');
    const crop = document.getElementById('crop');
    const mobile = document.getElementById('mobile');
    
    // ============================================
    // FORM VALIDATION
    // ============================================
    
    /* INTERVIEW POINT: Real-time validation as user types */
    
    if (applicationNumber) {
        applicationNumber.addEventListener('input', function() {
            // INTERVIEW POINT: Remove non-numeric characters
            this.value = this.value.replace(/\D/g, '');
            
            // Limit to 6 digits
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
            }
            
            validateField(this);
        });
        
        /* INTERVIEW POINT: Blur event - when field loses focus */
        applicationNumber.addEventListener('blur', function() {
            validateField(this);
        });
    }
    
    if (mobile) {
        mobile.addEventListener('input', function() {
            // Only digits
            this.value = this.value.replace(/\D/g, '');
            
            // Limit to 10 digits
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
            
            validateField(this);
        });
    }
    
    /* INTERVIEW POINT: Field-level validation function */
    function validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        
        // Remove existing validation messages
        const existingMsg = field.parentElement.querySelector('.validation-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        let isValid = true;
        let message = '';
        
        /* INTERVIEW POINT: Switch statement for different validations */
        switch (fieldName) {
            case 'applicationNumber':
                if (value.length < 4 || value.length > 6) {
                    isValid = false;
                    message = 'Application number must be 4-6 digits';
                }
                break;
                
            case 'mobile':
                if (value && (value.length !== 10 || !value.match(/^[6-9]\d{9}$/))) {
                    isValid = false;
                    message = 'Enter valid 10-digit mobile number starting with 6-9';
                }
                break;
        }
        
        // Show validation message
        if (!isValid && value) {
            showValidationMessage(field, message, 'error');
        } else if (isValid && value) {
            showValidationMessage(field, '✓ Valid', 'success');
        }
        
        return isValid;
    }
    
    function showValidationMessage(field, message, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `validation-message ${type}`;
        msgDiv.textContent = message;
        field.parentElement.appendChild(msgDiv);
    }
    
    // ============================================
    // FORM SUBMISSION
    // ============================================
    
    if (form) {
        /* INTERVIEW POINT: Submit event handler */
        form.addEventListener('submit', function(e) {
            // INTERVIEW POINT: Prevent default form submission
            e.preventDefault();
            
            console.log('Form submitted');
            
            // Validate all fields
            const isValid = validateForm();
            
            if (!isValid) {
                showNotification('⚠️ Please fill all required fields correctly', 'warning');
                return;
            }
            
            // Get form data
            const formData = getFormData();
            
            console.log('Form Data:', formData);
            
            // Show loading state
            const submitBtn = form.querySelector('.btn-submit');
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Checking...';
            
            // Call backend to verify claim exists before navigating
            checkClaimAndNavigate(formData, submitBtn);
        });
        
        /* INTERVIEW POINT: Reset button handler */
        form.addEventListener('reset', function() {
            // Clear validation messages
            const messages = form.querySelectorAll('.validation-message');
            messages.forEach(msg => msg.remove());
            
            showNotification('Form cleared', 'info');
        });
    }
    
    // ============================================
    // API: CHECK CLAIM EXISTS THEN NAVIGATE
    // ============================================

    async function checkClaimAndNavigate(formData, submitBtn) {
        try {
            const response = await fetch(`${API_BASE}/api/claims/${formData.applicationNumber}`);

            saveFormData(formData);

            if (response.ok) {
                showNotification('Claim found! Redirecting to dashboard...', 'success');
                setTimeout(() => {
                    window.location.href = `dashboard.html?app=${formData.applicationNumber}`;
                }, 900);
            } else if (response.status === 404) {
                showNotification('No claim found for that application number. Please check and retry.', 'error');
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Check Status';
            } else {
                // Server error — still navigate so demo doesn't break
                showNotification('Server issue. Proceeding anyway...', 'warning');
                setTimeout(() => {
                    window.location.href = `dashboard.html?app=${formData.applicationNumber}`;
                }, 1000);
            }
        } catch (err) {
            // Backend not reachable — save and navigate anyway (graceful fallback)
            console.warn('Backend unreachable, navigating with localStorage fallback:', err);
            saveFormData(formData);
            showNotification('Redirecting to dashboard...', 'info');
            setTimeout(() => {
                window.location.href = `dashboard.html?app=${formData.applicationNumber}`;
            }, 900);
        }
    }

    // ============================================
    // FORM VALIDATION HELPERS
    // ============================================
    
    function validateForm() {
        let isValid = true;
        
        /* INTERVIEW POINT: HTML5 Constraint Validation API */
        
        // Check application number
        if (!applicationNumber.value.trim() || !applicationNumber.checkValidity()) {
            isValid = false;
            applicationNumber.focus();
        }
        
        // Check season
        if (!season.value) {
            isValid = false;
            if (isValid !== false) season.focus();
        }
        
        // Check year
        if (!year.value) {
            isValid = false;
            if (isValid !== false) year.focus();
        }
        
        // Check crop
        if (!crop.value) {
            isValid = false;
            if (isValid !== false) crop.focus();
        }
        
        // Mobile is optional, but validate if provided
        if (mobile.value && !mobile.checkValidity()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    /* INTERVIEW POINT: FormData API - alternative approach */
    function getFormData() {
        // Method 1: Manual object creation
        const data = {
            applicationNumber: applicationNumber.value.trim(),
            season: season.value,
            year: year.value,
            crop: crop.value,
            mobile: mobile.value.trim(),
            timestamp: new Date().toISOString()
        };
        
        /* INTERVIEW POINT: Method 2 - Using FormData API (commented)
        const formDataAPI = new FormData(form);
        const data = Object.fromEntries(formDataAPI.entries());
        */
        
        return data;
    }
    
    function saveFormData(data) {
        /* INTERVIEW POINT: LocalStorage with JSON */
        try {
            // Save search query
            localStorage.setItem('searchQuery', JSON.stringify(data));
            
            // Add to search history
            let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
            history.unshift(data);
            history = history.slice(0, 10); // Keep last 10
            localStorage.setItem('searchHistory', JSON.stringify(history));
            
            console.log('✅ Data saved to localStorage');
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    // ============================================
    // AUTO-FILL FROM RECENT SEARCHES
    // ============================================
    
    /* INTERVIEW POINT: Load previous data if available */
    function loadPreviousData() {
        try {
            const previousData = localStorage.getItem('searchQuery');
            if (previousData) {
                const data = JSON.parse(previousData);
                
                // Ask user if they want to reuse
                const reuse = confirm('Load your previous search data?');
                
                if (reuse) {
                    applicationNumber.value = data.applicationNumber || '';
                    season.value = data.season || '';
                    year.value = data.year || '';
                    crop.value = data.crop || '';
                    mobile.value = data.mobile || '';
                    
                    showNotification('✅ Previous data loaded', 'success');
                }
            }
        } catch (error) {
            console.error('Error loading previous data:', error);
        }
    }
    
    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    
    /* INTERVIEW POINT: Keyboard accessibility */
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to clear form
        if (e.key === 'Escape') {
            if (form && confirm('Clear the form?')) {
                form.reset();
            }
        }
    });
    
    // ============================================
    // DYNAMIC YEAR POPULATION
    // ============================================
    
    /* INTERVIEW POINT: Dynamically populate year dropdown */
    function populateYears() {
        if (!year) return;
        
        const currentYear = new Date().getFullYear();
        
        // Clear existing options except first (placeholder)
        year.innerHTML = '<option value="">-- Select Year --</option>';
        
        // Add current year and 2 previous years
        for (let i = 0; i < 3; i++) {
            const yearValue = currentYear - i;
            const option = document.createElement('option');
            option.value = yearValue;
            option.textContent = yearValue;
            year.appendChild(option);
        }
    }
    
    // ============================================
    // NOTIFICATION HELPER
    // ============================================
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
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
            animation: 'slideInRight 0.4s ease'
        });
        
        const colors = {
            success: '#4CAF50',
            error: '#D32F2F',
            warning: '#FFC107',
            info: '#2196F3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }
    
    // ============================================
    // FORM FIELD ENHANCEMENTS
    // ============================================
    
    /* INTERVIEW POINT: Add character counter for application number */
    if (applicationNumber) {
        const counter = document.createElement('small');
        counter.className = 'char-counter';
        counter.style.float = 'right';
        counter.style.color = 'var(--text-light)';
        applicationNumber.parentElement.querySelector('.form-hint').appendChild(counter);
        
        applicationNumber.addEventListener('input', function() {
            const length = this.value.length;
            counter.textContent = `${length}/6`;
            
            if (length >= 4 && length <= 6) {
                counter.style.color = 'var(--success)';
            } else {
                counter.style.color = 'var(--error)';
            }
        });
    }
    
    /* INTERVIEW POINT: Autocapitalize for mobile */
    [season, crop].forEach(select => {
        if (select) {
            select.setAttribute('autocapitalize', 'words');
        }
    });
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Manual entry page initialized');
        
        // Populate years dynamically
        populateYears();
        
        // Pre-fill from session (farmer's registered crop)
        try {
            const session = JSON.parse(localStorage.getItem('kisan_session') || '{}');
            if (session.primaryCrop && crop) {
                crop.value = session.primaryCrop;
            }
        } catch(e) { /* ignore */ }
        
        // Load previous search if any
        try {
            const prev = JSON.parse(localStorage.getItem('searchQuery') || '{}');
            if (prev.applicationNumber && applicationNumber) applicationNumber.value = prev.applicationNumber;
            if (prev.season && season) season.value = prev.season;
            if (prev.crop && crop && !crop.value) crop.value = prev.crop;
        } catch(e) { /* ignore */ }
        
        // Focus first field
        if (applicationNumber) applicationNumber.focus();
        
        console.log('💡 Keyboard shortcuts:');
        console.log('  - Ctrl/Cmd + Enter: Submit form');
        console.log('  - Escape: Clear form');
    });
    
    /* INTERVIEW POINT: Export for testing (optional)
    window.ManualEntryModule = {
        validateForm,
        getFormData,
        validateField
    };
    */
    
})();

console.log('📝 Manual Entry Module Ready');
