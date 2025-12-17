document.addEventListener('DOMContentLoaded', () => {
    // If the script is loaded via the dashboard loader, the DOM might already be ready
    fetchStats();
});

// Also try immediately incase DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Event listener already added above
} else {
    fetchStats();
}

async function fetchStats() {
    const cloudCountEl = document.getElementById('cloud-file-count');
    const downloadCountEl = document.getElementById('total-downloads-count');

    // Wenn beide Elemente nicht existieren, abbrechen
    if (!cloudCountEl && !downloadCountEl) return;

    try {
        const response = await fetch('api/cloud/stats');
        if (response.ok) {
            const data = await response.json();

            // Reusable animation function
            const animateValue = (element, targetValue) => {
                if (!element) return;
                
                const target = parseInt(targetValue) || 0;
                if (target === 0) {
                    element.textContent = '0';
                    return;
                }

                let count = 0;
                const duration = 1000;
                const interval = 20;
                const steps = duration / interval;
                const increment = Math.ceil(target / steps);

                const timer = setInterval(() => {
                    count += increment;
                    if (count >= target) {
                        count = target;
                        clearInterval(timer);
                    }
                    element.textContent = count.toLocaleString(); // Tausendertrennzeichen
                }, interval);
            };

            // Animate Cloud Files
            animateValue(cloudCountEl, data.fileCount);

            // Animate Downloaded Files
            animateValue(downloadCountEl, data.downloadCount);

        } else {
            if(cloudCountEl) cloudCountEl.textContent = '-';
            if(downloadCountEl) downloadCountEl.textContent = '-';
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        if(cloudCountEl) cloudCountEl.textContent = 'Err';
        if(downloadCountEl) downloadCountEl.textContent = 'Err';
    }
}