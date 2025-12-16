(() => {
    const form = document.getElementById('settings-form');
    const saveBtn = document.getElementById('save-settings-btn');
    const pfpPreview = document.getElementById('pfp-preview');
    
    // UI Modal Elements
    const openUiBtn = document.getElementById('open-ui-modal-btn');
    const uiModal = document.getElementById('ui-modal');
    const closeUiBtns = document.querySelectorAll('.close-modal-btn, .close-ui-modal-btn');
    const themeRadios = document.querySelectorAll('input[name="theme-radio"]');

    const inputs = {
        fullName: document.getElementById('full-name'),
        email: document.getElementById('email'),
        age: document.getElementById('age'),
        telegramBotToken: document.getElementById('telegram-bot-token'),
        telegramChannelId: document.getElementById('telegram-channel-id'),
        colormode: document.getElementById('colormode') // Using hidden input
    };
    
    let initialSettings = {};

    const areEqual = (val1, val2) => {
        const isVal1Empty = val1 === null || val1 === undefined || val1 === '';
        const isVal2Empty = val2 === null || val2 === undefined || val2 === '';
        if (isVal1Empty && isVal2Empty) return true;
        return val1 == val2;
    };

    const checkForChanges = () => {
        let hasChanged = false;
        for (const key in inputs) {
            if (!areEqual(initialSettings[key], inputs[key].value)) {
                hasChanged = true;
                break;
            }
        }
        
        saveBtn.disabled = !hasChanged;
        saveBtn.classList.toggle('active', hasChanged);
    };

    const applyTheme = (mode) => {
        if (mode === 'white') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    };

    const loadSettings = async () => {
        try {
            const response = await fetch('api/user/settings');
            if (response.ok) {
                const settings = await response.json();
                
                initialSettings = settings;

                inputs.fullName.value = settings.fullName || '';
                inputs.email.value = settings.email || '';
                inputs.age.value = settings.age || '';
                inputs.telegramBotToken.value = settings.telegramBotToken || '';
                inputs.telegramChannelId.value = settings.telegramChannelId || '';
                inputs.colormode.value = settings.colormode || 'dark';

                // Sync radio buttons with loaded setting
                themeRadios.forEach(radio => {
                    radio.checked = (radio.value === (settings.colormode || 'dark'));
                });

                applyTheme(settings.colormode);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const setInitial = () => {
        const mainProfileIcon = document.querySelector('.profile-section .profile-icon');
        if (mainProfileIcon) {
            pfpPreview.textContent = mainProfileIcon.textContent;
        }
    };
    
    setInitial();
    loadSettings();

    form.addEventListener('input', checkForChanges);

    // --- UI Customization Logic ---
    
    // Open Modal
    openUiBtn.addEventListener('click', () => {
        uiModal.classList.add('visible');
    });

    // Close Modal
    const closeUiModal = () => uiModal.classList.remove('visible');
    closeUiBtns.forEach(btn => btn.addEventListener('click', closeUiModal));
    uiModal.addEventListener('click', (e) => {
        if (e.target === uiModal) closeUiModal();
    });

    // Handle Theme Change inside Modal
    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            
            // 1. Update hidden input
            inputs.colormode.value = newTheme;
            
            // 2. Apply visually immediately (Preview)
            applyTheme(newTheme);
            
            // 3. Trigger change detection for main save button
            checkForChanges();
        });
    });


    // --- Save Logic ---
    saveBtn.addEventListener('click', async () => {
        const settingsData = {
            fullName: inputs.fullName.value,
            email: inputs.email.value,
            age: inputs.age.value,
            telegramBotToken: inputs.telegramBotToken.value,
            telegramChannelId: inputs.telegramChannelId.value,
            colormode: inputs.colormode.value
        };

        try {
            const response = await fetch('api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });

            if(response.ok) {
                initialSettings = await (await fetch('api/user/settings')).json();
                
                applyTheme(settingsData.colormode);
                checkForChanges();
                
                saveBtn.textContent = 'Saved!';
                setTimeout(() => {
                     saveBtn.textContent = 'Save Changes';
                }, 2000);
            } else {
                console.error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    });
})();