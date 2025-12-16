(() => {
    // Kurze Verzögerung, um sicherzustellen, dass HTML gerendert ist
    setTimeout(() => {
        console.log('[Download.js] Script initialized');

        // --- ELEMENTS ---
        const urlInput = document.getElementById('url-input');
        const startBtn = document.getElementById('start-download-btn');
        const pasteBtn = document.getElementById('paste-btn');
        
        // Status & Modal Elements
        const statusContainer = document.getElementById('status-container');
        const statusMessage = document.getElementById('status-message');
        const modal = document.getElementById('format-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const confirmDownloadBtn = document.getElementById('confirm-download-btn');

        // Sicherheits-Check mit detaillierter Ausgabe
        if (!urlInput || !startBtn || !modal) {
            console.error('[Download.js] Critical elements missing! Check HTML.');
            console.log('urlInput:', urlInput);
            console.log('startBtn:', startBtn);
            console.log('modal:', modal);
            return;
        }

        console.log('[Download.js] Elements found. Attaching listeners.');

        // --- HELPER FUNCTIONS ---
        
        const isValidUrl = (string) => {
            if (!string || string.trim().length === 0) return false;
            return string.includes('.') && !string.includes(' ');
        };

        const validateState = () => {
            const isValid = isValidUrl(urlInput.value);
            startBtn.disabled = !isValid;
            
            if (isValid) {
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
            } else {
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
            }
        };

        const normalizeUrl = (url) => {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return 'https://' + url;
            }
            return url;
        };

        // --- EVENT LISTENERS ---

        urlInput.addEventListener('input', () => {
            validateState();
        });

        if (pasteBtn) {
            pasteBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        urlInput.value = text;
                        validateState();
                        urlInput.focus();
                    }
                } catch (err) {
                    urlInput.focus();
                }
            });
        }

        // --- MODAL LOGIC ---

        const showModal = () => {
            modal.classList.remove('hidden');
            // Explizites Style-Setzen für maximale Sicherheit
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        };

        startBtn.addEventListener('click', (e) => {
            console.log('[Download.js] Opening modal...');
            if (startBtn.disabled) return;
            showModal();
        });

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // --- SERVER LOGIC ---

        if (confirmDownloadBtn) {
            confirmDownloadBtn.addEventListener('click', async () => {
                console.log('[Download.js] Starting download process...');
                
                const selectedFormatEl = document.querySelector('input[name="dl-format"]:checked');
                const selectedFormat = selectedFormatEl ? selectedFormatEl.value : 'mp4';
                const finalUrl = normalizeUrl(urlInput.value.trim());

                closeModal();
                statusContainer.classList.remove('hidden');
                statusContainer.style.display = 'block'; 
                
                urlInput.disabled = true;
                startBtn.disabled = true;
                statusMessage.textContent = "Initializing server process... please wait.";
                statusMessage.style.color = 'var(--text-color)';

                try {
                    const response = await fetch('api/downloader/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: finalUrl, type: selectedFormat })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        statusMessage.textContent = "Processing complete! Download starting...";
                        statusMessage.style.color = '#4ade80'; 
                        
                        const a = document.createElement('a');
                        a.href = data.downloadUrl;
                        a.download = data.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        setTimeout(() => {
                            statusContainer.classList.add('hidden');
                            statusContainer.style.display = 'none';
                            urlInput.disabled = false;
                            urlInput.value = '';
                            validateState();
                        }, 4000);

                    } else {
                        const errData = await response.json();
                        statusMessage.textContent = `Error: ${errData.message || 'Download failed'}`;
                        statusMessage.style.color = '#ff5c5c'; 
                        
                        setTimeout(() => {
                            urlInput.disabled = false;
                            validateState();
                        }, 3000);
                    }

                } catch (error) {
                    console.error('[Download.js] Error:', error);
                    statusMessage.textContent = "Network error occurred.";
                    statusMessage.style.color = '#ff5c5c';
                    setTimeout(() => {
                        urlInput.disabled = false;
                        validateState();
                    }, 3000);
                }
            });
        }

        // Initial check
        validateState();
        
    }, 50); // 50ms Delay to ensure HTML is ready
})();