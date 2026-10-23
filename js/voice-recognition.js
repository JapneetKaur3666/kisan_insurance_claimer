/* ============================================
   VOICE RECOGNITION - Agent-Powered Version
   Uses API_BASE + getLang() + getVoiceLocale() + applyLanguage() from config.js
   ============================================ */
(function () {
    'use strict';

    /* ── DOM refs ────────────────────────────────────────── */
    const micBtn          = document.getElementById('micBtn');
    const soundWaves      = document.getElementById('soundWaves');
    const statusText      = document.getElementById('statusText');
    const recognizedSection = document.getElementById('recognizedSection');
    const recognizedText  = document.getElementById('recognizedText');
    const extractedAppNo  = document.getElementById('extractedAppNo');
    const extractedSeason = document.getElementById('extractedSeason');
    const extractedCrop   = document.getElementById('extractedCrop');
    const confirmBtn      = document.getElementById('confirmBtn');
    const retryBtn        = document.getElementById('retryBtn');
    const editBtn         = document.getElementById('editBtn');
    const voiceLanguage   = document.getElementById('voiceLanguage');
    const compatNotice    = document.getElementById('compatibilityNotice');
    const recentSearches  = document.getElementById('recentSearches');
    const recentList      = document.getElementById('recentSearchesList');
    const speakBtn        = document.getElementById('speakBtn');
    const autoSpeak       = document.getElementById('autoSpeak');
    const synth           = window.speechSynthesis;

    let isListening = false, transcript = '', isSpeaking = false;
    let silenceTimer = null;          // fires when farmer stops talking
    let recognition = null;
    let extractedData = { applicationNumber: null, season: null, crop: null };

    /* ── Language helpers (from config.js) ──────────────── */
    function lang()      { return typeof getLang         === 'function' ? getLang()         : (localStorage.getItem('preferredLanguage') === 'hi' ? 'hi' : 'en'); }
    function voiceLang() { return typeof getVoiceLocale  === 'function' ? getVoiceLocale()  : (lang() === 'hi' ? 'hi-IN' : 'en-IN'); }
    function tr(en, hi)  { return lang() === 'hi' ? hi : en; }

    /* ── i18n strings for this page ─────────────────────── */
    const UI = {
        tapToStart:   () => tr('Tap the microphone to start', 'माइक दबाएँ और बोलें'),
        listening:    () => tr('Listening… speak now!', 'सुन रहा हूँ… बोलिए!'),
        heard:        (t) => tr('Heard: "' + t + '"', 'सुना: "' + t + '"'),
        stopped:      () => tr('Stopped.', 'रुक गया।'),
        complete:     () => tr('Got it! ✅', 'समझ गया! ✅'),
        lowConf:      () => tr('Heard (low confidence) — please confirm', 'सुना (कम विश्वास) — कृपया पुष्टि करें'),
        noSpeech:     () => tr('No speech detected. Try again.', 'कोई आवाज़ नहीं आई। फिर कोशिश करें।'),
        noMic:        () => tr('Microphone not found.', 'माइक नहीं मिला।'),
        denied:       () => tr('Microphone permission denied.', 'माइक की अनुमति नहीं मिली।'),
        netErr:       () => tr('Network error.', 'नेटवर्क त्रुटि।'),
        notDetected:  () => tr('Not detected', 'नहीं मिला'),
        noText:       () => tr('No text to send. Please speak first.', 'कुछ नहीं सुना। पहले बोलें।'),
        noSpeak:      () => tr('Nothing to speak yet.', 'अभी कुछ नहीं है।'),
        connecting:   () => tr('Checking status…', 'स्थिति देख रहे हैं…'),
        appFound:     () => tr('Application number found. Tap Confirm.', 'आवेदन नंबर मिला। पुष्टि बटन दबाएँ।'),
        appNotFound:  () => tr('Could not find the application number. Please edit or re-speak.', 'आवेदन नंबर नहीं मिला। कृपया संपादित करें या दोबारा बोलें।'),
        editPrompt:   () => tr('Edit recognized text below, then tap the microphone to re-speak or press Confirm.', 'नीचे पहचाना गया टेक्स्ट सुधारें, फिर माइक दबाएँ या पुष्टि करें।'),
        langChanged:  () => tr('Language set to English', 'भाषा हिंदी में बदल दी'),
    };

    /* ── TTS ─────────────────────────────────────────────── */
    function speakText(text, l) {
        l = l || voiceLang();
        if (!('speechSynthesis' in window) || !text) return;
        if (synth.speaking) synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = l; u.rate = 0.88; u.pitch = 1.0; u.volume = 1.0;
        u.onstart = () => {
            isSpeaking = true;
            if (speakBtn) { speakBtn.classList.add('speaking'); speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> ' + tr('Speaking…', 'बोल रहा हूँ…'); }
        };
        u.onend = () => {
            isSpeaking = false;
            if (speakBtn) { speakBtn.classList.remove('speaking'); speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> ' + tr('Hear What We Understood', 'सुनें क्या समझा'); }
        };
        synth.speak(u);
    }

    /* ── Speech Recognition — continuous with silence timer ── */
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
        recognition = new SR();
        recognition.continuous    = true;   // keep listening until farmer pauses
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = voiceLang();

        recognition.onstart = () => {
            isListening = true;
            if (statusText) statusText.textContent = UI.listening();
            if (micBtn) micBtn.setAttribute('data-listening', 'true');
            if (soundWaves) soundWaves.style.display = 'flex';
            clearTimeout(silenceTimer);
        };

        recognition.onresult = (e) => {
            // Collect ALL results (interim + final)
            let full = '';
            for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
            transcript = full.trim();
            const conf = e.results[e.results.length - 1][0].confidence;

            if (statusText) statusText.textContent = UI.heard(transcript);
            updateConfidenceBar(conf);

            // Reset silence timer: stop recognition 2.5 s after farmer stops talking
            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                if (isListening) recognition.stop();
            }, 2500);
        };

        recognition.onerror = (e) => {
            const msgs = { 'no-speech': UI.noSpeech(), 'audio-capture': UI.noMic(), 'not-allowed': UI.denied(), 'network': UI.netErr() };
            if (statusText) statusText.textContent = msgs[e.error] || ('Error: ' + e.error);
            resetUI();
        };

        recognition.onend = () => {
            clearTimeout(silenceTimer);
            isListening = false;
            if (micBtn) micBtn.setAttribute('data-listening', 'false');
            if (soundWaves) soundWaves.style.display = 'none';
            if (transcript && transcript.length > 1) {
                const conf = 0.8; // confidence not available from onend
                processFinalTranscript(transcript, conf);
            } else {
                if (statusText) statusText.textContent = UI.tapToStart();
            }
        };
    } else {
        if (compatNotice) compatNotice.style.display = 'block';
    }

    /* ── Mic button ──────────────────────────────────────── */
    if (micBtn) micBtn.addEventListener('click', function () {
        if (!recognition) { alert(tr('Speech recognition not available.', 'स्पीच रिकग्निशन उपलब्ध नहीं है।')); return; }
        if (isListening) {
            clearTimeout(silenceTimer);
            recognition.stop();
            if (statusText) statusText.textContent = UI.stopped();
            resetUI();
        } else {
            transcript = '';
            try {
                recognition.lang = voiceLang();
                recognition.start();
            } catch (e) {
                if (statusText) statusText.textContent = tr('Error starting mic. Try again.', 'माइक शुरू नहीं हुआ। फिर कोशिश करें।');
            }
        }
    });

    /* Voice language selector → sync & restart if needed */
    if (voiceLanguage) voiceLanguage.addEventListener('change', function () {
        if (recognition && !isListening) recognition.lang = this.value;
        localStorage.setItem('preferredLanguage', this.value.split('-')[0]);
        if (typeof applyLanguage === 'function') applyLanguage();
    });

    /* ── Process what was said ───────────────────────────── */
    function processFinalTranscript(text, confidence) {
        if (recognizedText) recognizedText.textContent = text;
        if (recognizedSection) recognizedSection.style.display = 'block';
        extractedData = extractInformation(text);
        updateExtractedInfo(extractedData);
        saveToRecentSearches(text, extractedData);
        displayRecentSearches();

        if (statusText) statusText.textContent = confidence > 0.7 ? UI.complete() : UI.lowConf();

        if (autoSpeak && autoSpeak.checked) {
            const msg = extractedData.applicationNumber ? UI.appFound() : UI.appNotFound();
            setTimeout(() => speakText(msg, voiceLang()), 500);
        }
    }

    /* ── Entity extraction ───────────────────────────────── */

    /**
     * Step 1: Normalize the raw speech-to-text string so downstream regexes work.
     * Handles:
     *  - Devanagari digits → ASCII (०→0 … ९→9)
     *  - "के आर बी" / "केआरबी" / "k r b" → "KRB"
     *  - Strip non-digit garbage fused onto numbers ("00417ग्राफ" → "00417")
     */
    function normalizeText(raw) {
        if (!raw) return '';
        const deva = {'०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9'};
        let t = raw.replace(/[०-९]/g, function(d) { return deva[d] || d; });
        // Hindi "के आर बी" → KRB
        t = t.replace(/के\s*[\.\-]?\s*आर\s*[\.\-]?\s*बी/gi, 'KRB');
        t = t.replace(/\bk\s+r\s+b\b/gi, 'KRB');
        // Strip non-alphanumeric characters fused to the end of a 5-digit number
        // e.g. "00417ग्राफ" → "00417"
        t = t.replace(/(\d{5})[\u0900-\u097F\u0A00-\u0A7F]+/g, '$1');
        return t;
    }

    /**
     * Step 2: Extract application number, season, crop from normalized text.
     * NOTE: The display boxes are just visual feedback — the full raw transcript
     * is always sent to the backend agent which uses the Python NLU for accurate extraction.
     */
    function extractInformation(rawText) {
        const data = { applicationNumber: null, season: null, crop: null };
        const text = normalizeText(rawText || '');

        /* ── Application number ──────────────────────────── */
        // Full KRB format: KRB-2026-00417, KRB 2026 00417
        let krbMatch = text.match(/KRB[-\s]?(\d{4})[-\s]?(\d{5})/i);
        if (krbMatch) {
            data.applicationNumber = 'KRB-' + krbMatch[1] + '-' + krbMatch[2];
        } else {
            // 9 digits starting with 20xx: 202600417 → KRB-2026-00417
            let nineMatch = text.match(/\b(20\d{2})\s*[-]?\s*(\d{5})\b/);
            if (nineMatch) {
                data.applicationNumber = 'KRB-' + nineMatch[1] + '-' + nineMatch[2];
            } else {
                // Exactly 5 digits alone → KRB-2026-NNNNN
                let fiveMatch = text.match(/(?<![0-9])(\d{5})(?![0-9])/);
                if (fiveMatch) {
                    data.applicationNumber = 'KRB-2026-' + fiveMatch[1];
                }
            }
        }

        /* ── Season ──────────────────────────────────────── */
        // All spoken/written variants including Hinglish transliterations
        var seasonMap = [
            { re: /\b(kharif|kharip|kharib|खरीफ|ख़रीफ़|खारिफ|खरिफ|खारिफ़|खरीप)\b/i, val: 'Kharif' },
            { re: /\b(rabi|rabbi|rabi|रबी|रब्बी|रबि|रबी)\b/i,                         val: 'Rabi' },
            { re: /\b(zaid|zayad|jayad|जायद|ज़ायद|जायद|जाइद)\b/i,                     val: 'Zaid' },
        ];
        for (var si = 0; si < seasonMap.length; si++) {
            if (seasonMap[si].re.test(text)) { data.season = seasonMap[si].val; break; }
        }

        /* ── Crop ────────────────────────────────────────── */
        // All spoken/written/Hinglish variants
        var cropMap = [
            { re: /\b(paddy|rice|dhan|dhaan|धान|चावल|पैडी|राइस)\b/i,                          val: 'Paddy' },
            { re: /\b(wheat|gehu|gehun|gehoon|गेहूं|गेहूँ|गेहु|व्हीट|वीट|गेहूं|गेहू)\b/i,    val: 'Wheat' },
            { re: /\b(cotton|kapas|कपास|कॉटन)\b/i,                                              val: 'Cotton' },
            { re: /\b(sugarcane|sugar\s*cane|ganna|गन्ना|गन्ने|सुगरकेन)\b/i,                   val: 'Sugarcane' },
            { re: /\b(maize|corn|makka|मक्का|मक्के|मेज़|मक्का)\b/i,                            val: 'Maize' },
            { re: /\b(mustard|sarson|सरसों|सरसो|मस्टर्ड)\b/i,                                  val: 'Mustard' },
            { re: /\b(soybean|soyabean|soya|सोयाबीन|सोया)\b/i,                                  val: 'Soybean' },
            { re: /\b(bajra|bajri|बाजरा|बाजरे)\b/i,                                             val: 'Bajra' },
            { re: /\b(gram|chana|chanaa|चना|चने|चनो)\b/i,                                       val: 'Gram' },
            { re: /\b(groundnut|peanut|mungfali|मूंगफली|मूँगफली)\b/i,                          val: 'Groundnut' },
        ];
        for (var ci = 0; ci < cropMap.length; ci++) {
            if (cropMap[ci].re.test(text)) { data.crop = cropMap[ci].val; break; }
        }

        return data;
    }

    function updateExtractedInfo(data) {
        const nd = UI.notDetected();
        if (extractedAppNo) { extractedAppNo.textContent = data.applicationNumber || nd; extractedAppNo.style.color = data.applicationNumber ? 'var(--primary-green)' : 'var(--error)'; }
        if (extractedSeason) { extractedSeason.textContent = data.season || nd; extractedSeason.style.color = data.season ? 'var(--primary-green)' : 'var(--error)'; }
        if (extractedCrop) { extractedCrop.textContent = data.crop || nd; extractedCrop.style.color = data.crop ? 'var(--primary-green)' : 'var(--error)'; }
    }

    function updateConfidenceBar(confidence) {
        const bar = document.getElementById('confidenceBar'), fill = bar && bar.querySelector('.confidence-fill');
        if (!bar || !fill) return;
        bar.style.display = 'block';
        fill.style.width = (confidence * 100) + '%';
        fill.style.background = confidence > 0.8 ? '#4CAF50' : confidence > 0.6 ? '#FFC107' : '#FF5722';
    }

    /* ── Confirm button ──────────────────────────────────── */
    let agentSessionId = localStorage.getItem('kisan_session_id') || null;
    async function initAgentSession() {
        try {
            const l = lang();
            const r = await fetch(API_BASE + '/api/session', { method: 'POST', headers: API_CONFIG.headers(), body: JSON.stringify({ lang: l }) });
            const d = await r.json();
            agentSessionId = d.session_id;
            localStorage.setItem('kisan_session_id', agentSessionId);
        } catch (e) { console.warn('Could not create agent session:', e); }
    }

    if (confirmBtn) confirmBtn.addEventListener('click', async function () {
        // Use the inline edit input value if the edit panel is open, else recognizedText
        const editInput = document.getElementById('editInput');
        const text = (editInput && editInput.style.display !== 'none' && editInput.value.trim())
            ? editInput.value.trim()
            : (recognizedText ? recognizedText.textContent.trim() : '');

        if (!text) { showNotification(UI.noText(), 'warning'); return; }
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + UI.connecting();
        if (!agentSessionId) await initAgentSession();
        const l = lang();
        try {
            const resp = await fetch(API_BASE + '/api/chat', {
                method: 'POST', headers: API_CONFIG.headers(),
                body: JSON.stringify({ session_id: agentSessionId, text, lang: l })
            });
            const data = await resp.json();
            showAgentReply(data.reply || '');
            if (data.reply) speakText(data.reply, voiceLang());
            // close edit panel after sending
            hideEditPanel();
            let appNo = null;
            if (data.claim && data.claim.app_no) appNo = data.claim.app_no;
            else if (data.entities && data.entities.app_no) appNo = data.entities.app_no;
            else if (extractedData.applicationNumber) appNo = extractedData.applicationNumber;
            if (appNo && data.state !== 'COLLECT') {
                localStorage.setItem('searchQuery', JSON.stringify({ applicationNumber: appNo, timestamp: new Date().toISOString() }));
                setTimeout(() => window.location.href = 'dashboard.html?app=' + encodeURIComponent(appNo) + '&sid=' + encodeURIComponent(agentSessionId), 1800);
            } else {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-check"></i> ' + tr('Confirm & Check Status', 'पुष्टि करें');
            }
        } catch (e) {
            if (extractedData.applicationNumber) {
                showNotification(tr('Connecting to dashboard…', 'डैशबोर्ड खोल रहे हैं…'), 'info');
                setTimeout(() => window.location.href = 'dashboard.html?app=' + extractedData.applicationNumber, 800);
            } else {
                showNotification(tr('Could not connect. Try again.', 'कनेक्ट नहीं हो पाया। फिर कोशिश करें।'), 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-check"></i> ' + tr('Confirm & Check Status', 'पुष्टि करें');
            }
        }
    });

    /* ── Edit button — inline panel with mic ─────────────── */
    function showEditPanel() {
        let panel = document.getElementById('editPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'editPanel';
            panel.className = 'edit-panel';
            panel.innerHTML =
                '<p class="edit-hint"><i class="fas fa-pencil-alt"></i> <span id="editHintText"></span></p>' +
                '<div class="edit-row">' +
                '  <textarea id="editInput" rows="2" class="edit-textarea" maxlength="300"></textarea>' +
                '  <button type="button" id="editMicBtn" class="edit-mic-btn" title="' + tr('Speak to edit', 'बोलकर सुधारें') + '">' +
                '    <i class="fas fa-microphone"></i>' +
                '  </button>' +
                '</div>' +
                '<button type="button" id="editDoneBtn" class="btn btn-confirm" style="margin-top:10px;width:100%">' +
                '  <i class="fas fa-check"></i> <span id="editDoneText"></span>' +
                '</button>';
            const sec = document.querySelector('.recognized-section');
            if (sec) sec.insertAdjacentElement('afterend', panel);
        }
        // Fill texts in current language
        document.getElementById('editHintText').textContent = UI.editPrompt();
        document.getElementById('editInput').value = recognizedText ? recognizedText.textContent : '';
        document.getElementById('editDoneText').textContent = tr('Done — Confirm Status', 'हो गया — स्थिति जाँचें');
        panel.style.display = 'block';

        // Wire edit-mic button
        const editMicBtn = document.getElementById('editMicBtn');
        if (editMicBtn) {
            editMicBtn.onclick = function () {
                if (!recognition) return;
                if (isListening) { recognition.stop(); return; }
                transcript = '';
                recognition.lang = voiceLang();
                // Override onend for edit mode: put result into editInput
                const origOnend = recognition.onend;
                recognition.onend = () => {
                    clearTimeout(silenceTimer);
                    isListening = false;
                    editMicBtn.classList.remove('listening');
                    if (micBtn) micBtn.setAttribute('data-listening', 'false');
                    if (soundWaves) soundWaves.style.display = 'none';
                    if (transcript) {
                        const inp = document.getElementById('editInput');
                        if (inp) inp.value = transcript;
                        extractedData = extractInformation(transcript);
                        updateExtractedInfo(extractedData);
                    }
                    recognition.onend = origOnend; // restore
                };
                editMicBtn.classList.add('listening');
                try { recognition.start(); } catch (e) { /* already running */ }
            };
        }

        // Wire done button
        const editDoneBtn = document.getElementById('editDoneBtn');
        if (editDoneBtn) {
            editDoneBtn.onclick = () => {
                const inp = document.getElementById('editInput');
                const val = inp && inp.value.trim();
                if (val) {
                    if (recognizedText) recognizedText.textContent = val;
                    extractedData = extractInformation(val);
                    updateExtractedInfo(extractedData);
                }
                hideEditPanel();
                if (confirmBtn) confirmBtn.click();
            };
        }

        const inp = document.getElementById('editInput');
        if (inp) inp.focus();
    }

    function hideEditPanel() {
        const panel = document.getElementById('editPanel');
        if (panel) panel.style.display = 'none';
    }

    if (editBtn) editBtn.addEventListener('click', () => {
        const panel = document.getElementById('editPanel');
        if (panel && panel.style.display !== 'none') { hideEditPanel(); }
        else { showEditPanel(); }
    });

    /* ── Agent reply box ─────────────────────────────────── */
    function showAgentReply(text) {
        let box = document.getElementById('agentReplyBox');
        if (box) { box.querySelector('p').textContent = text; return; }
        box = document.createElement('div');
        box.id = 'agentReplyBox';
        box.className = 'agent-reply-box';
        box.innerHTML = '<i class="fas fa-robot" style="color:var(--primary-green);flex-shrink:0"></i><p style="margin:0">' + text + '</p>';
        Object.assign(box.style, { background: '#e8f5e9', border: '2px solid #2e7d32', borderRadius: '12px', padding: '12px 16px', margin: '12px 0', display: 'flex', alignItems: 'flex-start', gap: '10px' });
        const sec = document.querySelector('.recognized-section');
        if (sec) sec.insertAdjacentElement('afterbegin', box);
    }

    /* ── Retry button ────────────────────────────────────── */
    if (retryBtn) retryBtn.addEventListener('click', () => {
        if (recognizedSection) recognizedSection.style.display = 'none';
        transcript = '';
        extractedData = { applicationNumber: null, season: null, crop: null };
        if (statusText) statusText.textContent = UI.tapToStart();
        const rb = document.getElementById('agentReplyBox'); if (rb) rb.remove();
        hideEditPanel();
        if (recognition) setTimeout(() => { recognition.lang = voiceLang(); recognition.start(); }, 400);
    });

    /* ── Speak button ────────────────────────────────────── */
    if (speakBtn) speakBtn.addEventListener('click', () => {
        const text = recognizedText ? recognizedText.textContent : '';
        if (!text) { showNotification(UI.noSpeak(), 'warning'); return; }
        if (isSpeaking) { synth.cancel(); return; }
        speakText(text, voiceLang());
    });

    /* ── Auto-speak preference ───────────────────────────── */
    if (autoSpeak) {
        const sv = localStorage.getItem('autoSpeak');
        if (sv !== null) autoSpeak.checked = sv === 'true';
        autoSpeak.addEventListener('change', function () { localStorage.setItem('autoSpeak', this.checked); });
    }

    /* ── Recent searches ─────────────────────────────────── */
    function saveToRecentSearches(text, data) {
        try {
            let s = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            s.unshift({ text, data, timestamp: new Date().toISOString() });
            s = s.slice(0, 5);
            localStorage.setItem('recentSearches', JSON.stringify(s));
        } catch (e) { /* */ }
    }

    function displayRecentSearches() {
        try {
            const s = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            if (!recentSearches || !recentList) return;
            if (!s.length) { recentSearches.style.display = 'none'; return; }
            recentSearches.style.display = 'block';
            recentList.innerHTML = '';
            s.forEach(sr => {
                const it = document.createElement('div'); it.className = 'recent-item';
                it.innerHTML = '<div><strong>' + (sr.data.applicationNumber || 'N/A') + '</strong><span> — ' + sr.text.substring(0, 50) + '…</span></div><small>' + formatTimestamp(sr.timestamp) + '</small>';
                it.addEventListener('click', () => {
                    if (recognizedText) recognizedText.textContent = sr.text;
                    extractedData = sr.data;
                    updateExtractedInfo(extractedData);
                    if (recognizedSection) recognizedSection.style.display = 'block';
                });
                recentList.appendChild(it);
            });
        } catch (e) { /* */ }
    }

    function formatTimestamp(iso) {
        const d = new Date(iso), diff = Math.floor((new Date() - d) / 60000);
        return diff < 1 ? tr('Just now', 'अभी') : diff < 60 ? diff + tr(' min ago', ' मिनट पहले') : diff < 1440 ? Math.floor(diff / 60) + tr(' hours ago', ' घंटे पहले') : d.toLocaleDateString();
    }

    /* ── UI helpers ──────────────────────────────────────── */
    function resetUI() {
        if (micBtn) micBtn.setAttribute('data-listening', 'false');
        if (soundWaves) soundWaves.style.display = 'none';
        isListening = false;
    }

    function showNotification(message, type) {
        type = type || 'info';
        const n = document.createElement('div'); n.className = 'notification notification-' + type; n.textContent = message;
        const colors = { success: '#4CAF50', error: '#D32F2F', warning: '#FFC107', info: '#2196F3' };
        Object.assign(n.style, { position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: '10000', maxWidth: '400px', animation: 'slideInRight 0.4s ease' });
        n.style.backgroundColor = colors[type] || colors.info;
        document.body.appendChild(n);
        setTimeout(() => { n.style.animation = 'slideOutRight 0.4s ease'; setTimeout(() => n.remove(), 400); }, 3500);
    }

    /* ── DOMContentLoaded ────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        const sl = localStorage.getItem('preferredLanguage') || 'en';

        // Sync voice language select to stored lang (en/hi only)
        if (voiceLanguage) {
            voiceLanguage.value = sl === 'hi' ? 'hi-IN' : 'en-IN';
            if (recognition) recognition.lang = voiceLanguage.value;
        }

        // Apply all page translations
        if (typeof applyLanguage === 'function') applyLanguage();

        // Update status text in correct language
        if (statusText) statusText.textContent = UI.tapToStart();

        // Update example phrases
        const isHI = sl === 'hi';
        const ex = document.querySelectorAll('.example-item p');
        if (ex[0]) ex[0].textContent = isHI ? '"KRB-2026-00417 का स्टेटस बताओ"' : '"KRB-2026-00417 ka status batao"';
        if (ex[1]) ex[1].textContent = isHI ? '"KRB-2026-00521 में कौन सा कागज़ बाकी है"' : '"What documents are missing for KRB-2026-00521"';
        if (ex[2]) ex[2].textContent = isHI ? '"KRB-2026-00748 क्या पैसा आया"' : '"Has my money come for KRB-2026-00748"';

        // Update button labels
        if (confirmBtn) confirmBtn.innerHTML = '<i class="fas fa-check"></i> ' + tr('Confirm & Check Status', 'पुष्टि करें');
        if (retryBtn)   retryBtn.innerHTML   = '<i class="fas fa-redo"></i> '  + tr('Try Again', 'फिर बोलें');
        if (editBtn)    editBtn.innerHTML    = '<i class="fas fa-edit"></i> '  + tr('Edit / Re-speak', 'सुधारें / दोबारा बोलें');

        initAgentSession();
        displayRecentSearches();

        // Welcome prompt
        setTimeout(() => {
            const msg = isHI
                ? 'माइक दबाएँ और अपना आवेदन नंबर बोलें।'
                : 'Press the microphone and speak your application number.';
            speakText(msg, voiceLanguage ? voiceLanguage.value : 'en-IN');
        }, 900);
    });
})();