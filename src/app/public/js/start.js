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
    const fileCountEl = document.getElementById('cloud-file-count');
    if (!fileCountEl) return;

    try {
        const response = await fetch('api/cloud/stats');
        if (response.ok) {
            const data = await response.json();

            // Animate counting up
            const target = data.fileCount;
            let count = 0;
            const duration = 1000;
            const interval = 20;
            const steps = duration / interval;
            const increment = Math.ceil(target / steps);

            if (target === 0) {
                fileCountEl.textContent = '0';
                return;
            }

            const timer = setInterval(() => {
                count += increment;
                if (count >= target) {
                    count = target;
                    clearInterval(timer);
                }
                fileCountEl.textContent = count;
            }, interval);
        } else {
            fileCountEl.textContent = '-';
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        fileCountEl.textContent = 'Err';
    }
}
