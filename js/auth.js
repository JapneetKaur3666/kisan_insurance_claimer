/* ============================================
   AUTH PAGE JAVASCRIPT
   Sign In / Sign Up with OTP + CAPTCHA
   ============================================ */
'use strict';

/* ────────────────────────────────────────────
   STATE
──────────────────────────────────────────── */
const state = {
    si: { captchaDone: false, otpSent: false, generatedOTP: '', timerInterval: null },
    su: { captchaDone: false, otpSent: false, generatedOTP: '', timerInterval: null }
};

/* ────────────────────────────────────────────
   TAB SWITCH
──────────────────────────────────────────── */
function switchTab(tab) {
    document.getElementById('signinForm').classList.toggle('active', tab === 'signin');
    document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
    document.getElementById('tabSignIn').classList.toggle('active', tab === 'signin');
    document.getElementById('tabSignUp').classList.toggle('active', tab === 'signup');
}

/* ────────────────────────────────────────────
   CAPTCHA (custom checkbox simulation)
──────────────────────────────────────────── */
function verifyCaptcha(prefix) {
    const cb = document.getElementById(`${prefix}-captcha-cb`);
    const tick = document.getElementById(`${prefix}-tick`);
    const status = document.getElementById(`${prefix}-captcha-status`);
    const captchaBox = document.getElementById(`${prefix}-captcha`);
    const sendBtn = document.getElementById(`${prefix}-send-otp`);

    if (state[prefix].captchaDone) return; // already verified

    // Show loading spinner
    cb.classList.add('loading');

    // Simulate 1.2s verification delay (like real reCAPTCHA)
    setTimeout(() => {
        cb.classList.remove('loading');
        tick.classList.add('show');
        captchaBox.classList.add('verified');
        state[prefix].captchaDone = true;

        status.textContent = '✓ Verified — you are human!';
        status.className = 'captcha-status success';

        // Enable send OTP button
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';

        showNotification('CAPTCHA verified successfully', 'success');
    }, 1200);
}

/* ────────────────────────────────────────────
   OTP GENERATION (6-digit random for demo)
──────────────────────────────────────────── */
function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

/* ────────────────────────────────────────────
   SEND OTP
──────────────────────────────────────────── */
function sendOTP(prefix) {
    const phoneInput = document.getElementById(`${prefix}-phone`);
    const phone = phoneInput.value.trim();

    // Validate phone
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        phoneInput.style.borderColor = 'var(--error)';
        showNotification('Enter a valid 10-digit mobile number starting with 6-9', 'error');
        phoneInput.focus();
        return;
    }
    phoneInput.style.borderColor = '';

    if (!state[prefix].captchaDone) {
        showNotification('Please complete the CAPTCHA first', 'warning');
        return;
    }

    // For sign up, validate required fields
    if (prefix === 'su') {
        const name = document.getElementById('su-name').value.trim();
        const stateVal = document.getElementById('su-state').value;
        if (!name || !stateVal) {
            showNotification('Full Name and State are required', 'error');
            return;
        }
    }

    // Generate OTP
    const otp = generateOTP();
    state[prefix].generatedOTP = otp;

    // Show OTP in demo hint
    document.getElementById(`${prefix}-demo-otp`).textContent = otp;

    // Show step 2
    document.getElementById(`${prefix}-step1`).style.display = 'none';
    document.getElementById(`${prefix}-step2`).style.display = 'block';
    document.getElementById(`${prefix}-phone-display`).textContent = `+91 ${phone.replace(/(\d{5})(\d{5})/, '$1 $2')}`;

    // Try Web OTP API (auto-fill from SMS on Android Chrome)
    tryWebOTP(prefix, otp);

    // Start resend timer
    startResendTimer(prefix);

    // Focus first OTP box
    const boxes = document.querySelectorAll(`#${prefix}-otp-boxes .otp-input`);
    setTimeout(() => boxes[0]?.focus(), 300);

    // Set up OTP box navigation
    setupOTPBoxes(prefix);

    state[prefix].otpSent = true;
    showNotification(`OTP sent to +91 ${phone.slice(0,5)}XXXXX (demo: ${otp})`, 'success');
}

/* ────────────────────────────────────────────
   WEB OTP API — auto-fill from SMS
   Works on Android Chrome when page is served
   over HTTPS and SMS format matches spec
──────────────────────────────────────────── */
async function tryWebOTP(prefix) {
    if (!('OTPCredential' in window)) return; // not supported

    try {
        const ac = new AbortController();
        const otp = await navigator.credentials.get({
            otp: { transport: ['sms'] },
            signal: ac.signal
        });

        if (otp && otp.code) {
            fillOTPBoxes(prefix, otp.code);
            showNotification('OTP auto-filled from SMS', 'success');
        }
    } catch (err) {
        // Silently ignore — user can type manually
        console.log('Web OTP API:', err.message);
    }
}

