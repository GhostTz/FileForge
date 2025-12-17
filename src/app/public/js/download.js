(() => {
    setTimeout(() => {
        const urlInput = document.getElementById('url-input');
        const startBtn = document.getElementById('start-download-btn');
        const pasteBtn = document.getElementById('paste-btn');
        
        const modal = document.getElementById('format-modal');
        const modalTitle = document.getElementById('modal-title');
        const closeModalBtn = document.getElementById('close-modal-btn');
        
        const selectionView = document.getElementById('format-selection-view');
        const progressView = document.getElementById('progress-view');
        
        const confirmDownloadBtn = document.getElementById('confirm-download-btn');
        
        const modalStatusMessage = document.getElementById('modal-status-message');
        const modalProgressTrack = document.getElementById('modal-progress-track');
        const finalFileInfo = document.getElementById('final-file-info');
        const finalDownloadBtn = document.getElementById('modal-final-download-btn');

        if (!urlInput || !startBtn || !modal || !confirmDownloadBtn || !progressView) {
            console.error('Download.js: Critical elements missing from HTML.');
            return;
        }

        let downloadData = null;

        const ICONS = {
            mp3: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
            mp4: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`
        };

        const formatBytes = (bytes, decimals = 2) => {
            if (!bytes || bytes === 0) return 'Size unknown';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        };

        const isValidUrl = (string) => (string && string.includes('.') && !string.includes(' '));
        const normalizeUrl = (url) => (!url.startsWith('http://') && !url.startsWith('https://') ? 'https://' + url : url);

        const validateState = () => { startBtn.disabled = !isValidUrl(urlInput.value); };

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
            
            modalStatusMessage.textContent = "Initializing server process... please wait.";
            modalStatusMessage.style.color = 'var(--text-muted)';
            modalProgressTrack.classList.remove('hidden');
            finalFileInfo.classList.add('hidden');
            finalDownloadBtn.disabled = true;
            closeModalBtn.disabled = true;
        };
        
        const resetModal = () => { showSelectionView(); downloadData = null; };
        const closeModal = () => { modal.classList.add('hidden'); resetModal(); };

        urlInput.addEventListener('input', validateState);
        pasteBtn.addEventListener('click', async () => {
            try {
                urlInput.value = await navigator.clipboard.readText();
                validateState();
                urlInput.focus();
            } catch (err) { console.error('Failed to read clipboard'); }
        });

        startBtn.addEventListener('click', () => {
            if (startBtn.disabled) return;
            modal.classList.remove('hidden');
        });

        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

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
                    downloadData = await response.json();
                    
                    modalStatusMessage.textContent = "Your file is ready!";
                    modalStatusMessage.style.color = '#4ade80';
                    modalProgressTrack.classList.add('hidden');
                    
                    finalFileInfo.innerHTML = `
                        <div id="final-file-info-icon">${ICONS[selectedFormat] || ''}</div>
                        <div id="final-file-info-text">
                            <span id="final-file-info-name">${downloadData.filename}</span>
                            <span id="final-file-info-size">${formatBytes(downloadData.filesize)}</span>
                        </div>`;
                    finalFileInfo.classList.remove('hidden');
                    
                    finalDownloadBtn.disabled = false;
                    closeModalBtn.disabled = false;

                } else {
                    const errData = await response.json();
                    throw new Error(errData.message || 'Download failed on the server.');
                }
            } catch (error) {
                console.error('Download process error:', error);
                modalStatusMessage.textContent = `Error: ${error.message}`;
                modalStatusMessage.style.color = '#ff5c5c';
                modalProgressTrack.classList.add('hidden');
                closeModalBtn.disabled = false;
            }
        });

        finalDownloadBtn.addEventListener('click', () => {
            if (!downloadData || finalDownloadBtn.disabled) return;
            
            const a = document.createElement('a');
            a.href = downloadData.downloadUrl;
            a.download = downloadData.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(closeModal, 500);
        });

        validateState();
        
    }, 50);
})();