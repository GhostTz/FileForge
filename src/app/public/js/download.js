(() => {
    // --- ELEMENTS ---
    const urlInput = document.getElementById('url-input');
    const downloadBtn = document.getElementById('start-download-btn');
    const formatSelector = document.getElementById('format-selector');
    const mp3QualitySelector = document.getElementById('mp3-quality-selector');
    const mp4QualitySelector = document.getElementById('mp4-quality-selector');
    const statusCard = document.getElementById('status-card');
    const progressBar = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    const formatModal = document.getElementById('format-required-modal');

    // --- STATE ---
    let isFormatSelected = false;

    // --- HELPER FUNCTIONS ---
    const isValidUrl = (string) => {
        try { new URL(string); return string.includes('://'); } 
        catch (_) { return false; }
    };

    const validateState = () => {
        downloadBtn.disabled = !(isValidUrl(urlInput.value) && isFormatSelected);
    };

    // --- EVENT LISTENERS ---
    urlInput.addEventListener('input', validateState);

    formatSelector.addEventListener('change', (e) => {
        const selectedFormat = e.target.value;
        isFormatSelected = true;

        mp3QualitySelector.style.display = 'none';
        mp4QualitySelector.style.display = 'none';

        if (selectedFormat === 'mp3') {
            mp3QualitySelector.style.display = 'block';
        } else if (selectedFormat === 'mp4') {
            mp4QualitySelector.style.display = 'block';
        }

        validateState();
    });

    // --- DOWNLOAD SIMULATION ---
    downloadBtn.addEventListener('click', () => {
        // Final check before proceeding
        if (!isFormatSelected) {
            if (formatModal) formatModal.classList.add('visible');
            return;
        }

        statusCard.style.display = 'block';
        downloadBtn.disabled = true;
        urlInput.disabled = true;

        let percentage = 0;
        progressBar.style.width = '0%';
        progressText.textContent = 'Starting...';

        const interval = setInterval(() => {
            percentage += Math.floor(Math.random() * 5) + 1;
            if (percentage > 100) percentage = 100;

            progressBar.style.width = `${percentage}%`;
            progressText.textContent = `Processing ${percentage}%`;

            if (percentage >= 100) {
                clearInterval(interval);
                progressText.textContent = 'Success!';
                setTimeout(() => {
                    statusCard.style.display = 'none';
                    urlInput.disabled = false;
                    validateState(); // Re-validate to set button state correctly
                }, 3000);
            }
        }, 300);
    });

})();