/* Fill all 6 boxes from a string */
function fillOTPBoxes(prefix, code) {
    const boxes = document.querySelectorAll(`#${prefix}-otp-boxes .otp-input`);
    [...code].forEach((char, i) => {
        if (boxes[i]) {
            boxes[i].value = char;
            boxes[i].classList.add('filled');
        }
    });
}

/* ────────────────────────────────────────────
   OTP BOX KEYBOARD NAVIGATION
──────────────────────────────────────────── */
function setupOTPBoxes(prefix) {
    const boxes = document.querySelectorAll(`#${prefix}-otp-boxes .otp-input`);

    boxes.forEach((box, idx) => {
        // Clear any previous listeners
        box.replaceWith(box.cloneNode(true));
    });

    // Re-query after replace
    const freshBoxes = document.querySelectorAll(`#${prefix}-otp-boxes .otp-input`);

    freshBoxes.forEach((box, idx) => {
        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val.slice(-1); // keep only last digit

            if (val) {
                e.target.classList.add('filled');
                e.target.classList.remove('error');
                // Move to next
                if (idx < freshBoxes.length - 1) freshBoxes[idx + 1].focus();
            } else {
                e.target.classList.remove('filled');
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                freshBoxes[idx - 1].focus();
                freshBoxes[idx - 1].value = '';
                freshBoxes[idx - 1].classList.remove('filled');
            }
            // Allow paste
            if (e.key === 'v' && (e.ctrlKey || e.metaKey)) return;
        });

        // Handle paste on any box
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            if (pasted.length >= 6) {
                fillOTPBoxes(prefix, pasted.slice(0, 6));
                freshBoxes[5].focus();
            }
        });
    });
}

/* ────────────────────────────────────────────
   VERIFY OTP
──────────────────────────────────────────── */
function verifyOTP(prefix) {
    const boxes = document.querySelectorAll(`#${prefix}-otp-boxes .otp-input`);
    const enteredOTP = [...boxes].map(b => b.value).join('');

    if (enteredOTP.length < 6) {
        boxes.forEach(b => b.classList.add('error'));
        showNotification('Please enter all 6 digits', 'error');
        return;
    }

    if (enteredOTP !== state[prefix].generatedOTP) {
        boxes.forEach(b => { b.classList.add('error'); b.classList.remove('filled'); });
        showNotification('Incorrect OTP. Please try again.', 'error');
        setTimeout(() => {
            boxes.forEach(b => b.classList.remove('error'));
            boxes[0].focus();
        }, 1000);
        return;
    }

    // OTP correct — show loading
    const btn = document.getElementById(`${prefix}-verify-btn`);
    btn.disabled = true;
    btn.classList.add('loading');

    setTimeout(() => {
        if (prefix === 'si') {
            completeSignIn();
        } else {
            completeSignUp();
        }
    }, 800);
}

