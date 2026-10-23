/* ============================================================
   Shared API configuration + i18n (EN/HI only)
   Loaded FIRST on every page.
   ============================================================ */
'use strict';

const API_BASE = 'http://localhost:8000';

const API_CONFIG = {
    base: API_BASE,
    headers() {
        const token = localStorage.getItem('kisan_token');
        const h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = `Bearer ${token}`;
        return h;
    }
};

// ── Language helpers ────────────────────────────────────────
/** Returns 'en' or 'hi' (only two supported languages). */
function getLang() {
    const l = localStorage.getItem('preferredLanguage') || 'en';
    return l === 'hi' ? 'hi' : 'en';
}

/** Returns BCP-47 locale for Web Speech API. */
function getVoiceLocale() {
    return getLang() === 'hi' ? 'hi-IN' : 'en-IN';
}

/** Pick English or Hindi string. Usage: t('Status', 'स्थिति') */
function t(en, hi) {
    return getLang() === 'hi' ? hi : en;
}

// ── Page-level translations applied on language switch ──────
const PAGE_STRINGS = {
    // index.html
    'hero-title':        { en: 'Welcome, Farmer! 🌾', hi: 'स्वागत है, किसान! 🌾' },
    'hero-subtitle':     { en: 'Check your crop insurance claim status instantly', hi: 'अपने फसल बीमा दावे की स्थिति तुरंत जानें' },
    'hero-description':  { en: 'Use voice or type to track your application', hi: 'आवाज़ से या टाइप करके आवेदन ट्रैक करें' },
    'how-to-title':      { en: 'How to check your claim:', hi: 'दावा कैसे देखें:' },
    // voice-input.html
    'voice-page-title':  { en: '🎤 Voice Input', hi: '🎤 आवाज़ से बोलें' },
    'voice-page-sub':    { en: 'Speak clearly to check your claim status', hi: 'अपनी दावे की स्थिति जानने के लिए स्पष्ट बोलें' },
    'status-prompt':     { en: 'Tap the microphone to start', hi: 'माइक दबाएँ और बोलें' },
    // manual-entry.html
    'manual-page-title': { en: '📝 Manual Entry', hi: '📝 जानकारी दर्ज करें' },
    'manual-page-sub':   { en: 'Enter your details to check claim status', hi: 'दावे की स्थिति जानने के लिए जानकारी भरें' },
    // dashboard.html
    'dash-title':        { en: 'Claim Status Dashboard', hi: 'दावा स्थिति डैशबोर्ड' },
    'lbl-app-number':    { en: 'Application Number:', hi: 'आवेदन संख्या:' },
    'lbl-season':        { en: 'Season:', hi: 'सीज़न:' },
    'lbl-crop':          { en: 'Crop:', hi: 'फसल:' },
    'lbl-app-date':      { en: 'Application Date:', hi: 'आवेदन दिनांक:' },
    'lbl-last-updated':  { en: 'Last updated:', hi: 'आखिरी अपडेट:' },
    'btn-hear-status':   { en: '🔊 Hear Status Summary', hi: '🔊 स्थिति सुनें' },
    'lbl-auto-speak':    { en: 'Auto-speak updates', hi: 'अपडेट स्वचालित सुनें' },
    'section-timeline':  { en: '📋 Claim Processing Timeline', hi: '📋 दावा प्रक्रिया की स्थिति' },
    'section-docs':      { en: '📄 Required Documents', hi: '📄 ज़रूरी दस्तावेज़' },
    'section-actions':   { en: '⚡ Quick Actions', hi: '⚡ त्वरित कार्य' },
    'section-info':      { en: 'ℹ️ Important Information', hi: 'ℹ️ ज़रूरी जानकारी' },
    // conversation bar
    'chat-placeholder':  { en: "Ask a question...", hi: "कुछ पूछें..." },
    'btn-status':        { en: 'Status', hi: 'स्थिति' },
    'btn-documents':     { en: 'Documents', hi: 'दस्तावेज़' },
    'btn-fix-season':    { en: 'Fix Season', hi: 'सीज़न सुधारें' },
    'btn-help':          { en: 'Help', hi: 'मदद' },
    // tagline
    'tagline':           { en: 'Crop Insurance Claim Tracker', hi: 'फसल बीमा दावा ट्रैकर' },
};

/**
 * Apply translations to all elements with data-i18n attribute,
 * and to known selectors. Called on DOMContentLoaded and on language change.
 */
function applyLanguage() {
    const lang = getLang();

    // data-i18n attribute: <span data-i18n="hero-title"></span>
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (PAGE_STRINGS[key]) el.textContent = PAGE_STRINGS[key][lang];
    });

    // Sync the header language selector
    const sel = document.getElementById('languageSelect');
    if (sel && sel.value !== lang) sel.value = lang;

    // Sync voice language selector to match
    const vsel = document.getElementById('voiceLanguage');
    if (vsel) vsel.value = lang === 'hi' ? 'hi-IN' : 'en-IN';

    // Update chat placeholder
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.placeholder = lang === 'hi' ? 'कुछ पूछें या बोलें...' : 'Ask a question or speak...';

    // Update quick-option-btn msgs to match language
    const msgMap = {
        'what is my claim status':        { hi: 'मेरे क्लेम का स्टेटस बताओ' },
        'what documents are missing':     { hi: 'कौन सा कागज़ बाकी है' },
        'the season in my record is wrong': { hi: 'मेरा सीज़न गलत है' },
        'i need help':                    { hi: 'मुझे मदद चाहिए' }
    };
    document.querySelectorAll('.quick-option-btn[data-msg]').forEach(btn => {
        const engMsg = btn.getAttribute('data-msg-en') || btn.getAttribute('data-msg');
        btn.setAttribute('data-msg-en', engMsg); // persist original
        btn.setAttribute('data-msg', lang === 'hi' && msgMap[engMsg] ? msgMap[engMsg].hi : engMsg);
    });

    // Store lang
    localStorage.setItem('preferredLanguage', lang);
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
}
