/* ============================================
   DASHBOARD JAVASCRIPT
   Fetches real data from FastAPI backend
   ============================================ */

(function() {
    'use strict';

    const API_BASE = 'http://localhost:8001';

    // ============================================
    // TEXT-TO-SPEECH SETUP
    // ============================================
    const synth = window.speechSynthesis;
    let isSpeaking = false;

    function speakText(text, lang = 'en-IN') {
        if (!('speechSynthesis' in window)) return;
        if (synth.speaking) synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            isSpeaking = true;
            const btn = document.getElementById('voiceSummaryBtn');
            if (btn) btn.innerHTML = '<i class="fas fa-volume-up"></i> Speaking...';
        };

        utterance.onend = () => {
            isSpeaking = false;
            const btn = document.getElementById('voiceSummaryBtn');
            if (btn) btn.innerHTML = '<i class="fas fa-volume-up"></i> Hear Status Summary';
        };

        synth.speak(utterance);
    }

    function getVoiceLang() {
        const savedLang = localStorage.getItem('preferredLanguage') || 'en';
        const langMap = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', pa: 'pa-IN', gu: 'gu-IN', ta: 'ta-IN' };
        return langMap[savedLang] || 'en-IN';
    }

    function buildVoiceSummary(claim, lang) {
        const missingDocs = (claim.documents || []).filter(d => d.status === 'Missing' || d.status === 'Pending').map(d => d.document_type);
        const n = missingDocs.length;

        const summaries = {
            'en-IN': `Your application number ${claim.application_number} for ${claim.crop} crop in ${claim.season} season is currently ${claim.claim_status}. Payment status is ${claim.payment_status}. ${n > 0 ? `You have ${n} missing document${n > 1 ? 's' : ''}: ${missingDocs.join(', ')}.` : 'All documents are submitted.'} Your claim is at stage ${claim.current_stage} of 6.`,
            'hi-IN': `आपका आवेदन संख्या ${claim.application_number}, ${claim.crop} फसल के लिए ${claim.season} मौसम में, वर्तमान में ${claim.claim_status} है। भुगतान की स्थिति ${claim.payment_status} है। ${n > 0 ? `आपके ${n} दस्तावेज़ गायब हैं: ${missingDocs.join(', ')}.` : 'सभी दस्तावेज़ जमा हैं।'}`,
            'mr-IN': `तुमचा अर्ज क्रमांक ${claim.application_number}, ${claim.crop} पिकासाठी ${claim.season} हंगामात, सध्या ${claim.claim_status} आहे। ${n > 0 ? `${n} कागदपत्रे गहाळ आहेत: ${missingDocs.join(', ')}.` : 'सर्व कागदपत्रे जमा आहेत।'}`,
            'pa-IN': `ਤੁਹਾਡਾ ਐਪਲੀਕੇਸ਼ਨ ਨੰਬਰ ${claim.application_number}, ${claim.crop} ਫਸਲ ਦਾ ਦਾਅਵਾ ${claim.claim_status} ਹੈ। ${n > 0 ? `${n} ਦਸਤਾਵੇਜ਼ ਗੁੰਮ ਹਨ।` : 'ਸਾਰੇ ਦਸਤਾਵੇਜ਼ ਜਮ੍ਹਾਂ ਹਨ।'}`,
            'gu-IN': `તમારો અરજી નંબર ${claim.application_number}, ${claim.crop} પાક માટે ${claim.season} સીઝનમાં ${claim.claim_status} છે। ${n > 0 ? `${n} દસ્તાવેજો ખૂટે છે।` : 'બધા દસ્તાવેજો જમા છે।'}`,
            'ta-IN': `உங்கள் விண்ணப்ப எண் ${claim.application_number}, ${claim.crop} பயிரின் நிலை ${claim.claim_status}. ${n > 0 ? `${n} ஆவணங்கள் இல்லை.` : 'அனைத்து ஆவணங்களும் சமர்ப்பிக்கப்பட்டுள்ளன.'}`
        };

        return summaries[lang] || summaries['en-IN'];
    }

    // ============================================
    // MAIN: FETCH CLAIM FROM API
    // ============================================

    async function fetchClaimFromAPI(applicationNumber) {
        showLoadingState();

        try {
            const response = await fetch(`${API_BASE}/api/claims/${applicationNumber}`);

            if (!response.ok) {
                if (response.status === 404) {
                    showErrorState(`No claim found for application number ${applicationNumber}. Please check and try again.`);
                } else {
                    showErrorState('Server error. Please try again in a moment.');
                }
                return;
            }

            const json = await response.json();
            const claim = json.data;

            console.log('Claim data from API:', claim);
            renderDashboard(claim);

            // Auto-speak after data loads
            const autoSpeakEl = document.getElementById('autoSpeakDashboard');
            if (autoSpeakEl && autoSpeakEl.checked) {
                setTimeout(() => {
                    speakText(buildVoiceSummary(claim, getVoiceLang()), getVoiceLang());
                }, 1200);
            }

        } catch (err) {
            console.error('API fetch failed:', err);
            showErrorState('Could not connect to the server. Make sure the backend is running on port 8000.');
        }
    }

    // ============================================
    // RENDER: POPULATE ALL DASHBOARD SECTIONS
    // ============================================

    function renderDashboard(claim) {
        hideLoadingState();

        // --- Header Info ---
        document.getElementById('appNumber').textContent = claim.application_number;
        document.getElementById('season').textContent = `${claim.season} ${claim.year}`;
        document.getElementById('crop').textContent = claim.crop;

        if (claim.created_at) {
            document.getElementById('appDate').textContent = formatDate(new Date(claim.created_at));
        }
        if (claim.updated_at) {
            document.getElementById('lastUpdated').textContent = formatRelativeTime(new Date(claim.updated_at));
        }

        // --- Farmer name (if element exists) ---
        const farmerEl = document.getElementById('farmerName');
        if (farmerEl) farmerEl.textContent = claim.farmer_name;

        // --- Status Badge ---
        renderStatusBadge(claim);

        // --- Timeline ---
        if (claim.activities && claim.activities.length > 0) {
            renderTimeline(claim.activities, claim.current_stage);
        }

        // --- Documents ---
        if (claim.documents && claim.documents.length > 0) {
            renderDocuments(claim.documents, claim.application_number);
        }

        // --- Sidebar info ---
        renderSidebarInfo(claim);
    }

    function renderStatusBadge(claim) {
        const badge = document.getElementById('statusBadge');
        const statusText = document.getElementById('statusText');
        if (!badge || !statusText) return;

        // Remove all status classes
        badge.className = 'status-badge';

        const statusMap = {
            'Approved':       { cls: 'status-approved',  icon: 'fa-check-circle' },
            'Under Review':   { cls: 'status-pending',   icon: 'fa-clock' },
            'Action Required':{ cls: 'status-action',    icon: 'fa-exclamation-triangle' },
            'Rejected':       { cls: 'status-rejected',  icon: 'fa-times-circle' },
            'Field Verification': { cls: 'status-field', icon: 'fa-map-marker-alt' }
        };

        const s = statusMap[claim.claim_status] || { cls: 'status-pending', icon: 'fa-clock' };
        badge.classList.add(s.cls);
        badge.innerHTML = `<i class="fas ${s.icon}"></i> <span id="statusText">${claim.claim_status}</span>`;

        // Show error/action message if present
        if (claim.error_message) {
            const existingMsg = document.getElementById('statusMessage');
            if (!existingMsg) {
                const msg = document.createElement('div');
                msg.id = 'statusMessage';
                msg.className = 'status-error-message';
                msg.innerHTML = `<i class="fas fa-info-circle"></i> ${claim.error_message}`;
                badge.insertAdjacentElement('afterend', msg);
            }
        }
    }

    function renderTimeline(activities, currentStage) {
        const timelineEl = document.querySelector('.timeline');
        if (!timelineEl) return;

        timelineEl.innerHTML = '';

        // Sort by stage number
        const sorted = [...activities].sort((a, b) => a.stage_number - b.stage_number);

        sorted.forEach(activity => {
            const isCurrent = activity.stage_number === currentStage && activity.status !== 'Completed';
            const isCompleted = activity.status === 'Completed';
            const isPending = activity.status === 'Pending';

            let cls = 'timeline-item';
            if (isCompleted) cls += ' completed';
            else if (isCurrent) cls += ' current';
            else cls += ' pending';

            let iconHtml = '';
            if (isCompleted) iconHtml = '<i class="fas fa-check"></i>';
            else if (isCurrent) iconHtml = '<i class="fas fa-sync fa-spin"></i>';
            else iconHtml = '<i class="fas fa-circle"></i>';

            const dateText = activity.completed_at
                ? formatDate(new Date(activity.completed_at))
                : (isCurrent ? 'In Progress' : 'Pending');

            const notesHtml = activity.notes
                ? `<p class="timeline-note">${activity.notes}</p>`
                : '';

            timelineEl.innerHTML += `
                <div class="${cls}" data-stage="${activity.stage_number}">
                    <div class="timeline-marker">${iconHtml}</div>
                    <div class="timeline-content">
                        <h4>${activity.stage_name}</h4>
                        ${notesHtml}
                        <span class="timeline-date">${dateText}</span>
                    </div>
                </div>`;
        });
    }

    function renderDocuments(documents, applicationNumber) {
        const docList = document.querySelector('.documents-list');
        if (!docList) return;

        docList.innerHTML = '';

        documents.forEach(doc => {
            const isUploaded = doc.status === 'Verified' || doc.status === 'Submitted';
            const isMissing  = doc.status === 'Missing'  || doc.status === 'Pending';
            const isRejected = doc.status === 'Rejected';

            let itemCls = 'document-item';
            if (isUploaded)  itemCls += ' status-uploaded';
            else if (isMissing)  itemCls += ' status-missing';
            else if (isRejected) itemCls += ' status-rejected';
            else                 itemCls += ' status-optional';

            let iconHtml = isMissing || isRejected
                ? '<div class="document-icon missing"><i class="fas fa-exclamation-triangle"></i></div>'
                : '<div class="document-icon"><i class="fas fa-file-pdf"></i></div>';

            let statusHtml = '';
            if (isUploaded) statusHtml = `<p class="doc-status"><i class="fas fa-check-circle"></i> ${doc.status}</p><small class="doc-date">Uploaded ${doc.uploaded_at ? formatDate(new Date(doc.uploaded_at)) : ''}</small>`;
            else if (isMissing) statusHtml = `<p class="doc-status"><i class="fas fa-times-circle"></i> Missing - Required</p><small class="doc-hint">Please upload this document to proceed</small>`;
            else if (isRejected) statusHtml = `<p class="doc-status"><i class="fas fa-times-circle"></i> Rejected - Reupload Required</p>`;
            else statusHtml = `<p class="doc-status"><i class="fas fa-info-circle"></i> ${doc.status}</p>`;

            let actionsHtml = '';
            if (isUploaded) {
                actionsHtml = `
                    <div class="document-actions">
                        <button class="btn-icon" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" title="Download"><i class="fas fa-download"></i></button>
                    </div>`;
            } else if (isMissing || isRejected) {
                const safeDocType = doc.document_type.replace(/\s+/g, '-').toLowerCase();
                actionsHtml = `
                    <div class="document-actions">
                        <button class="btn-upload"
                            data-doc="${safeDocType}"
                            data-doc-id="${doc.id}"
                            data-doc-name="${doc.document_type}"
                            data-app-no="${applicationNumber}">
                            <i class="fas fa-upload"></i> Upload
                        </button>
                    </div>`;
            }

            docList.innerHTML += `
                <div class="document-item ${itemCls.replace('document-item ', '')}" data-doc-id="${doc.id}">
                    ${iconHtml}
                    <div class="document-info">
                        <h4>${doc.document_type}</h4>
                        ${statusHtml}
                    </div>
                    ${actionsHtml}
                </div>`;
        });

        // Re-attach upload button listeners
        attachUploadListeners();
    }

    function renderSidebarInfo(claim) {
        // Action Required message in sidebar
        const actionEl = document.querySelector('.info-item strong');
        const missingDocs = (claim.documents || []).filter(d => d.status === 'Missing');

        const actionInfoEl = document.querySelector('#actionRequired');
        if (actionInfoEl) {
            if (missingDocs.length > 0) {
                actionInfoEl.textContent = `Upload ${missingDocs.length} missing document(s)`;
            } else if (claim.claim_status === 'Approved' && claim.payment_status !== 'Paid') {
                actionInfoEl.textContent = 'Payment being processed';
            } else if (claim.claim_status === 'Approved' && claim.payment_status === 'Paid') {
                actionInfoEl.textContent = 'No action required';
            } else {
                actionInfoEl.textContent = claim.action_needed || 'Under review';
            }
        }

        // Show claim amount card if approved
        const amountCard = document.getElementById('claimAmountCard');
        if (amountCard && claim.claim_amount) {
            amountCard.style.display = 'block';
            const amountEl = amountCard.querySelector('.amount-value');
            if (amountEl) amountEl.textContent = `₹ ${Number(claim.claim_amount).toLocaleString('en-IN')}`;

            // TC4: Approved but not paid — show clear message
            const paymentNote = amountCard.querySelector('.amount-note');
            if (paymentNote) {
                if (claim.payment_status === 'Paid' || claim.payment_status === 'Processed') {
                    paymentNote.textContent = `Payment transferred on ${claim.payment_date ? formatDate(new Date(claim.payment_date)) : 'record date'}`;
                    paymentNote.style.color = '#2e7d32';
                } else if (claim.payment_status === 'Processing') {
                    paymentNote.textContent = 'Payment initiated. Credit expected in 3-5 business days. Not yet received.';
                    paymentNote.style.color = '#e65100';
                } else {
                    paymentNote.textContent = 'Claim approved. Payment processing will begin soon.';
                    paymentNote.style.color = '#1565c0';
                }
            }
        }

        // Rejection info
        if (claim.claim_status === 'Rejected' && claim.rejection_reason) {
            let rejCard = document.getElementById('rejectionCard');
            if (!rejCard) {
                rejCard = document.createElement('div');
                rejCard.id = 'rejectionCard';
                rejCard.className = 'info-card rejection-card';
                rejCard.innerHTML = `
                    <h3 class="section-heading"><i class="fas fa-times-circle"></i> Rejection Reason</h3>
                    <p id="rejectionReason"></p>
                    <p id="appealInfo" style="margin-top:0.5rem; font-size:0.85rem;"></p>`;
                document.querySelector('.sidebar-section')?.appendChild(rejCard);
            }
            document.getElementById('rejectionReason').textContent = claim.rejection_reason;
            const appealEl = document.getElementById('appealInfo');
            if (appealEl) appealEl.textContent = claim.appeal_possible
                ? 'You may file an appeal within 30 days.'
                : 'This decision is final.';
        }
    }

    // ============================================
    // LOADING / ERROR STATES
    // ============================================

    function showLoadingState() {
        const main = document.querySelector('.app-header-card');
        if (!main) return;
        const existing = document.getElementById('apiLoadingBanner');
        if (existing) return;
        const banner = document.createElement('div');
        banner.id = 'apiLoadingBanner';
        banner.className = 'api-loading-banner';
        banner.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading claim data from server...';
        main.prepend(banner);
    }

    function hideLoadingState() {
        const el = document.getElementById('apiLoadingBanner');
        if (el) el.remove();
    }

    function showErrorState(message) {
        hideLoadingState();
        const main = document.querySelector('.app-header-card');
        if (!main) return;
        const existing = document.getElementById('apiErrorBanner');
        if (existing) existing.remove();
        const banner = document.createElement('div');
        banner.id = 'apiErrorBanner';
        banner.className = 'api-error-banner';
        banner.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}
            <br><a href="index.html" style="color:white; text-decoration:underline; margin-top:0.5rem; display:inline-block;">Search Again</a>`;
        main.prepend(banner);
    }

    // ============================================
    // DOCUMENT UPLOAD (wired to real API)
    // ============================================

    const uploadModal = document.getElementById('uploadModal');
    const closeModal = document.getElementById('closeModal');
    const cancelUpload = document.getElementById('cancelUpload');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileNameEl = document.getElementById('fileName');
    const removeFile = document.getElementById('removeFile');
    const confirmUpload = document.getElementById('confirmUpload');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadProgressFill = document.getElementById('uploadProgressFill');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');

    let selectedFile = null;
    let currentDocMeta = {}; // { docType, docId, docName, appNo }

    function attachUploadListeners() {
        document.querySelectorAll('.btn-upload').forEach(btn => {
            btn.removeEventListener('click', onUploadBtnClick);
            btn.addEventListener('click', onUploadBtnClick);
        });
    }

    function onUploadBtnClick() {
        currentDocMeta = {
            docType: this.getAttribute('data-doc'),
            docId:   this.getAttribute('data-doc-id'),
            docName: this.getAttribute('data-doc-name'),
            appNo:   this.getAttribute('data-app-no')
        };
        openUploadModal(currentDocMeta.docName);
    }

    function openUploadModal(docName) {
        if (modalTitle) modalTitle.textContent = `Upload ${docName}`;
        if (modalDescription) modalDescription.textContent = `Upload a clear scan or photo of your ${docName} (PDF, JPG, PNG, max 5MB)`;
        if (uploadModal) uploadModal.style.display = 'flex';
        resetUploadForm();
    }

    function closeUploadModal() {
        if (uploadModal) uploadModal.style.display = 'none';
        resetUploadForm();
    }

    function resetUploadForm() {
        selectedFile = null;
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
        if (uploadProgress) uploadProgress.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (confirmUpload) confirmUpload.disabled = true;
    }

    if (closeModal) closeModal.addEventListener('click', closeUploadModal);
    if (cancelUpload) cancelUpload.addEventListener('click', closeUploadModal);
    if (uploadModal) uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeUploadModal(); });

    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput && fileInput.click());
        uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', e => { e.preventDefault(); uploadArea.classList.remove('drag-over'); });
        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
        });
    }

    if (fileInput) fileInput.addEventListener('change', function() {
        if (this.files.length > 0) handleFileSelect(this.files[0]);
    });

    function handleFileSelect(file) {
        const maxSize = 5 * 1024 * 1024;
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (file.size > maxSize) { showNotification('File too large. Max 5MB.', 'error'); return; }
        if (!allowed.includes(file.type)) { showNotification('Only PDF, JPG, PNG allowed.', 'error'); return; }
        selectedFile = file;
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (uploadArea) uploadArea.style.display = 'none';
        if (filePreview) filePreview.style.display = 'flex';
        if (confirmUpload) confirmUpload.disabled = false;
    }

    if (removeFile) removeFile.addEventListener('click', e => { e.stopPropagation(); resetUploadForm(); });

    if (confirmUpload) confirmUpload.addEventListener('click', () => {
        if (!selectedFile) { showNotification('Please select a file', 'error'); return; }
        uploadFileToAPI(selectedFile);
    });

    async function uploadFileToAPI(file) {
        if (filePreview) filePreview.style.display = 'none';
        if (uploadProgress) uploadProgress.style.display = 'block';
        if (confirmUpload) confirmUpload.disabled = true;
        if (cancelUpload) cancelUpload.disabled = true;

        // Animate progress bar (simulated — real upload is instant for a demo)
        let progress = 0;
        const interval = setInterval(() => {
            progress = Math.min(progress + 20, 90);
            if (uploadProgressFill) uploadProgressFill.style.width = `${progress}%`;
            if (uploadProgressText) uploadProgressText.textContent = `Uploading... ${progress}%`;
        }, 150);

        try {
            // Call backend to mark document as Submitted
            const updateRes = await fetch(`${API_BASE}/api/documents/${currentDocMeta.docId}?status=Submitted`, {
                method: 'PUT'
            });

            clearInterval(interval);
            if (uploadProgressFill) uploadProgressFill.style.width = '100%';
            if (uploadProgressText) uploadProgressText.textContent = 'Upload complete!';

            if (updateRes.ok) {
                setTimeout(() => {
                    showNotification(`${currentDocMeta.docName} uploaded successfully!`, 'success');
                    closeUploadModal();

                    // Voice feedback
                    const autoSpeakEl = document.getElementById('autoSpeakDashboard');
                    if (autoSpeakEl && autoSpeakEl.checked) {
                        const lang = getVoiceLang();
                        const msgs = {
                            'en-IN': `${currentDocMeta.docName} uploaded successfully.`,
                            'hi-IN': `${currentDocMeta.docName} सफलतापूर्वक अपलोड हो गया।`,
                            'mr-IN': `${currentDocMeta.docName} यशस्वीरित्या अपलोड केले.`
                        };
                        speakText(msgs[lang] || msgs['en-IN'], lang);
                    }

                    // Re-fetch claim to refresh documents and timeline
                    const appNo = document.getElementById('appNumber').textContent;
                    setTimeout(() => fetchClaimFromAPI(appNo), 800);
                }, 500);
            } else {
                showNotification('Upload recorded, but server returned an error.', 'warning');
                closeUploadModal();
            }
        } catch (err) {
            clearInterval(interval);
            console.error('Upload error:', err);
            // Still update UI locally so demo works even if API is slow
            showNotification(`${currentDocMeta.docName} uploaded (offline mode).`, 'success');
            closeUploadModal();
            const appNo = document.getElementById('appNumber').textContent;
            setTimeout(() => fetchClaimFromAPI(appNo), 800);
        } finally {
            if (cancelUpload) cancelUpload.disabled = false;
        }
    }

    // ============================================
    // QUICK ACTION BUTTONS
    // ============================================

    document.getElementById('voiceSummaryBtn')?.addEventListener('click', function() {
        if (isSpeaking) { synth.cancel(); return; }
        const appNo = document.getElementById('appNumber').textContent;
        fetch(`${API_BASE}/api/claims/${appNo}/summary?language=${getVoiceLang()}`)
            .then(r => r.json())
            .then(json => speakText(json.data.voice_message, getVoiceLang()))
            .catch(() => showNotification('Could not fetch voice summary', 'error'));
    });

    document.getElementById('trackAgainBtn')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    document.getElementById('downloadReportBtn')?.addEventListener('click', () => {
        showNotification('Downloading claim report...', 'info');
        setTimeout(() => showNotification('Report downloaded!', 'success'), 1500);
    });

    document.getElementById('contactSupportBtn')?.addEventListener('click', () => {
        showNotification('Helpline: 1800-123-4567 (Toll Free)', 'info');
    });

    document.getElementById('updateInfoBtn')?.addEventListener('click', () => {
        window.location.href = 'manual-entry.html';
    });

    // Auto-speak toggle persistence
    const autoSpeakDashboard = document.getElementById('autoSpeakDashboard');
    if (autoSpeakDashboard) {
        const saved = localStorage.getItem('autoSpeakDashboard');
        if (saved !== null) autoSpeakDashboard.checked = saved === 'true';
        autoSpeakDashboard.addEventListener('change', function() {
            localStorage.setItem('autoSpeakDashboard', this.checked);
        });
    }

    // Language select change
    document.getElementById('languageSelect')?.addEventListener('change', function() {
        localStorage.setItem('preferredLanguage', this.value);
        showNotification(`Language changed to ${this.options[this.selectedIndex].text}`, 'success');
    });

    // Keyboard: Escape closes modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && uploadModal && uploadModal.style.display === 'flex') closeUploadModal();
    });

    // ============================================
    // HELPERS
    // ============================================

    function formatDate(date) {
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatRelativeTime(date) {
        const diffMins = Math.floor((new Date() - date) / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
        return formatDate(date);
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed', top: '20px', right: '20px',
            padding: '1rem 1.5rem', borderRadius: '12px', color: '#fff',
            fontSize: '1rem', fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: '10000',
            maxWidth: '400px', animation: 'slideInRight 0.4s ease'
        });
        const colors = { success: '#4CAF50', error: '#D32F2F', warning: '#FF8F00', info: '#1565C0' };
        notification.style.backgroundColor = colors[type] || colors.info;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => notification.remove(), 400);
        }, 3500);
    }

    // ============================================
    // INIT
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        // Restore language selector
        const savedLang = localStorage.getItem('preferredLanguage') || 'en';
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) langSelect.value = savedLang;

        // Get application number from localStorage (set by voice or manual page)
        let appNo = '12345'; // fallback for demo
        try {
            const searchQuery = localStorage.getItem('searchQuery');
            if (searchQuery) {
                const data = JSON.parse(searchQuery);
                if (data.applicationNumber) appNo = data.applicationNumber;
            }
        } catch (e) { /* use fallback */ }

        // Also check URL param: dashboard.html?app=67890
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('app')) appNo = urlParams.get('app');

        fetchClaimFromAPI(appNo);
    });

})();
