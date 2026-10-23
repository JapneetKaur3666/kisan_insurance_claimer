/* ============================================
   DASHBOARD JAVASCRIPT - Unified Agent Version
   Uses API_BASE from js/config.js (port 8000)
   ============================================ */
(function() {
    'use strict';

    const synth = window.speechSynthesis;
    let isSpeaking = false;

    function speakText(text, lang) {
        lang = lang || 'en-IN';
        if (!('speechSynthesis' in window)) return;
        if (synth.speaking) synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang; utterance.rate = 0.9; utterance.pitch = 1.0; utterance.volume = 1.0;
        utterance.onstart = () => { isSpeaking = true; const btn = document.getElementById('voiceSummaryBtn'); if (btn) btn.innerHTML = '<i class="fas fa-volume-up"></i> Speaking...'; };
        utterance.onend = () => { isSpeaking = false; const btn = document.getElementById('voiceSummaryBtn'); if (btn) btn.innerHTML = '<i class="fas fa-volume-up"></i> Hear Status Summary'; };
        synth.speak(utterance);
    }

    function getVoiceLang() {
        // Uses getVoiceLocale() from config.js (en-IN or hi-IN only)
        return typeof getVoiceLocale === 'function' ? getVoiceLocale() : (localStorage.getItem('preferredLanguage') === 'hi' ? 'hi-IN' : 'en-IN');
    }

    /**
     * Build the spoken status summary.
     * Speaks ONLY the status, payment reason, and missing docs — NOT the app number, crop, or season.
     * Language: en-IN or hi-IN only.
     */
    function buildVoiceSummary(claim, lang) {
        const isHI = (lang || getVoiceLang()) === 'hi-IN';
        const missingDocs = (claim.documents || []).filter(d => d.status === 'Missing' || d.status === 'Pending').map(d => d.document_type);
        const n = missingDocs.length;

        // ── Status ──
        const statusLabels = {
            'Under Review':       { en: 'Your claim is currently under review.',        hi: 'आपके क्लेम की जाँच चल रही है।' },
            'Documents Pending':  { en: 'Your claim requires documents.',                hi: 'आपके क्लेम के लिए दस्तावेज़ चाहिए।' },
            'Approved':           { en: 'Your claim has been approved.',                 hi: 'आपका क्लेम मंज़ूर हो गया है।' },
            'Rejected':           { en: 'Your claim has been rejected.',                 hi: 'आपका क्लेम अस्वीकार हो गया है।' },
        };
        const statusMsg = (statusLabels[claim.claim_status] || { en: 'Status: ' + claim.claim_status, hi: 'स्थिति: ' + claim.claim_status })[isHI ? 'hi' : 'en'];

        // ── Payment ──
        let payMsg = '';
        if (claim.payment_status === 'Paid') {
            payMsg = isHI ? 'आपके खाते में पैसा आ गया है।' : 'Your money has been credited to your bank account.';
        } else if (claim.claim_status === 'Approved') {
            payMsg = isHI
                ? 'पैसा अभी तक आपके खाते में नहीं आया है। मंज़ूरी का मतलब यह नहीं कि पैसा मिल गया। बीमा कंपनी ने दावा स्वीकार किया है, लेकिन बैंक ट्रांसफर होने में थोड़ा समय और लगेगा। कृपया प्रतीक्षा करें।'
                : 'Your payment has NOT been credited yet. Approval means the insurance company accepted your claim, but the bank transfer is still pending. Please wait for the money to arrive in your account.';
        } else if (claim.claim_status === 'Rejected') {
            payMsg = isHI
                ? 'कृपया अस्वीकृति का कारण देखें और हेल्पलाइन से संपर्क करें।'
                : 'Please check the rejection reason and contact the helpline for assistance.';
        } else {
            payMsg = isHI ? 'अभी कोई भुगतान नहीं हुआ है।' : 'No payment has been made yet.';
        }

        // ── Missing documents ──
        let docMsg = '';
        if (n === 0) {
            docMsg = isHI ? 'सभी ज़रूरी दस्तावेज़ जमा हैं।' : 'All required documents have been submitted.';
        } else {
            if (isHI) {
                docMsg = 'आपके ' + n + ' दस्तावेज़ बाकी हैं। ';
                docMsg += missingDocs.map((d, i) => (i + 1) + ' नंबर: ' + d).join('। ') + '। ';
                docMsg += 'कृपया नीचे Upload बटन दबाकर अपलोड करें। फ़ोटो साफ़ और अच्छी रोशनी में लें।';
            } else {
                docMsg = 'You have ' + n + ' missing document' + (n > 1 ? 's' : '') + '. ';
                docMsg += missingDocs.map((d, i) => 'Number ' + (i + 1) + ': ' + d).join('. ') + '. ';
                docMsg += 'Please tap the Upload button below to submit each document. Take a clear photo in good light.';
            }
        }

        return statusMsg + ' ' + payMsg + ' ' + docMsg;
    }

    // ============================================
    // FETCH CLAIM
    // ============================================
    async function fetchClaimFromAPI(applicationNumber) {
        showLoadingState();
        try {
            const response = await fetch(API_BASE + '/api/claims/' + applicationNumber, { headers: API_CONFIG.headers() });
            if (!response.ok) {
                if (response.status === 404) showErrorState('No claim found for ' + applicationNumber + '. Please check and try again.');
                else showErrorState('Server error. Please try again.');
                return;
            }
            const json = await response.json();
            const claim = json.data;
            renderDashboard(claim);
            const autoSpeakEl = document.getElementById('autoSpeakDashboard');
            if (autoSpeakEl && autoSpeakEl.checked) setTimeout(() => speakText(buildVoiceSummary(claim, getVoiceLang()), getVoiceLang()), 1200);
        } catch (err) {
            showErrorState('Could not connect to the server on port 8000.');
        }
    }

    // ============================================
    // RENDER
    // ============================================
    function renderDashboard(claim) {
        hideLoadingState();
        document.getElementById('appNumber').textContent = claim.application_number;
        document.getElementById('season').textContent = claim.season + (claim.year && !claim.season.includes(claim.year) ? ' ' + claim.year : '');
        document.getElementById('crop').textContent = claim.crop;
        if (claim.created_at) document.getElementById('appDate').textContent = formatDate(new Date(claim.created_at));
        if (claim.updated_at) document.getElementById('lastUpdated').textContent = formatRelativeTime(new Date(claim.updated_at));
        const farmerEl = document.getElementById('farmerName');
        if (farmerEl) farmerEl.textContent = claim.farmer_name;
        renderStatusBadge(claim);
        if (claim.activities && claim.activities.length > 0) renderTimeline(claim.activities, claim.current_stage);
        if (claim.documents && claim.documents.length > 0) renderDocuments(claim.documents, claim.application_number);
        else if (claim.documents && claim.documents.length === 0) { const dl = document.querySelector('.documents-list'); if (dl) dl.innerHTML = '<p style="padding:12px;color:var(--text-light)">No missing documents. All clear!</p>'; }
        renderSidebarInfo(claim);
        renderTraceability(claim);
        if (claim.claim_status === 'Approved' && claim.payment_status !== 'Paid') showPaymentWarning();
        if (claim.assessment && claim.assessment.verdict === 'UNCERTAIN') showUncertainBanner(claim.assessment.reason || 'Some data is missing on the portal.');
    }

    function showPaymentWarning() {
        if (document.getElementById('paymentWarningBanner')) return;
        const b = document.createElement('div'); b.id = 'paymentWarningBanner'; b.className = 'payment-warning-banner';
        b.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Approved — payment NOT yet credited.</strong> I will only say "paid" when the portal confirms the credit. <em>मंज़ूरी का मतलब भुगतान नहीं।</em>';
        const s = document.querySelector('.app-header-section'); if (s) s.insertAdjacentElement('afterend', b);
    }

    function showUncertainBanner(reason) {
        if (document.getElementById('uncertainBanner')) return;
        const b = document.createElement('div'); b.id = 'uncertainBanner'; b.className = 'uncertain-banner';
        b.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <strong>UNCERTAIN</strong> — ' + reason + ' Book help for officer assistance.';
        const s = document.querySelector('.app-header-section'); if (s) s.insertAdjacentElement('afterend', b);
    }

    function renderTraceability(claim) {
        let tc = document.getElementById('traceabilityCard');
        if (!tc) {
            tc = document.createElement('div'); tc.id = 'traceabilityCard'; tc.className = 'info-card traceability-card';
            tc.innerHTML = '<h3 class="section-heading"><i class="fas fa-database"></i> Data Source</h3><div id="traceContent"></div>';
            const sidebar = document.querySelector('.sidebar-section'); if (sidebar) sidebar.appendChild(tc);
        }
        const c = document.getElementById('traceContent'); if (!c) return;
        const ist = claim.fetched_at ? new Date(claim.fetched_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' IST' : 'Just now';
        c.innerHTML = '<div class="trace-row"><span>Source:</span><code style="font-size:11px;word-break:break-all">' + (claim.source_url || '/portal/claims/' + claim.application_number) + '</code></div>'
            + '<div class="trace-row"><span>Fetched:</span><span>' + ist + '</span></div>'
            + '<div class="trace-row"><span>Record v:</span><span>' + (claim.record_version || 1) + '</span></div>';
    }

    function renderStatusBadge(claim) {
        const badge = document.getElementById('statusBadge'); if (!badge) return;
        badge.className = 'status-badge';
        const m = { 'Approved': { cls: 'status-approved', icon: 'fa-check-circle' }, 'Under Review': { cls: 'status-pending', icon: 'fa-clock' }, 'Documents Pending': { cls: 'status-action', icon: 'fa-exclamation-triangle' }, 'Rejected': { cls: 'status-rejected', icon: 'fa-times-circle' } };
        const s = m[claim.claim_status] || { cls: 'status-pending', icon: 'fa-clock' };
        badge.classList.add(s.cls);
        badge.innerHTML = '<i class="fas ' + s.icon + '"></i> <span id="statusText">' + claim.claim_status + '</span>';
    }

    function renderTimeline(activities, currentStage) {
        const tl = document.querySelector('.timeline'); if (!tl) return;
        tl.innerHTML = '';
        activities.slice().sort((a, b) => a.stage_number - b.stage_number).forEach(act => {
            const done = act.status === 'Completed', fail = act.status === 'Failed', cur = act.stage_number === currentStage && !done && !fail;
            const cls = 'timeline-item ' + (fail ? 'rejected' : done ? 'completed' : cur ? 'current' : 'pending');
            const icon = fail ? 'fa-times' : done ? 'fa-check' : cur ? 'fa-sync fa-spin' : 'fa-circle';
            const date = cur ? 'In Progress' : done ? 'Completed' : fail ? 'Rejected' : 'Pending';
            tl.innerHTML += '<div class="' + cls + '"><div class="timeline-marker"><i class="fas ' + icon + '"></i></div><div class="timeline-content"><h4>' + act.stage_name + '</h4><span class="timeline-date">' + date + '</span></div></div>';
        });
    }

    // Map portal doc names to sample images and quality tips
    const DOC_SAMPLES = {
        'Land Record (Khatauni)': { img: 'web/samples/land_record_sample.png', hint: 'This is a land ownership certificate (Khatauni/7-12). It should show your name, village, and land area clearly.', hintHI: 'यह जमीन का मालिकाना प्रमाण (खतौनी/7-12) है। इसमें आपका नाम, गाँव और जमीन का क्षेत्रफल स्पष्ट दिखना चाहिए।' },
        'Aadhaar Card': { img: 'web/samples/aadhaar_card_sample.png', hint: 'Your Aadhaar card. Both sides should be visible, name and 12-digit number must be clear.', hintHI: 'आपका आधार कार्ड। दोनों तरफ स्पष्ट होनी चाहिए, नाम और 12 अंकों का नंबर पढ़ने योग्य होना चाहिए।' },
        'PAN Card': { img: null, hint: 'Your PAN card. Name and PAN number (10 characters) must be fully visible.', hintHI: 'आपका PAN कार्ड। नाम और PAN नंबर (10 अक्षर) पूरी तरह दिखने चाहिए।' },
        'Bank Passbook': { img: 'web/samples/bank_passbook_sample.png', hint: 'Bank passbook front page showing account number, IFSC code, and your name.', hintHI: 'बैंक पासबुक का पहला पन्ना जिसमें खाता नंबर, IFSC कोड और आपका नाम दिखे।' },
        'Insurance Papers': { img: 'web/samples/insurance_papers_sample.png', hint: 'Your crop insurance policy document showing policy number, crop name, and season.', hintHI: 'फसल बीमा पॉलिसी दस्तावेज़ जिसमें पॉलिसी नंबर, फसल का नाम और सीज़न दिखे।' }
    };

    function getDocSample(docName) {
        for (const key of Object.keys(DOC_SAMPLES)) {
            if (docName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(docName.toLowerCase())) return DOC_SAMPLES[key];
        }
        return DOC_SAMPLES[docName] || null;
    }

    function renderDocuments(documents, applicationNumber) {
        const dl = document.querySelector('.documents-list'); if (!dl) return;
        dl.innerHTML = '';
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        documents.forEach(doc => {
            const up = doc.status === 'Verified' || doc.status === 'Submitted';
            const mis = doc.status === 'Missing' || doc.status === 'Pending';
            const rej = doc.status === 'Rejected';
            const cls = 'document-item ' + (up ? 'status-uploaded' : mis ? 'status-missing' : rej ? 'status-rejected' : 'status-optional');
            const sample = getDocSample(doc.document_type);

            // Sample image thumbnail
            const sampleHtml = (mis || rej) && sample && sample.img
                ? '<div class="doc-sample-preview"><img src="' + sample.img + '" alt="Sample ' + doc.document_type + '" class="doc-sample-img" onclick="openSampleModal(this.src, \'' + doc.document_type.replace(/'/g, "\\'") + '\')"><div class="doc-sample-label"><i class="fas fa-image"></i> Tap to see sample</div></div>'
                : '';

            // Quality hint
            const qualityHint = (mis || rej) && sample
                ? '<div class="doc-quality-tip"><i class="fas fa-lightbulb"></i> <span>' + (lang === 'hi' ? (sample.hintHI || sample.hint) : sample.hint) + '</span></div>'
                : '';

            // Quality checks display (if doc has checks from doccheck result)
            const checksHtml = doc.checks && doc.checks.length
                ? '<div class="doc-checks">' + doc.checks.map(ch => '<span class="doc-check-item ' + (ch.ok ? 'ok' : 'fail') + '"><i class="fas ' + (ch.ok ? 'fa-check' : 'fa-times') + '"></i> ' + (lang === 'hi' ? (ch.hi || ch.en) : ch.en) + '</span>').join('') + '</div>'
                : '';

            const icon = (mis || rej)
                ? '<div class="document-icon missing"><i class="fas fa-exclamation-triangle"></i></div>'
                : '<div class="document-icon"><i class="fas fa-file-pdf"></i></div>';

            const statusHtml = up
                ? '<p class="doc-status"><i class="fas fa-check-circle"></i> Submitted — awaiting verification</p>'
                : mis
                    ? '<p class="doc-status"><i class="fas fa-times-circle"></i> Missing — upload required · अपलोड करना ज़रूरी है</p><small class="doc-hint">Portal name (exact): <strong>' + doc.document_type + '</strong></small>'
                : rej
                    ? '<p class="doc-status"><i class="fas fa-times-circle"></i> Rejected — please reupload a clear photo</p><small class="doc-hint">फ़ोटो साफ़ नहीं थी। दोबारा अच्छी रोशनी में लें।</small>'
                : '<p class="doc-status">' + doc.status + '</p>';

            const safe = doc.document_type.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const uploadBtn = '<button class="btn-upload" data-doc="' + safe + '" data-doc-name="' + doc.document_type.replace(/"/g, '&quot;') + '" data-app-no="' + applicationNumber + '"><i class="fas fa-upload"></i> Upload · अपलोड</button>';
            const acts = (mis || rej)
                ? '<div class="document-actions">' + uploadBtn + '</div>'
                : '<div class="document-actions"><button class="btn-icon" title="View"><i class="fas fa-eye"></i></button></div>';

            dl.innerHTML += '<div class="' + cls + '">'
                + icon
                + '<div class="document-info"><h4>' + doc.document_type + '</h4>'
                + statusHtml
                + checksHtml
                + qualityHint
                + sampleHtml
                + '</div>' + acts + '</div>';
        });
        attachUploadListeners();
        speakMissingDocs(documents);
    }

    function speakMissingDocs(documents) {
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        const voiceLang = getVoiceLang();
        const missing = documents.filter(d => d.status === 'Missing' || d.status === 'Pending');
        if (!missing.length) return;
        const autoSpeakEl = document.getElementById('autoSpeakDashboard');
        if (!autoSpeakEl || !autoSpeakEl.checked) return;
        // Speak after main summary delay
        setTimeout(() => {
            const isHI = getVoiceLang() === 'hi-IN';
            let msg = '';
            if (isHI) {
                msg = missing.length + ' दस्तावेज़ बाकी हैं। ' + missing.map((d,i) => (i+1) + ' नंबर: ' + d.document_type).join('। ') + '। Upload बटन दबाकर हर एक अपलोड करें।';
            } else {
                msg = 'You have ' + missing.length + ' missing document' + (missing.length > 1 ? 's' : '') + '. ' + missing.map((d,i) => 'Number ' + (i+1) + ': ' + d.document_type).join('. ') + '. Tap the Upload button for each one.';
            }
            speakText(msg, getVoiceLang());
        }, 3500);
    }

    function renderSidebarInfo(claim) {
        const card = document.getElementById('claimAmountCard');
        if (card && claim.claim_status === 'Approved') {
            card.style.display = 'block';
            const note = card.querySelector('.amount-note');
            if (note) {
                if (claim.payment_status === 'Paid') { note.textContent = 'Payment credited to your bank account.'; note.style.color = '#2e7d32'; }
                else { note.textContent = 'Approved — payment NOT yet credited. I will only say "paid" when portal confirms.'; note.style.color = '#e65100'; note.style.fontWeight = '600'; }
            }
        }
        if (claim.claim_status === 'Rejected' && claim.rejection_reason) {
            let rc = document.getElementById('rejectionCard');
            if (!rc) {
                rc = document.createElement('div'); rc.id = 'rejectionCard'; rc.className = 'info-card rejection-card';
                rc.innerHTML = '<h3 class="section-heading"><i class="fas fa-times-circle"></i> Rejection Reason</h3><p id="rejectionReason"></p><p id="appealInfo" style="margin-top:0.5rem;font-size:0.85rem;"></p>';
                const sb = document.querySelector('.sidebar-section'); if (sb) sb.appendChild(rc);
            }
            document.getElementById('rejectionReason').textContent = claim.rejection_reason;
            const ai = document.getElementById('appealInfo'); if (ai) ai.textContent = claim.appeal_possible ? 'You may appeal within 30 days.' : 'Decision is final.';
        }
    }

    // ============================================
    // LOADING / ERROR
    // ============================================
    function showLoadingState() {
        const m = document.querySelector('.app-header-card'); if (!m || document.getElementById('apiLoadingBanner')) return;
        const b = document.createElement('div'); b.id = 'apiLoadingBanner'; b.className = 'api-loading-banner';
        b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading claim data...'; m.prepend(b);
    }
    function hideLoadingState() { const e = document.getElementById('apiLoadingBanner'); if (e) e.remove(); }
    function showErrorState(msg) {
        hideLoadingState();
        const m = document.querySelector('.app-header-card'); if (!m) return;
        const e = document.getElementById('apiErrorBanner'); if (e) e.remove();
        const b = document.createElement('div'); b.id = 'apiErrorBanner'; b.className = 'api-error-banner';
        b.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + msg + '<br><a href="index.html" style="color:white;text-decoration:underline;margin-top:0.5rem;display:inline-block;">Search Again</a>';
        m.prepend(b);
    }

    // ============================================
    // TOAST
    // ============================================
    function showToast(message, type) {
        type = type || 'info';
        const t = document.createElement('div'); t.className = 'toast-notification toast-' + type;
        t.textContent = message;
        const colors = { success: '#2e7d32', error: '#c62828', warning: '#e65100', info: '#1565c0' };
        Object.assign(t.style, { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%) translateY(60px)', background: colors[type] || '#1565c0', color: '#fff', padding: '12px 20px', borderRadius: '24px', fontSize: '0.9rem', fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', zIndex: '99999', maxWidth: 'calc(100vw - 40px)', transition: 'transform 0.3s ease, opacity 0.3s ease', opacity: '0' });
        document.body.appendChild(t);
        requestAnimationFrame(() => { t.style.transform = 'translateX(-50%) translateY(0)'; t.style.opacity = '1'; });
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(40px)'; setTimeout(() => t.remove(), 350); }, 4000);
    }

    // ============================================
    // DOCUMENT UPLOAD — via agent
    // ============================================
    const uploadModal = document.getElementById('uploadModal');
    let selectedFile = null, currentDocMeta = {};

    function attachUploadListeners() {
        document.querySelectorAll('.btn-upload').forEach(btn => {
            btn.removeEventListener('click', onUploadBtnClick);
            btn.addEventListener('click', onUploadBtnClick);
        });
    }
    function onUploadBtnClick() {
        currentDocMeta = { docName: this.getAttribute('data-doc-name'), appNo: this.getAttribute('data-app-no') };
        const mt = document.getElementById('modalTitle'), md = document.getElementById('modalDescription');
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        const sample = getDocSample(currentDocMeta.docName);
        if (mt) mt.textContent = 'Upload · ' + currentDocMeta.docName;
        if (md) {
            const tips = lang === 'hi'
                ? 'साफ़ फ़ोटो लें: अच्छी रोशनी में, सीधा, धुंधलापन न हो। एजेंट पहले मंज़ूरी माँगेगा।'
                : 'Take a clear photo: good lighting, flat surface, no blur. The agent will ask for your approval before submitting.';
            md.textContent = tips;
        }
        // Insert sample image into modal if available
        let existingSample = document.getElementById('modalSampleBox');
        if (existingSample) existingSample.remove();
        if (sample && sample.img) {
            const sampleBox = document.createElement('div'); sampleBox.id = 'modalSampleBox'; sampleBox.className = 'modal-sample-box';
            sampleBox.innerHTML = '<div class="modal-sample-label"><i class="fas fa-image"></i> How it should look · ऐसा होना चाहिए</div>'
                + '<img src="' + sample.img + '" alt="Sample" class="modal-sample-img">'
                + '<small>' + (lang === 'hi' ? (sample.hintHI || sample.hint) : sample.hint) + '</small>';
            const ua2 = document.getElementById('uploadArea');
            if (ua2) ua2.insertAdjacentElement('beforebegin', sampleBox);
        }
        if (uploadModal) uploadModal.style.display = 'flex';
        // Speak upload instruction
        const msg = lang === 'hi'
            ? 'कृपया अपने ' + currentDocMeta.docName + ' की साफ़ फ़ोटो अपलोड करें।'
            : 'Please upload a clear photo of your ' + currentDocMeta.docName + '.';
        setTimeout(() => speakText(msg, getVoiceLang()), 300);
        resetUploadForm();
    }

    // Open full sample image in lightbox
    window.openSampleModal = function(src, docName) {
        let lb = document.getElementById('sampleLightbox');
        if (!lb) {
            lb = document.createElement('div'); lb.id = 'sampleLightbox'; lb.className = 'sample-lightbox';
            lb.innerHTML = '<div class="lightbox-overlay" onclick="document.getElementById(\'sampleLightbox\').style.display=\'none\'"><img id="lbImg" src="" alt=""><div class="lightbox-close"><i class="fas fa-times"></i></div><div class="lightbox-caption" id="lbCaption"></div></div>';
            document.body.appendChild(lb);
        }
        lb.querySelector('#lbImg').src = src;
        lb.querySelector('#lbCaption').textContent = docName + ' — Sample Document (Synthetic)';
        lb.style.display = 'flex';
    };
    function resetUploadForm() {
        selectedFile = null;
        const fi = document.getElementById('fileInput'); if (fi) fi.value = '';
        const fp = document.getElementById('filePreview'); if (fp) fp.style.display = 'none';
        const up = document.getElementById('uploadProgress'); if (up) up.style.display = 'none';
        const ua = document.getElementById('uploadArea'); if (ua) ua.style.display = 'block';
        const cu = document.getElementById('confirmUpload'); if (cu) cu.disabled = true;
    }
    function closeUploadModal() { if (uploadModal) uploadModal.style.display = 'none'; resetUploadForm(); }

    document.getElementById('closeModal') && document.getElementById('closeModal').addEventListener('click', closeUploadModal);
    document.getElementById('cancelUpload') && document.getElementById('cancelUpload').addEventListener('click', closeUploadModal);
    if (uploadModal) uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeUploadModal(); });

    const ua = document.getElementById('uploadArea');
    if (ua) {
        ua.addEventListener('click', () => { const fi = document.getElementById('fileInput'); if (fi) fi.click(); });
        ua.addEventListener('dragover', e => { e.preventDefault(); ua.classList.add('drag-over'); });
        ua.addEventListener('dragleave', e => { e.preventDefault(); ua.classList.remove('drag-over'); });
        ua.addEventListener('drop', e => { e.preventDefault(); ua.classList.remove('drag-over'); if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]); });
    }
    const fi = document.getElementById('fileInput');
    if (fi) fi.addEventListener('change', function() { if (this.files.length) handleFileSelect(this.files[0]); });

    function handleFileSelect(file) {
        if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', 'error'); return; }
        if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) { showToast('Only PDF, JPG, PNG.', 'error'); return; }
        selectedFile = file;
        const fn = document.getElementById('fileName'); if (fn) fn.textContent = file.name;
        const fp2 = document.getElementById('filePreview'); if (fp2) fp2.style.display = 'flex';
        if (ua) ua.style.display = 'none';
        const cu2 = document.getElementById('confirmUpload'); if (cu2) cu2.disabled = false;
    }

    const rf = document.getElementById('removeFile');
    if (rf) rf.addEventListener('click', e => { e.stopPropagation(); resetUploadForm(); });

    const cu3 = document.getElementById('confirmUpload');
    if (cu3) cu3.addEventListener('click', () => {
        if (!selectedFile) { showToast('Please select a file', 'error'); return; }
        closeUploadModal();
        if (currentDocMeta.docName) sendChatMessage('upload document ' + currentDocMeta.docName + (currentDocMeta.appNo ? ' for ' + currentDocMeta.appNo : ''));
    });

    // ============================================
    // APPROVAL PANEL
    // ============================================
    let currentProposal = null, currentSessionId = null, lastAgentReply = '';

    function showApprovalPanel(proposal, agentReply) {
        currentProposal = proposal;
        const panel = document.getElementById('approvalPanel'); if (!panel) return;
        const se = document.getElementById('approvalSummary'); if (se) se.textContent = agentReply || 'Agent proposes a change.';
        const fe = document.getElementById('compareFrom'), te = document.getElementById('compareTo');
        const ch = proposal.change || {};
        if (ch.action_type === 'season_change') { if (fe) fe.textContent = ch.from || '—'; if (te) te.textContent = ch.to || '—'; }
        else { if (fe) fe.textContent = 'Missing'; if (te) te.textContent = (ch.document_name || '') + ' (upload)'; }
        panel.style.display = 'block'; panel.scrollIntoView({ behavior: 'smooth' });
        if (agentReply) speakText(agentReply, getVoiceLang());
    }

    async function handleApproval(approve) {
        if (!currentProposal || !currentSessionId) return;
        const ab = document.getElementById('approveBtn'), rb = document.getElementById('rejectBtn');
        if (ab) { ab.disabled = true; ab.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        if (rb) rb.disabled = true;
        try {
            const resp = await fetch(API_BASE + '/api/approve', { method: 'POST', headers: API_CONFIG.headers(), body: JSON.stringify({ session_id: currentSessionId, proposal_id: currentProposal.id, approve }) });
            const data = await resp.json();
            const panel = document.getElementById('approvalPanel'); if (panel) panel.style.display = 'none';
            const reply = data.reply || '';
            const ver = data.verification;
            if (ver && ver.status === 'VERIFIED') {
                showToast('\u2705 ' + reply, 'success');
                if (reply) speakText(reply, getVoiceLang());
                const appNo = new URLSearchParams(window.location.search).get('app');
                if (appNo) setTimeout(() => fetchClaimFromAPI(appNo), 600);
                // Fetch quality check result if available from profile
                fetchDocQualityResult(currentProposal);
            } else if (!approve) {
                showToast('Change rejected. Nothing modified.', 'info');
                if (reply) speakText(reply, getVoiceLang());
            } else {
                showToast(reply || 'Could not verify change. Book help.', 'warning');
                if (reply) speakText(reply, getVoiceLang());
            }
            const rbox = document.getElementById('agentReplyBox'), rtext = document.getElementById('agentReplyText');
            if (rbox && reply) { if (rtext) rtext.textContent = reply; rbox.style.display = 'block'; lastAgentReply = reply; }
            currentProposal = null;
        } catch (e) { showToast('Could not process approval.', 'error'); }
        finally {
            if (ab) { ab.disabled = false; ab.innerHTML = '<i class="fas fa-check"></i> Approve'; }
            if (rb) rb.disabled = false;
        }
    }

    const abBtn = document.getElementById('approveBtn'), rbBtn = document.getElementById('rejectBtn');
    if (abBtn) abBtn.addEventListener('click', () => handleApproval(true));
    if (rbBtn) rbBtn.addEventListener('click', () => handleApproval(false));

    // ============================================
    // CONVERSATION BAR
    // ============================================
    async function createSession() {
        const lang = (typeof getLang === 'function' ? getLang() : localStorage.getItem('preferredLanguage')) || 'hi';
        const r = await fetch(API_BASE + '/api/session', { method: 'POST', headers: API_CONFIG.headers(), body: JSON.stringify({ lang }) });
        const d = await r.json(); localStorage.setItem('kisan_session_id', d.session_id); return d.session_id;
    }

    async function sendChatMessage(text) {
        if (!text || !text.trim()) return;
        if (!currentSessionId) currentSessionId = localStorage.getItem('kisan_session_id') || await createSession();
        const lang = (typeof getLang === 'function' ? getLang() : localStorage.getItem('preferredLanguage')) || 'hi';
        const rbox = document.getElementById('agentReplyBox'), rtext = document.getElementById('agentReplyText');
        if (rbox) rbox.style.display = 'block'; if (rtext) rtext.textContent = '...';
        try {
            const resp = await fetch(API_BASE + '/api/chat', { method: 'POST', headers: API_CONFIG.headers(), body: JSON.stringify({ session_id: currentSessionId, text: text.trim(), lang }) });
            const data = await resp.json();
            lastAgentReply = data.reply || '';
            if (rtext) rtext.textContent = lastAgentReply;
            if (lastAgentReply) speakText(lastAgentReply, getVoiceLang());
            if (data.proposal && data.proposal.status === 'PENDING') showApprovalPanel(data.proposal, data.reply);
            if (data.claim && data.claim.app_no) setTimeout(() => fetchClaimFromAPI(data.claim.app_no), 400);
        } catch (e) { if (rtext) rtext.textContent = 'Could not reach agent. Try again.'; }
    }

    const chatForm = document.getElementById('chatForm');
    if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); const inp = document.getElementById('chatInput'); if (inp && inp.value.trim()) { sendChatMessage(inp.value.trim()); inp.value = ''; } });

    document.querySelectorAll('.quick-option-btn').forEach(btn => btn.addEventListener('click', function() { sendChatMessage(this.getAttribute('data-msg')); }));

    const hBtn = document.getElementById('hearAgainBtn');
    if (hBtn) hBtn.addEventListener('click', () => { if (lastAgentReply) speakText(lastAgentReply, getVoiceLang()); });

    const cmBtn = document.getElementById('chatMicBtn');
    if (cmBtn) cmBtn.addEventListener('click', function() {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) { showToast('Voice not supported here. Please type.', 'warning'); return; }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        const lang = (typeof getLang === 'function' ? getLang() : localStorage.getItem('preferredLanguage')) || 'hi';
        const lm = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', pa: 'pa-IN', gu: 'gu-IN', ta: 'ta-IN' };
        rec.lang = lm[lang] || 'hi-IN'; rec.interimResults = false;
        cmBtn.classList.add('listening'); rec.start();
        rec.onresult = e => { const t = e.results[0][0].transcript; const inp = document.getElementById('chatInput'); if (inp) inp.value = t; sendChatMessage(t); };
        rec.onend = () => cmBtn.classList.remove('listening');
        rec.onerror = () => cmBtn.classList.remove('listening');
    });

    // ============================================
    // QUICK ACTIONS
    // ============================================
    document.getElementById('voiceSummaryBtn') && document.getElementById('voiceSummaryBtn').addEventListener('click', function() {
        if (isSpeaking) { synth.cancel(); return; }
        const appNo = document.getElementById('appNumber') && document.getElementById('appNumber').textContent;
        if (!appNo) return;
        sendChatMessage('what is my claim status for ' + appNo);
    });

    document.getElementById('trackAgainBtn') && document.getElementById('trackAgainBtn').addEventListener('click', () => window.location.href = 'index.html');
    document.getElementById('downloadReportBtn') && document.getElementById('downloadReportBtn').addEventListener('click', () => { showToast('Downloading...', 'info'); setTimeout(() => showToast('Report downloaded!', 'success'), 1500); });
    document.getElementById('contactSupportBtn') && document.getElementById('contactSupportBtn').addEventListener('click', () => showToast('Helpline: 1800-123-4567 (Toll Free)', 'info'));
    document.getElementById('updateInfoBtn') && document.getElementById('updateInfoBtn').addEventListener('click', () => window.location.href = 'manual-entry.html');

    const asd = document.getElementById('autoSpeakDashboard');
    if (asd) { const sv = localStorage.getItem('autoSpeakDashboard'); if (sv !== null) asd.checked = sv === 'true'; asd.addEventListener('change', function() { localStorage.setItem('autoSpeakDashboard', this.checked); }); }

    document.getElementById('languageSelect') && document.getElementById('languageSelect').addEventListener('change', function() {
        localStorage.setItem('preferredLanguage', this.value);
        if (typeof applyLanguage === 'function') applyLanguage();
        // Re-speak the status in the new language
        const appNo = new URLSearchParams(window.location.search).get('app');
        if (appNo) setTimeout(() => fetchClaimFromAPI(appNo), 200);
        const name = this.value === 'hi' ? 'हिंदी चुनी' : 'English selected';
        showToast(name, 'success');
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && uploadModal && uploadModal.style.display === 'flex') closeUploadModal(); });

    // ============================================
    // HELPERS
    // ============================================
    function formatDate(d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function formatRelativeTime(d) {
        const m = Math.floor((new Date() - d) / 60000);
        if (m < 1) return 'Just now'; if (m < 60) return m + ' min ago'; if (m < 1440) return Math.floor(m / 60) + ' hours ago';
        return formatDate(d);
    }

    // Fetch and speak document quality check result after upload
    async function fetchDocQualityResult(proposal) {
        if (!proposal || !proposal.change || proposal.change.action_type !== 'document_upload') return;
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        const token = localStorage.getItem('kisan_token');
        if (!token) return; // only if logged in
        try {
            const r = await fetch(API_BASE + '/api/profile', { headers: API_CONFIG.headers() });
            const data = await r.json();
            if (!data.documents) return;
            const docName = proposal.change.document_name || '';
            // Find matching doc type by name
            const docTypeMap = {
                'Land Record (Khatauni)': 'land_record', 'Aadhaar Card': 'aadhaar_card',
                'PAN Card': 'pan_card', 'Bank Passbook': 'bank_passbook', 'Insurance Papers': 'insurance_papers'
            };
            const dtype = docTypeMap[docName];
            if (!dtype) return;
            const doc = data.documents.find(d => d.doc_type === dtype);
            if (!doc || !doc.checks || !doc.checks.length) return;

            const failed = doc.checks.filter(c => !c.ok);
            if (failed.length === 0) {
                const msg = lang === 'hi'
                    ? 'दस्तावेज़ की जाँच हो गई। सभी मापदंड ठीक हैं।'
                    : 'Document quality check passed. All checks are OK.';
                speakText(msg, getVoiceLang());
            } else {
                // Show quality problems and speak them
                const problems = failed.map(c => lang === 'hi' ? (c.hi || c.en) : c.en).join('. ');
                const msg = lang === 'hi'
                    ? 'दस्तावेज़ जमा हो गया लेकिन ' + failed.length + ' समस्या मिली: ' + problems + '। कृपया दोबारा साफ़ फ़ोटो लें।'
                    : 'Document submitted but ' + failed.length + ' quality issue' + (failed.length > 1 ? 's' : '') + ' found: ' + problems + '. Please retake a clearer photo if possible.';
                speakText(msg, getVoiceLang());
                // Show quality result card on the dashboard
                showDocQualityCard(docName, doc.checks, lang);
            }
        } catch(e) { /* quality check optional */ }
    }

    function showDocQualityCard(docName, checks, lang) {
        let qc = document.getElementById('docQualityCard');
        if (!qc) {
            qc = document.createElement('div'); qc.id = 'docQualityCard'; qc.className = 'info-card doc-quality-card';
            const sidebar = document.querySelector('.sidebar-section'); if (sidebar) sidebar.appendChild(qc);
        }
        const failed = checks.filter(c => !c.ok);
        const allOk = failed.length === 0;
        qc.innerHTML = '<h3 class="section-heading"><i class="fas ' + (allOk ? 'fa-check-double' : 'fa-search') + '"></i> Document Quality Check</h3>'
            + '<div class="doc-checks large">'
            + checks.map(ch => '<div class="doc-check-row ' + (ch.ok ? 'ok' : 'fail') + '"><i class="fas ' + (ch.ok ? 'fa-check-circle' : 'fa-times-circle') + '"></i><span>' + (lang === 'hi' ? (ch.hi || ch.en) : ch.en) + '</span></div>').join('')
            + '</div>'
            + (allOk ? '<p class="quality-ok-msg"><i class="fas fa-thumbs-up"></i> Document looks good!</p>'
                    : '<p class="quality-fail-msg"><i class="fas fa-redo"></i> Please retake a clearer photo and reupload. · साफ़ फ़ोटो लेकर दोबारा अपलोड करें।</p>');
    }

    // ============================================
    // INIT
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        const sl = localStorage.getItem('preferredLanguage') || 'en';
        const ls = document.getElementById('languageSelect'); if (ls) ls.value = sl;

        const params = new URLSearchParams(window.location.search);
        const urlSid = params.get('sid');
        if (urlSid) { localStorage.setItem('kisan_session_id', urlSid); currentSessionId = urlSid; }
        else currentSessionId = localStorage.getItem('kisan_session_id') || null;

        let appNo = params.get('app');
        if (!appNo) { try { const sq = JSON.parse(localStorage.getItem('searchQuery') || '{}'); if (sq.applicationNumber) appNo = sq.applicationNumber; } catch (e) { /* */ } }
        if (!appNo) appNo = 'KRB-2026-00417';

        fetchClaimFromAPI(appNo);
    });

})();
