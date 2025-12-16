(() => {
    setTimeout(() => {
        // --- ELEMENTS ---
        const urlInput = document.getElementById('url-input');
        const startBtn = document.getElementById('start-download-btn');
        const pasteBtn = document.getElementById('paste-btn');
        
        // Modal Elements
        const modal = document.getElementById('format-modal');
        const modalTitle = document.getElementById('modal-title');
        const closeModalBtn = document.getElementById('close-modal-btn');
        
        // Modal Views
        const selectionView = document.getElementById('format-selection-view');
        const progressView = document.getElementById('progress-view');
        
        // Selection View Elements
        const confirmDownloadBtn = document.getElementById('confirm-download-btn');
        
        // Progress View Elements
        const modalStatusMessage = document.getElementById('modal-status-message');
        const modalProgressTrack = document.getElementById('modal-progress-track');
        const finalFileInfo = document.getElementById('final-file-info');
        const finalDownloadBtn = document.getElementById('modal-final-download-btn');

        // Check for critical elements
        if (!urlInput || !startBtn || !modal || !confirmDownloadBtn || !progressView) {
            console.error('Download.js: Critical elements missing from HTML.');
            return;
        }

        let downloadData = null; // To store { downloadUrl, filename }

        // --- HELPER FUNCTIONS ---
        
        const isValidUrl = (string) => (string && string.includes('.') && !string.includes(' '));
        const normalizeUrl = (url) => (!url.startsWith('http://') && !url.startsWith('https://') ? 'https://' + url : url);

        const validateState = () => {
            const isValid = isValidUrl(urlInput.value);
            startBtn.disabled = !isValid;
        };

        const showSelectionView = () => {
            modalTitle.textContent = "Select Format";
            progressView.classList.add('hidden');
            selectionView.classList.remove('hidden');
            closeModalBtn.disabled = false;
        };

        const showProgressView = () => {
            modalTitle.textContent = "Processing File";
            selectionView.classList.add('hidden');
            progressView.classList.remove('hidden');

            // Reset progress state
            modalStatusMessage.textContent = "Initializing server process... please wait.";
            modalStatusMessage.style.color = 'var(--text-muted)';
            modalProgressTrack.classList.remove('hidden');
            finalFileInfo.classList.add('hidden');
            finalDownloadBtn.disabled = true;
            closeModalBtn.disabled = true; // Prevent closing during processing
        };

        const resetModal = () => {
            showSelectionView();
            downloadData = null; // Clear saved download data
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            resetModal();
        };

        // --- EVENT LISTENERS ---

        urlInput.addEventListener('input', validateState);

        if (pasteBtn) {
            pasteBtn.addEventListener('click', async () => {
                try {
                    urlInput.value = await navigator.clipboard.readText();
                    validateState();
                    urlInput.focus();
                } catch (err) { console.error('Failed to read clipboard'); }
            });
        }

        // Open Modal
        startBtn.addEventListener('click', () => {
            if (startBtn.disabled) return;
            modal.classList.remove('hidden');
        });

        // Close Modal
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

        // --- CORE LOGIC ---

        // 1. User confirms format, starts server process
        confirmDownloadBtn.addEventListener('click', async () => {
            showProgressView();

            const selectedFormat = document.querySelector('input[name="dl-format"]:checked').value;
            const finalUrl = normalizeUrl(urlInput.value.trim());
            
            try {
                const response = await fetch('api/downloader/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: finalUrl, type: selectedFormat })
                });

                if (response.ok) {
                    // SUCCESS: File is ready on server
                    downloadData = await response.json();
                    
                    modalStatusMessage.textContent = "Your file is ready!";
                    modalStatusMessage.style.color = '#4ade80';
                    modalProgressTrack.classList.add('hidden');
                    
                    finalFileInfo.textContent = downloadData.filename;
                    finalFileInfo.classList.remove('hidden');
                    
                    finalDownloadBtn.disabled = false;
                    closeModalBtn.disabled = false; // Allow closing now

                } else {
                    // ERROR from server
                    const errData = await response.json();
                    throw new Error(errData.message || 'Download failed on the server.');
                }

            } catch (error) {
                // NETWORK or other fetch errors
                console.error('Download process error:', error);
                modalStatusMessage.textContent = `Error: ${error.message}`;
                modalStatusMessage.style.color = '#ff5c5c';
                modalProgressTrack.classList.add('hidden');
                closeModalBtn.disabled = false;
            }
        });

        // 2. User clicks the final download button
        finalDownloadBtn.addEventListener('click', () => {
            if (!downloadData || finalDownloadBtn.disabled) return;
            
            const a = document.createElement('a');
            a.href = downloadData.downloadUrl;
            a.download = downloadData.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Close the modal after starting the download
            setTimeout(closeModal, 500);
        });

        // Initial check
        validateState();
        
    }, 50); // Delay to ensure all elements are loaded
})();