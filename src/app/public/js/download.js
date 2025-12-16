(() => {
    // --- ELEMENTS ---
    const urlInput = document.getElementById('url-input');
    const downloadBtn = document.getElementById('start-download-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const statusContainer = document.getElementById('status-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percentage');
    const statusMessage = document.getElementById('status-message');

    // --- HELPER FUNCTIONS ---
    const isValidUrl = (string) => {
        try { new URL(string); return string.includes('://'); } 
        catch (_) { return false; }
    };

    const validateState = () => {
        downloadBtn.disabled = !isValidUrl(urlInput.value);
    };

    // --- EVENT LISTENERS ---
    
    // 1. Input Validation
    urlInput.addEventListener('input', validateState);

    // 2. Paste Functionality
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                urlInput.value = text;
                urlInput.focus();
                validateState();
                
                // Visual Feedback for Paste
                const originalIcon = pasteBtn.innerHTML;
                pasteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => pasteBtn.innerHTML = originalIcon, 1000);
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            // Fallback: Just focus input so user can CTRL+V
            urlInput.focus();
        }
    });

    // 3. Download Simulation
    downloadBtn.addEventListener('click', () => {
        // UI Reset
        statusContainer.classList.remove('hidden');
        downloadBtn.disabled = true;
        urlInput.disabled = true;
        pasteBtn.disabled = true;
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        statusMessage.textContent = 'Connecting to server...';

        let percentage = 0;
        const interval = setInterval(() => {
            // Non-linear progress simulation
            const increment = Math.random() * 15;
            percentage += increment;
            
            if (percentage > 100) percentage = 100;

            // Update UI
            progressBar.style.width = `${percentage}%`;
            progressPercent.textContent = `${Math.floor(percentage)}%`;

            // Dynamic status messages
            if (percentage < 30) statusMessage.textContent = 'Analyzing link...';
            else if (percentage < 60) statusMessage.textContent = 'Converting media...';
            else if (percentage < 90) statusMessage.textContent = 'Finalizing download...';

            if (percentage >= 100) {
                clearInterval(interval);
                statusMessage.textContent = 'Download ready! Starting...';
                statusMessage.style.color = '#4ade80'; // Success green
                
                setTimeout(() => {
                    // Reset Form
                    statusContainer.classList.add('hidden');
                    urlInput.disabled = false;
                    pasteBtn.disabled = false;
                    urlInput.value = '';
                    statusMessage.style.color = 'var(--text-muted)';
                    validateState();
                }, 3000);
            }
        }, 200);
    });

})();