/* ────────────────────────────────────────────
   COMPLETE SIGN IN
──────────────────────────────────────────── */
function completeSignIn() {
    const phone = document.getElementById('si-phone').value.trim();

    // Check if farmer is registered
    let farmers = JSON.parse(localStorage.getItem('kisan_farmers') || '{}');
    const farmerData = farmers[phone];

    if (!farmerData) {
        // Farmer not registered — nudge to sign up
        showNotification('No account found. Please sign up first.', 'error');
        document.getElementById('si-verify-btn').disabled = false;
        document.getElementById('si-verify-btn').classList.remove('loading');
        setTimeout(() => switchTab('signup'), 1500);
        return;
    }

    // Save session
    saveSession(phone, farmerData);
    showNotification(`Welcome back, ${farmerData.name}!`, 'success');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

/* ────────────────────────────────────────────
   COMPLETE SIGN UP
──────────────────────────────────────────── */
function completeSignUp() {
    const phone    = document.getElementById('su-phone').value.trim();
    const name     = document.getElementById('su-name').value.trim();
    const stateVal = document.getElementById('su-state').value;
    const district = document.getElementById('su-district').value.trim();
    const village  = document.getElementById('su-village').value.trim();
    const aadhaar  = document.getElementById('su-aadhaar').value.trim();
    const crop     = document.getElementById('su-crop').value;

    // Build farmer record
    const farmerData = {
        name, phone, state: stateVal, district, village,
        aadhaar: aadhaar ? aadhaar.replace(/\s/g, '') : '',
        primaryCrop: crop,
        registeredAt: new Date().toISOString()
    };

    // Save to "database" (localStorage)
    let farmers = JSON.parse(localStorage.getItem('kisan_farmers') || '{}');
    farmers[phone] = farmerData;
    localStorage.setItem('kisan_farmers', JSON.stringify(farmers));

    // Save session
    saveSession(phone, farmerData);
    showNotification(`Account created! Welcome, ${name}!`, 'success');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

/* ────────────────────────────────────────────
   SESSION
──────────────────────────────────────────── */
function saveSession(phone, farmerData) {
    const session = {
        phone,
        name: farmerData.name,
        state: farmerData.state,
        primaryCrop: farmerData.primaryCrop,
        loginAt: new Date().toISOString()
    };
    localStorage.setItem('kisan_session', JSON.stringify(session));
    localStorage.setItem('preferredLanguage', 'en');
}

/* ────────────────────────────────────────────
   RESEND OTP TIMER
──────────────────────────────────────────── */
function startResendTimer(prefix) {
    let seconds = 30;
    const timerEl = document.getElementById(`${prefix}-timer`);
    const resendWrap = document.getElementById(`${prefix}-resend-wrap`);
    const resendBtn  = document.getElementById(`${prefix}-resend-btn`);

    resendWrap.style.display = 'inline';
    resendBtn.style.display = 'none';

    if (state[prefix].timerInterval) clearInterval(state[prefix].timerInterval);

    state[prefix].timerInterval = setInterval(() => {
        seconds--;
        timerEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(state[prefix].timerInterval);
            resendWrap.style.display = 'none';
            resendBtn.style.display = 'inline';
        }
    }, 1000);
}

function resendOTP(prefix) {
    const otp = generateOTP();
    state[prefix].generatedOTP = otp;
    document.getElementById(`${prefix}-demo-otp`).textContent = otp;

    // Clear boxes
    document.querySelectorAll(`#${prefix}-otp-boxes .otp-input`).forEach(b => {
        b.value = '';
        b.classList.remove('filled', 'error');
    });

    startResendTimer(prefix);
    showNotification(`New OTP: ${otp} (demo)`, 'success');

    const phone = document.getElementById(`${prefix}-phone`).value.trim();
    document.getElementById(`${prefix}-phone-display`).textContent = `+91 ${phone.replace(/(\d{5})(\d{5})/, '$1 $2')}`;
}

/* ────────────────────────────────────────────
   BACK TO STEP 1
──────────────────────────────────────────── */
function backToStep1(prefix) {
    document.getElementById(`${prefix}-step1`).style.display = 'block';
    document.getElementById(`${prefix}-step2`).style.display = 'none';
    state[prefix].otpSent = false;
    if (state[prefix].timerInterval) clearInterval(state[prefix].timerInterval);
}

/* ────────────────────────────────────────────
   AADHAAR FORMATTING (XXXX XXXX XXXX)
──────────────────────────────────────────── */
const aadhaarInput = document.getElementById('su-aadhaar');
if (aadhaarInput) {
    aadhaarInput.addEventListener('input', function() {
        let val = this.value.replace(/\D/g, '').slice(0, 12);
        this.value = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    });
}

/* ────────────────────────────────────────────
   NOTIFICATION TOAST
──────────────────────────────────────────── */
function showNotification(message, type = 'info') {
    // Remove existing
    document.querySelectorAll('.auth-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'auth-toast';

    const colors = { success: '#2e7d32', error: '#c62828', warning: '#e65100', info: '#1565c0' };
    const icons  = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };

    Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', left: '50%',
        transform: 'translateX(-50%) translateY(80px)',
        background: colors[type] || colors.info,
        color: 'white',
        padding: '10px 18px',
        borderRadius: '24px',
        fontSize: '0.88rem',
        fontWeight: '500',
        fontFamily: 'Poppins, sans-serif',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: 'calc(100vw - 40px)',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        opacity: '0'
    });

    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(40px)';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

/* ────────────────────────────────────────────
   INIT — check if already logged in
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('kisan_session');
    if (session) {
        try {
            const s = JSON.parse(session);
            // Auto-redirect if session exists
            window.location.href = 'index.html';
            return;
        } catch (e) { /* bad session, continue */ }
    }

    // Phone number: only allow digits
    ['si-phone', 'su-phone'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 10);
        });
    });
});
