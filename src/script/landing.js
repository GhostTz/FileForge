document.addEventListener('DOMContentLoaded', () => {

    const ICONS = {
        'icon-download': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        'icon-convert': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
        'icon-share': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`,
        'github-hero-btn': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.3.8 1 .8 1.9v2.8c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg> Star on GitHub`,
        'icon-github': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.3.8 1 .8 1.9v2.8c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg>`
    };

    const injectContent = (id, content) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = content;
    };
    
    const loadHTML = (elementId, url) => {
        return fetch(url).then(response => response.text()).then(data => injectContent(elementId, data)).catch(error => console.error('Error loading HTML:', error));
    };

    const setupIntersectionObserver = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => { entry.target.classList.add('visible'); }, delay);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        document.querySelectorAll('.anim-element').forEach(el => observer.observe(el));
    };

    const setupMouseEffects = () => {
        const spotlight = document.querySelector('.spotlight');
        document.addEventListener('mousemove', (e) => {
            spotlight.style.setProperty('--mouse-x', e.clientX + 'px');
            spotlight.style.setProperty('--mouse-y', e.clientY + 'px');
        });
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mouse-x-local', (e.clientX - rect.left) + 'px');
                card.style.setProperty('--mouse-y-local', (e.clientY - rect.top) + 'px');
            });
        });
    };

    const showToast = (message, type = 'default') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 4000);
    };

    const setupLiveNotifications = () => {
        const scenarios = [
            { type: 'download', text: 'Jemand aus Deutschland hat gerade ein Video heruntergeladen' },
            { type: 'convert', text: 'Jemand aus den USA hat gerade PNG zu JPG konvertiert' },
            { type: 'share', text: 'Jemand hat gerade eine 2GB Datei in die Cloud geladen' },
            { type: 'download', text: 'Jemand aus Frankreich hat gerade eine Playlist heruntergeladen' },
            { type: 'convert', text: 'Jemand aus Japan hat gerade MOV zu MP4 konvertiert' },
            { type: 'share', text: 'Jemand hat gerade einen Projektordner hochgeladen' },
            { type: 'download', text: 'Jemand aus Brasilien hat gerade einen Podcast als MP3 gespeichert' },
            { type: 'convert', text: 'Jemand aus Kanada hat gerade WAV zu MP3 konvertiert' },
            { type: 'share', text: 'Jemand hat gerade Urlaubsfotos hochgeladen' },
            { type: 'download', text: 'Jemand aus Australien hat gerade eine Doku gespeichert' }
        ];

        const icons = {
            download: ICONS['icon-download'],
            convert: ICONS['icon-convert'],
            share: ICONS['icon-share']
        };

        const showRandomNotification = () => {
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            const container = document.getElementById('live-notification-container');
            
            const notification = document.createElement('div');
            notification.className = 'live-notification';
            notification.innerHTML = `
                <div class="live-notification-icon">${icons[scenario.type]}</div>
                <div class="live-notification-text">${scenario.text}</div>
            `;
            container.appendChild(notification);

            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 500);
            }, 5000);
        };

        const startNotifications = () => {
            setTimeout(() => {
                showRandomNotification();
                startNotifications();
            }, (30 + Math.random() * 30) * 1000);
        };
        
        setTimeout(startNotifications, 10000);
    };

    const setupSecretsAndEvents = () => {
        console.log("%c                 _ _       \n ___ ___ ___ _| | |_ ___ \n|  _| . | -_| . | . | -_|\n|___|___|___|___|___|___|\n\n%cLooking under the hood? You're in the right place.\nFileForge is proudly open source (GPL-3.0).", "color: var(--primary-color); font-weight: bold;", "color: #c1c1c1;");
        
        const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;1
        document.addEventListener('keydown', (e) => {
            if (e.key === konamiSequence[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiSequence.length) {
                    konamiIndex = 0;
                    showToast('You found an easter egg :D', 'success');
                }
            } else { konamiIndex = 0; }
        });

        document.body.addEventListener('click', (e) => {
            const navLogo = e.target.closest('#main-header .logo');
            if (navLogo) {
                 window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            const logoText = e.target.closest('.logo span');
            if (logoText && !logoText.isScrambling) {
                const originalText = logoText.textContent;
                const chars = '#!%&?*@£$§';
                let iterations = 0;
                logoText.isScrambling = true;
                const interval = setInterval(() => {
                    logoText.textContent = originalText.split('').map((char, index) => {
                        if (index < iterations) return originalText[index];
                        return chars[Math.floor(Math.random() * chars.length)];
                    }).join('');
                    if (iterations >= originalText.length) {
                        clearInterval(interval);
                        logoText.isScrambling = false;
                    }
                    iterations += 1 / 3;
                }, 30);
            }

            const footerLogo = e.target.closest('#main-footer .footer-logo');
            if(footerLogo) {
                const now = new Date().getTime();
                const lastClick = parseInt(footerLogo.dataset.lastClick) || 0;
                let clicks = parseInt(footerLogo.dataset.clicks) || 0;
                clicks = (now - lastClick < 400) ? clicks + 1 : 1;
                footerLogo.dataset.clicks = clicks;
                footerLogo.dataset.lastClick = now;
                if (clicks >= 5) {
                    document.body.classList.toggle('secret-theme');
                    footerLogo.dataset.clicks = 0;
                }
            }
        });
    };

    window.addEventListener('load', () => {
        const skeleton = document.getElementById('skeleton-loader');
        const content = document.getElementById('content-wrapper');
        skeleton.style.opacity = '0';
        setTimeout(() => skeleton.remove(), 500);
        content.classList.add('loaded');

        Promise.all([
            loadHTML('main-header', '/models/_nav.html'),
            loadHTML('main-footer', '/models/_footer.html')
        ]).then(() => {
            for (const id in ICONS) injectContent(id, ICONS[id]);
            setupIntersectionObserver();
            setupMouseEffects();
            setupLiveNotifications();
            setupSecretsAndEvents();
        });
    });
});