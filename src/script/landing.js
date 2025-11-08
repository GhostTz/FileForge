document.addEventListener('DOMContentLoaded', () => {

    const ICONS = {
        'icon-download': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        'icon-convert': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
        'icon-share': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
        'icon-privacy': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        'icon-speed': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2z"/></svg>`,
        'icon-limitless': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>`,
        'icon-github-large': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,
        'icon-github': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.3.8 1 .8 1.9v2.8c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg>`,
        'icon-discord': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.417a22.28 22.28 0 00-3.1-.284c-1.85.068-3.616.5-5.22 1.25a19.462 19.462 0 00-5.22-1.25 22.28 22.28 0 00-3.1.284A2.433 2.433 0 001.6 6.583C2.3 12.3 4.953 17.217 9.6 19.95a1.71 1.71 0 001.594.016c4.647-2.733 7.3-7.65 7.994-13.367a2.433 2.433 0 00-2.077-2.166z"/></svg>`,
        'github-hero-btn': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.3.8 1 .8 1.9v2.8c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg> Star on GitHub`
    };

    const injectContent = (id, content) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = content;
    };
    
    const loadHTML = (elementId, url) => {
        return fetch(url)
            .then(response => response.text())
            .then(data => injectContent(elementId, data))
            .catch(error => console.error('Error loading HTML:', error));
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
        }, { threshold: 0.1 });
        document.querySelectorAll('.anim-element').forEach(el => observer.observe(el));
    };

    const setupFaqAccordion = () => {
        const faqContainer = document.querySelector('.faq-container');
        if (faqContainer) {
            faqContainer.addEventListener('click', (e) => {
                const question = e.target.closest('.faq-question');
                if (!question) return;
                const item = question.parentElement;
                const answer = item.querySelector('.faq-answer');
                document.querySelectorAll('.faq-item').forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-answer').style.maxHeight = '0';
                    }
                });
                item.classList.toggle('active');
                answer.style.maxHeight = item.classList.contains('active') ? answer.scrollHeight + 'px' : '0';
            });
        }
    };
    
    const setupMouseEffects = () => {
        const spotlight = document.querySelector('.spotlight');
        document.addEventListener('mousemove', (e) => {
            spotlight.style.setProperty('--mouse-x', e.clientX + 'px');
            spotlight.style.setProperty('--mouse-y', e.clientY + 'px');
        });
        document.querySelectorAll('.feature-card, .pillar-card').forEach(card => {
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

    const setupSecrets = () => {
        console.log("%c                 _ _       \n ___ ___ ___ _| | |_ ___ \n|  _| . | -_| . | . | -_|\n|___|___|___|___|___|___|\n\n%cLooking under the hood? You're in the right place.\nFileForge is proudly open source (GPL-3.0).", "color: #A020F0; font-weight: bold;", "color: #c1c1c1;");
        
        const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;
        document.addEventListener('keydown', (e) => {
            if (e.key === konamiSequence[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiSequence.length) {
                    konamiIndex = 0;
                    showToast('You found an easter egg :D', 'success');
                }
            } else {
                konamiIndex = 0;
            }
        });

        document.body.addEventListener('click', (e) => {
            const logo = e.target.closest('.logo span');
            if (logo && !logo.isScrambling) {
                const originalText = logo.textContent;
                const chars = '#!%&?*@£$§';
                let iterations = 0;
                logo.isScrambling = true;
                const interval = setInterval(() => {
                    logo.textContent = originalText.split('').map((char, index) => {
                        if (index < iterations) return originalText[index];
                        return chars[Math.floor(Math.random() * chars.length)];
                    }).join('');
                    if (iterations >= originalText.length) {
                        clearInterval(interval);
                        logo.isScrambling = false;
                    }
                    iterations += 1 / 3;
                }, 30);
            }

            const footerLogo = e.target.closest('.footer-logo');
            if(footerLogo) {
                const now = new Date().getTime();
                const lastClick = parseInt(footerLogo.dataset.lastClick) || 0;
                const clicks = parseInt(footerLogo.dataset.clicks) || 0;
                if (now - lastClick < 500) {
                    footerLogo.dataset.clicks = clicks + 1;
                } else {
                    footerLogo.dataset.clicks = 1;
                }
                footerLogo.dataset.lastClick = now;

                if (footerLogo.dataset.clicks >= 5) {
                    document.body.classList.toggle('secret-theme');
                    footerLogo.dataset.clicks = 0;
                }
            }
        });
    };

    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');
        preloader.style.opacity = '0';
        setTimeout(() => preloader.style.display = 'none', 500);
        document.body.classList.add('loaded');

        Promise.all([
            loadHTML('main-header', '/models/_nav.html'),
            loadHTML('main-footer', '/models/_footer.html')
        ]).then(() => {
            for (const id in ICONS) injectContent(id, ICONS[id]);
            setupIntersectionObserver();
            setupFaqAccordion();
            setupMouseEffects();
            setupSecrets();
        });
    });
});