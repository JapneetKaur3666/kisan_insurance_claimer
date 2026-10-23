/* ============================================
   MANUAL ENTRY - Agent-Powered Version
   Uses API_BASE from config.js (port 8000)
   ============================================ */
(function() {
    'use strict';
    const form = document.getElementById('claimForm');
    const applicationNumber = document.getElementById('applicationNumber');
    const season = document.getElementById('season');
    const year = document.getElementById('year');
    const crop = document.getElementById('crop');
    const mobile = document.getElementById('mobile');

    if (applicationNumber) {
        applicationNumber.addEventListener('input', function() {
            if (!/^KRB/i.test(this.value)) this.value = this.value.replace(/[^\d]/g, '').slice(0, 6);
            validateAppNo(this);
        });
        applicationNumber.addEventListener('blur', function() { validateAppNo(this); });
    }

    function validateAppNo(field) {
        const val = field.value.trim();
        const valid = /^KRB-\d{4}-\d{5}$/i.test(val) || /^\d{4,6}$/.test(val);
        const hint = field.parentElement.querySelector('.form-hint');
        if (val && !valid) { field.style.borderColor = 'var(--error)'; if (hint) hint.style.color = 'var(--error)'; }
        else { field.style.borderColor = ''; if (hint) hint.style.color = ''; }
        return valid;
    }

    if (mobile) mobile.addEventListener('input', function() { this.value = this.value.replace(/\D/g, '').slice(0, 10); });

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!applicationNumber || !applicationNumber.value.trim()) { showNotification('Application number is required', 'warning'); if (applicationNumber) applicationNumber.focus(); return; }
            if (!validateAppNo(applicationNumber)) { showNotification('Enter a valid application number (e.g. KRB-2026-00417 or 12345)', 'warning'); applicationNumber.focus(); return; }
            const appNo = applicationNumber.value.trim();
            const submitBtn = form.querySelector('.btn-submit');
            if (submitBtn) { submitBtn.classList.add('loading'); submitBtn.disabled = true; submitBtn.textContent = 'Checking...'; }
            navigateViaAgent(appNo, submitBtn);
        });
        form.addEventListener('reset', () => { document.querySelectorAll('.validation-message').forEach(m => m.remove()); showNotification('Form cleared', 'info'); });
    }

    async function navigateViaAgent(appNo, submitBtn) {
        try {
            const lang = (typeof getLang === 'function' ? getLang() : localStorage.getItem('preferredLanguage')) || 'hi';
            const sr = await fetch(API_BASE + '/api/session', { method: 'POST', headers: API_CONFIG.headers(), body: JSON.stringify({ lang }) });
            const sd = await sr.json(); const sid = sd.session_id;
            localStorage.setItem('kisan_session_id', sid);
            await fetch(API_BASE + '/api/chat', { method: 'POST', headers: API_CONFIG.headers(), body: JSON.stringify({ session_id: sid, text: appNo, lang }) });
            localStorage.setItem('searchQuery', JSON.stringify({ applicationNumber: appNo, timestamp: new Date().toISOString() }));
            showNotification('Loading dashboard...', 'success');
            setTimeout(() => window.location.href = 'dashboard.html?app=' + encodeURIComponent(appNo) + '&sid=' + encodeURIComponent(sid), 800);
        } catch (e) {
            console.warn('Agent routing failed:', e);
            localStorage.setItem('searchQuery', JSON.stringify({ applicationNumber: appNo, timestamp: new Date().toISOString() }));
            showNotification('Loading dashboard...', 'info');
            setTimeout(() => window.location.href = 'dashboard.html?app=' + encodeURIComponent(appNo), 800);
        } finally {
            if (submitBtn) { submitBtn.classList.remove('loading'); submitBtn.disabled = false; submitBtn.textContent = 'Check Claim Status'; }
        }
    }

    function showNotification(message, type) {
        type = type || 'info';
        const n = document.createElement('div'); n.className = 'notification notification-' + type; n.textContent = message;
        const colors = { success: '#4CAF50', error: '#D32F2F', warning: '#FFC107', info: '#2196F3' };
        Object.assign(n.style, { position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: '10000', maxWidth: '400px', animation: 'slideInRight 0.4s ease' });
        n.style.backgroundColor = colors[type] || colors.info;
        document.body.appendChild(n);
        setTimeout(() => { n.style.animation = 'slideOutRight 0.4s ease'; setTimeout(() => n.remove(), 400); }, 3000);
    }

    function fillAppNo(val) { if (applicationNumber) { applicationNumber.value = val; applicationNumber.removeAttribute('pattern'); showNotification('Quick-filled: ' + val, 'success'); } }
    window.fillAppNo = fillAppNo;

    document.addEventListener('DOMContentLoaded', () => {
        if (applicationNumber) {
            applicationNumber.removeAttribute('pattern');
            applicationNumber.setAttribute('placeholder', 'e.g. KRB-2026-00417 or 12345');
            const hint = applicationNumber.parentElement.querySelector('.form-hint');
            if (hint) hint.textContent = 'Enter KRB-YYYY-NNNNN format or 4-6 digit number';
        }
        if (year) {
            const cy = new Date().getFullYear(); year.innerHTML = '<option value="">-- Select Year --</option>';
            for (let i = 0; i < 3; i++) year.innerHTML += '<option value="' + (cy - i) + '">' + (cy - i) + '</option>';
        }
        try { const s = JSON.parse(localStorage.getItem('kisan_session') || '{}'); if (s.primaryCrop && crop) crop.value = s.primaryCrop; } catch (e) { /* */ }
        if (applicationNumber) applicationNumber.focus();
    });
})();
