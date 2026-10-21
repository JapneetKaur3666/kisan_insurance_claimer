/* ============================================
   VOICE RECOGNITION JAVASCRIPT
   ============================================ */

/* INTERVIEW POINT: Immediately Invoked Function Expression (IIFE)
   Why? Prevents global namespace pollution */

(function() {
    'use strict'; // INTERVIEW POINT: Strict mode catches common errors
    
    console.log('🎤 Voice Recognition Module Loaded');
    
    // ============================================
    // VARIABLE DECLARATIONS
    // ============================================
    
    /* INTERVIEW POINT: const vs let vs var
       - const: Cannot be reassigned (use for fixed references)
       - let: Block-scoped, can be reassigned
       - var: Function-scoped (avoid in modern JS) */
    
    const micBtn = document.getElementById('micBtn');
    const soundWaves = document.getElementById('soundWaves');
    const statusText = document.getElementById('statusText');
    const recognizedSection = document.getElementById('recognizedSection');
    const recognizedText = document.getElementById('recognizedText');
    const extractedAppNo = document.getElementById('extractedAppNo');
    const extractedSeason = document.getElementById('extractedSeason');
    const extractedCrop = document.getElementById('extractedCrop');
    const confirmBtn = document.getElementById('confirmBtn');
    const retryBtn = document.getElementById('retryBtn');
    const editBtn = document.getElementById('editBtn');
    const voiceLanguage = document.getElementById('voiceLanguage');
    const compatibilityNotice = document.getElementById('compatibilityNotice');
    const recentSearches = document.getElementById('recentSearches');
    const recentSearchesList = document.getElementById('recentSearchesList');
    const speakBtn = document.getElementById('speakBtn');
    const autoSpeak = document.getElementById('autoSpeak');
    
    /* INTERVIEW POINT: Let for variables that will change */
    let recognition = null;
    let isListening = false;
    let transcript = '';
    let extractedData = {
        applicationNumber: null,
        season: null,
        crop: null
    };
    let isSpeaking = false;
    
    // ============================================
    // TEXT-TO-SPEECH (SPEECH SYNTHESIS) SETUP
    // ============================================
    
    /* INTERVIEW POINT: Web Speech API has two parts:
       1. SpeechRecognition (speech-to-text) - Already implemented
       2. SpeechSynthesis (text-to-speech) - Adding now */
    
    const synth = window.speechSynthesis;
    
    // Check if speech synthesis is supported
    if ('speechSynthesis' in window) {
        console.log('✅ Speech Synthesis API supported');
    } else {
        console.warn('❌ Speech Synthesis API not supported');
    }
    
    /* INTERVIEW POINT: Function to speak text in selected language */
    function speakText(text, lang = 'en-IN') {
        // Stop any ongoing speech
        if (synth.speaking) {
            synth.cancel();
        }
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language (map recognition language to synthesis language)
        utterance.lang = lang;
        
        // Set voice properties
        utterance.rate = 0.9;  // Slightly slower for clarity
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 1.0; // Full volume
        
        // Event listeners for utterance
        utterance.onstart = function() {
            console.log('🔊 Speaking:', text);
            isSpeaking = true;
            if (speakBtn) {
                speakBtn.classList.add('speaking');
                speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speaking...';
            }
        };
        
        utterance.onend = function() {
            console.log('✅ Finished speaking');
            isSpeaking = false;
            if (speakBtn) {
                speakBtn.classList.remove('speaking');
                speakBtn.innerHTML = '<i class="fas fa-volume-up"></i> Hear What We Understood';
            }
        };
        
        utterance.onerror = function(event) {
            console.error('❌ Speech synthesis error:', event.error);
            isSpeaking = false;
            if (speakBtn) {
                speakBtn.classList.remove('speaking');
            }
        };
        
        // Speak the text
        synth.speak(utterance);
    }
    
    /* INTERVIEW POINT: Get translated phrases for different languages */
    function getLocalizedPhrase(key, lang, data = {}) {
        const phrases = {
            'en-IN': {
                recognized: `We heard: ${data.text}`,
                extracted: `Application number ${data.appNo}, ${data.season} season, ${data.crop} crop.`,
                missing: 'Some information could not be extracted. Please edit the text.',
                confidence: `Recognition confidence is ${data.confidence} percent.`
            },
            'hi-IN': {
                recognized: `हमने सुना: ${data.text}`,
                extracted: `आवेदन संख्या ${data.appNo}, ${data.season} मौसम, ${data.crop} फसल।`,
                missing: 'कुछ जानकारी निकाली नहीं जा सकी। कृपया पाठ संपादित करें।',
                confidence: `पहचान विश्वास ${data.confidence} प्रतिशत है।`
            },
            'mr-IN': {
                recognized: `आम्ही ऐकले: ${data.text}`,
                extracted: `अर्ज क्रमांक ${data.appNo}, ${data.season} हंगाम, ${data.crop} पीक।`,
                missing: 'काही माहिती काढली जाऊ शकली नाही। कृपया मजकूर संपादित करा।',
                confidence: `ओळख विश्वास ${data.confidence} टक्के आहे।`
            },
            // Add more languages as needed
        };
        
        return phrases[lang]?.[key] || phrases['en-IN'][key];
    }
    
    // ============================================
    // WEB SPEECH API SETUP
    // ============================================
    
    /* INTERVIEW POINT: Feature Detection (not browser detection)
       Why? More reliable, future-proof, graceful degradation */
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (typeof SpeechRecognition !== 'undefined') {
        console.log('✅ Speech Recognition API supported');
        initializeSpeechRecognition();
    } else {
        console.warn('❌ Speech Recognition API not supported');
        showCompatibilityWarning();
    }
    
    /* INTERVIEW POINT: Function Declaration vs Expression
       This is a function declaration - hoisted to top */
    function initializeSpeechRecognition() {
        // INTERVIEW POINT: Creating new instance of SpeechRecognition
        recognition = new SpeechRecognition();
        
        /* INTERVIEW POINT: Configuring recognition properties */
        recognition.continuous = false;      // Stop after one result
        recognition.interimResults = true;   // Get partial results
        recognition.maxAlternatives = 1;     // Number of alternative transcripts
        
        // Set language from dropdown (default: English-India)
        recognition.lang = voiceLanguage.value || 'en-IN';
        
        // INTERVIEW POINT: Event Listeners for Speech Recognition
        setupRecognitionEvents();
    }
    
    // ============================================
    // SPEECH RECOGNITION EVENT HANDLERS
    // ============================================
    
    function setupRecognitionEvents() {
        
        /* INTERVIEW POINT: onstart - Triggered when recognition begins */
        recognition.onstart = function() {
            console.log('🎤 Recognition started');
            isListening = true;
            updateUI('listening');
            statusText.textContent = 'Listening... Speak now!';
            micBtn.setAttribute('data-listening', 'true');
            soundWaves.style.display = 'flex';
        };
        
        /* INTERVIEW POINT: onresult - Most important event
           Receives speech recognition results */
        recognition.onresult = function(event) {
            console.log('📝 Recognition result received', event);
            
            /* INTERVIEW POINT: Accessing event results
               event.results is a SpeechRecognitionResultList */
            const last = event.results.length - 1;
            const result = event.results[last];
            transcript = result[0].transcript;
            
            /* INTERVIEW POINT: Confidence score (0 to 1)
               Higher = more confident in accuracy */
            const confidence = result[0].confidence;
            
            console.log(`Transcript: "${transcript}" (confidence: ${(confidence * 100).toFixed(0)}%)`);
            
            // Update UI with interim results
            statusText.textContent = `Heard: "${transcript}"`;
            
            // Show confidence bar
            updateConfidenceBar(confidence);
            
            /* INTERVIEW POINT: isFinal property
               True when recognition is complete */
            if (result.isFinal) {
                processFinalTranscript(transcript, confidence);
            }
        };
        
        /* INTERVIEW POINT: onerror - Error handling */
        recognition.onerror = function(event) {
            console.error('❌ Recognition error:', event.error);
            
            /* INTERVIEW POINT: Switch statement for error types */
            switch (event.error) {
                case 'no-speech':
                    statusText.textContent = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    statusText.textContent = 'Microphone not found. Check permissions.';
                    break;
                case 'not-allowed':
                    statusText.textContent = 'Microphone permission denied.';
                    break;
                case 'network':
                    statusText.textContent = 'Network error. Check internet connection.';
                    break;
                default:
                    statusText.textContent = `Error: ${event.error}`;
            }
            
            resetUI();
        };
        
        /* INTERVIEW POINT: onend - Recognition stopped */
        recognition.onend = function() {
            console.log('⏹️ Recognition ended');
            isListening = false;
            micBtn.setAttribute('data-listening', 'false');
            soundWaves.style.display = 'none';
        };
    }
    
    // ============================================
    // MICROPHONE BUTTON HANDLER
    // ============================================
    
    /* INTERVIEW POINT: Event listener for button click */
    if (micBtn) {
        micBtn.addEventListener('click', function() {
            
            if (!recognition) {
                alert('Speech recognition not available in this browser.');
                return;
            }
            
            /* INTERVIEW POINT: Toggle behavior - start/stop */
            if (isListening) {
                // Stop listening
                recognition.stop();
                statusText.textContent = 'Stopped listening';
                resetUI();
            } else {
                // Start listening
                try {
                    // Update language before starting
                    recognition.lang = voiceLanguage.value;
                    recognition.start();
                } catch (error) {
                    console.error('Error starting recognition:', error);
                    statusText.textContent = 'Error starting microphone. Try again.';
                }
            }
        });
    }
    
    // ============================================
    // LANGUAGE CHANGE HANDLER
    // ============================================
    
    /* INTERVIEW POINT: Change event for dropdown */
    if (voiceLanguage) {
        voiceLanguage.addEventListener('change', function() {
            console.log('Language changed to:', this.value);
            
            // Update recognition language if active
            if (recognition && !isListening) {
                recognition.lang = this.value;
            }
            
            // Show notification
            showNotification(`Voice language set to: ${this.options[this.selectedIndex].text}`, 'success');
        });
    }
    
    // ============================================
    // NATURAL LANGUAGE PROCESSING (NLP)
    // ============================================
    
    /* INTERVIEW POINT: Text processing and pattern matching
       Using Regular Expressions (RegEx) */
    
    function processFinalTranscript(text, confidence) {
        console.log('Processing transcript:', text);
        
        // Display recognized text
        recognizedText.textContent = text;
        recognizedSection.style.display = 'block';
        
        // Extract information using NLP
        extractedData = extractInformation(text);
        
        // Update UI with extracted data
        updateExtractedInfo(extractedData);
        
        // Save to recent searches
        saveToRecentSearches(text, extractedData);
        
        // Show recent searches
        displayRecentSearches();
        
        statusText.textContent = confidence > 0.7 
            ? 'Recognition complete! ✅' 
            : 'Recognition complete (low confidence)';
        
        // INTERVIEW POINT: Auto-speak if enabled
        if (autoSpeak && autoSpeak.checked) {
            const currentLang = voiceLanguage.value;
            
            // Create summary to speak
            let summary = '';
            
            if (extractedData.applicationNumber && extractedData.season && extractedData.crop) {
                // All data extracted successfully
                summary = getLocalizedPhrase('extracted', currentLang, {
                    appNo: extractedData.applicationNumber,
                    season: extractedData.season,
                    crop: extractedData.crop
                });
            } else {
                // Some data missing
                summary = getLocalizedPhrase('missing', currentLang);
            }
            
            // Speak after a brief delay
            setTimeout(() => {
                speakText(summary, currentLang);
            }, 500);
        }
    }
    
    /* INTERVIEW POINT: Regular Expressions for pattern matching */
    function extractInformation(text) {
        const data = {
            applicationNumber: null,
            season: null,
            crop: null
        };
        
        // INTERVIEW POINT: RegEx to extract numbers
        // Match 4-6 digit numbers
        const numberPattern = /\b(\d{4,6})\b/;
        const numberMatch = text.match(numberPattern);
        if (numberMatch) {
            data.applicationNumber = numberMatch[1];
        }
        
        // INTERVIEW POINT: Case-insensitive matching with /i flag
        // Extract season (Kharif, Rabi)
        const seasonPattern = /\b(kharif|rabi|summer|zaid)\b/i;
        const seasonMatch = text.match(seasonPattern);
        if (seasonMatch) {
            data.season = seasonMatch[1].charAt(0).toUpperCase() + seasonMatch[1].slice(1);
        }
        
        // Extract crop type
        const cropPattern = /\b(rice|wheat|cotton|maize|sugarcane|pulses|soybean|groundnut|bajra|jowar)\b/i;
        const cropMatch = text.match(cropPattern);
        if (cropMatch) {
            data.crop = cropMatch[1].charAt(0).toUpperCase() + cropMatch[1].slice(1);
        }
        
        console.log('Extracted data:', data);
        return data;
    }
    
    function updateExtractedInfo(data) {
        extractedAppNo.textContent = data.applicationNumber || 'Not detected';
        extractedSeason.textContent = data.season || 'Not detected';
        extractedCrop.textContent = data.crop || 'Not detected';
        
        // INTERVIEW POINT: Conditional styling based on data
        [extractedAppNo, extractedSeason, extractedCrop].forEach(element => {
            if (element.textContent === 'Not detected') {
                element.style.color = 'var(--error)';
            } else {
                element.style.color = 'var(--primary-green)';
            }
        });
    }
    
    // ============================================
    // CONFIDENCE BAR UPDATE
    // ============================================
    
    function updateConfidenceBar(confidence) {
        const confidenceBar = document.getElementById('confidenceBar');
        const confidenceFill = confidenceBar.querySelector('.confidence-fill');
        
        confidenceBar.style.display = 'block';
        
        // INTERVIEW POINT: Template literals for dynamic values
        confidenceFill.style.width = `${confidence * 100}%`;
        
        // Color based on confidence level
        if (confidence > 0.8) {
            confidenceFill.style.background = '#4CAF50'; // Green
        } else if (confidence > 0.6) {
            confidenceFill.style.background = '#FFC107'; // Yellow
        } else {
            confidenceFill.style.background = '#FF5722'; // Red
        }
    }
    
    // ============================================
    // BUTTON HANDLERS
    // ============================================
    
    /* INTERVIEW POINT: Confirm button - calls API then navigates */
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async function() {
            
            if (!extractedData.applicationNumber) {
                showNotification('Application number is required!', 'warning');
                return;
            }
            
            // Save data for dashboard fallback
            localStorage.setItem('searchQuery', JSON.stringify({
                applicationNumber: extractedData.applicationNumber,
                season: extractedData.season,
                crop: extractedData.crop,
                timestamp: new Date().toISOString()
            }));

            // Disable button while checking
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Checking...';

            try {
                const res = await fetch(`http://localhost:8001/api/claims/${extractedData.applicationNumber}`);

                if (res.ok) {
                    showNotification('Claim found! Loading dashboard...', 'success');
                    setTimeout(() => {
                        window.location.href = `dashboard.html?app=${extractedData.applicationNumber}`;
                    }, 800);
                } else if (res.status === 404) {
                    showNotification(`No claim found for application number ${extractedData.applicationNumber}. Please try again.`, 'error');
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Check Status';
                } else {
                    // Proceed anyway on server errors
                    window.location.href = `dashboard.html?app=${extractedData.applicationNumber}`;
                }
            } catch (err) {
                // Backend not reachable — graceful fallback
                console.warn('Backend unreachable:', err);
                showNotification('Loading dashboard...', 'info');
                setTimeout(() => {
                    window.location.href = `dashboard.html?app=${extractedData.applicationNumber}`;
                }, 800);
            }
        });
    }
    
    /* INTERVIEW POINT: Retry button - reset and try again */
    if (retryBtn) {
        retryBtn.addEventListener('click', function() {
            recognizedSection.style.display = 'none';
            transcript = '';
            extractedData = {
                applicationNumber: null,
                season: null,
                crop: null
            };
            statusText.textContent = 'Tap the microphone to start';
            
            // Auto-start recognition
            if (recognition) {
                setTimeout(() => {
                    recognition.start();
                }, 500);
            }
        });
    }
    
    /* INTERVIEW POINT: Edit button - allow manual correction */
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            /* INTERVIEW POINT: prompt() for simple user input
               In production, use custom modal */
            const edited = prompt('Edit the recognized text:', recognizedText.textContent);
            
            if (edited && edited.trim()) {
                recognizedText.textContent = edited;
                extractedData = extractInformation(edited);
                updateExtractedInfo(extractedData);
            }
        });
    }
    
    // ============================================
    // SPEAK BUTTON HANDLER
    // ============================================
    
    /* INTERVIEW POINT: Text-to-Speech on button click */
    if (speakBtn) {
        speakBtn.addEventListener('click', function() {
            const textToSpeak = recognizedText.textContent;
            const currentLang = voiceLanguage.value;
            
            if (!textToSpeak) {
                showNotification('⚠️ No text to speak', 'warning');
                return;
            }
            
            // If already speaking, stop
            if (isSpeaking) {
                synth.cancel();
                return;
            }
            
            // Create detailed summary
            let summary = getLocalizedPhrase('recognized', currentLang, {
                text: textToSpeak
            });
            
            // Add extracted information
            if (extractedData.applicationNumber || extractedData.season || extractedData.crop) {
                summary += ' ' + getLocalizedPhrase('extracted', currentLang, {
                    appNo: extractedData.applicationNumber || 'not detected',
                    season: extractedData.season || 'not detected',
                    crop: extractedData.crop || 'not detected'
                });
            }
            
            speakText(summary, currentLang);
        });
    }
    
    // ============================================
    // AUTO-SPEAK TOGGLE
    // ============================================
    
    /* INTERVIEW POINT: Save auto-speak preference */
    if (autoSpeak) {
        // Load saved preference
        const savedAutoSpeak = localStorage.getItem('autoSpeak');
        if (savedAutoSpeak !== null) {
            autoSpeak.checked = savedAutoSpeak === 'true';
        }
        
        // Save on change
        autoSpeak.addEventListener('change', function() {
            localStorage.setItem('autoSpeak', this.checked);
            const status = this.checked ? 'enabled' : 'disabled';
            showNotification(`🔊 Auto-speak ${status}`, 'success');
        });
    }
    
    // ============================================
    // LOCAL STORAGE - RECENT SEARCHES
    // ============================================
    
    /* INTERVIEW POINT: LocalStorage for persistent data
       Stores data across browser sessions */
    
    function saveToRecentSearches(text, data) {
        // INTERVIEW POINT: Try-catch for error handling
        try {
            // Get existing searches
            let searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            
            // Add new search
            searches.unshift({
                text: text,
                data: data,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 5 searches
            searches = searches.slice(0, 5);
            
            // Save back to localStorage
            localStorage.setItem('recentSearches', JSON.stringify(searches));
            
            console.log('Saved to recent searches');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    function displayRecentSearches() {
        try {
            const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            
            if (searches.length === 0) {
                recentSearches.style.display = 'none';
                return;
            }
            
            recentSearches.style.display = 'block';
            recentSearchesList.innerHTML = '';
            
            /* INTERVIEW POINT: Array.forEach() for iteration */
            searches.forEach((search, index) => {
                /* INTERVIEW POINT: Creating DOM elements dynamically */
                const item = document.createElement('div');
                item.className = 'recent-item';
                
                /* INTERVIEW POINT: Template literals with embedded expressions */
                item.innerHTML = `
                    <div>
                        <strong>${search.data.applicationNumber || 'N/A'}</strong>
                        <span> - ${search.text.substring(0, 50)}...</span>
                    </div>
                    <small>${formatTimestamp(search.timestamp)}</small>
                `;
                
                // Click to reuse
                item.addEventListener('click', function() {
                    recognizedText.textContent = search.text;
                    extractedData = search.data;
                    updateExtractedInfo(extractedData);
                    recognizedSection.style.display = 'block';
                });
                
                recentSearchesList.appendChild(item);
            });
        } catch (error) {
            console.error('Error displaying recent searches:', error);
        }
    }
    
    /* INTERVIEW POINT: Date formatting */
    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
        return date.toLocaleDateString();
    }
    
    // ============================================
    // UI HELPER FUNCTIONS
    // ============================================
    
    function updateUI(state) {
        // Add visual feedback based on state
        switch (state) {
            case 'listening':
                micBtn.classList.add('active');
                break;
            case 'processing':
                statusText.textContent = 'Processing...';
                break;
            case 'complete':
                statusText.textContent = 'Complete!';
                break;
        }
    }
    
    function resetUI() {
        micBtn.setAttribute('data-listening', 'false');
        soundWaves.style.display = 'none';
        isListening = false;
    }
    
    function showCompatibilityWarning() {
        if (compatibilityNotice) {
            compatibilityNotice.style.display = 'block';
        }
    }
    
    /* INTERVIEW POINT: Reusable notification function */
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
    // INITIALIZATION
    // ============================================
    
    /* INTERVIEW POINT: DOMContentLoaded ensures DOM is ready */
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Voice input page initialized');
        
        // Display recent searches on load
        displayRecentSearches();
        
        // Load saved language preference
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && voiceLanguage) {
            // Map UI language to voice recognition language
            const langMap = {
                'en': 'en-IN',
                'hi': 'hi-IN',
                'mr': 'mr-IN',
                'pa': 'pa-IN',
                'gu': 'gu-IN',
                'ta': 'ta-IN'
            };
            voiceLanguage.value = langMap[savedLanguage] || 'en-IN';
        }
    });
    
    /* INTERVIEW POINT: Export functions for testing (optional)
       In real projects, you might use modules */
    // window.VoiceRecognition = {
    //     extractInformation,
    //     processFinalTranscript
    // };
    
})(); // End of IIFE

console.log('🎤 Voice Recognition Module Ready');
