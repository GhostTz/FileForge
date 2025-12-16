(() => {
    // --- Elements ---
    const form = document.getElementById('settings-form');
    const saveBtn = document.getElementById('save-settings-btn');
    const pfpPreview = document.getElementById('pfp-preview');
    
    // UI Modal Elements
    const openUiBtn = document.getElementById('open-ui-modal-btn');
    const uiModal = document.getElementById('ui-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const doneUiBtn = document.getElementById('ui-modal-done-btn'); // Neuer Done Button
    const themeRadios = document.querySelectorAll('input[name="theme-radio"]');

    const inputs = {
        fullName: document.getElementById('full-name'),
        email: document.getElementById('email'),
        age: document.getElementById('age'),
        telegramBotToken: document.getElementById('telegram-bot-token'),
        telegramChannelId: document.getElementById('telegram-channel-id')
    };
    
    let initialSettings = {};

    // --- Helper Functions ---

    const applyTheme = (mode) => {
        if (mode === 'white') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    };

    const getSelectedTheme = () => {
        const selected = document.querySelector('input[name="theme-radio"]:checked');
        return selected ? selected.value : 'dark';
    };

    const collectData = () => {
        return {
            fullName: inputs.fullName.value,
            email: inputs.email.value,
            age: inputs.age.value,
            telegramBotToken: inputs.telegramBotToken.value,
            telegramChannelId: inputs.telegramChannelId.value,
            colormode: getSelectedTheme()
        };
    };

    const saveSettings = async (specificData = null) => {
        // Wenn specificData übergeben wird, nutzen wir das, sonst sammeln wir alles vom Formular
        const dataToSend = specificData || collectData();

        try {
            // Button Feedback
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            const response = await fetch('api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (response.ok) {
                // Update local state
                initialSettings = await (await fetch('api/user/settings')).json();
                
                // Feedback
                saveBtn.textContent = 'Saved!';
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    checkForChanges(); // Re-evaluate button state
                }, 1500);
            } else {
                console.error('Failed to save settings');
                saveBtn.textContent = 'Error';
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            saveBtn.textContent = 'Error';
        }
    };

    const checkForChanges = () => {
        let hasChanged = false;
        
        // Check Text Inputs
        for (const key in inputs) {
            const val1 = initialSettings[key] || '';
            const val2 = inputs[key].value || '';
            if (val1 != val2) {
                hasChanged = true;
                break;
            }
        }
        
        saveBtn.disabled = !hasChanged;
        saveBtn.classList.toggle('active', hasChanged);
    };

    // --- Initialization ---

    const loadSettings = async () => {
        try {
            const response = await fetch('api/user/settings');
            if (response.ok) {
                const settings = await response.json();
                initialSettings = settings;

                // Fill Inputs
                inputs.fullName.value = settings.fullName || '';
                inputs.email.value = settings.email || '';
                inputs.age.value = settings.age || '';
                inputs.telegramBotToken.value = settings.telegramBotToken || '';
                inputs.telegramChannelId.value = settings.telegramChannelId || '';

                // Set Theme Radio
                const currentTheme = settings.colormode || 'dark';
                themeRadios.forEach(radio => {
                    radio.checked = (radio.value === currentTheme);
                });
                
                // Apply Theme immediately
                applyTheme(currentTheme);
                
                checkForChanges();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    // --- Event Listeners ---

    // 1. Text Inputs
    form.addEventListener('input', checkForChanges);

    // 2. Main Save Button
    saveBtn.addEventListener('click', () => saveSettings());

    // 3. UI Modal Logic
    openUiBtn.addEventListener('click', () => {
        // Reset selection to saved state when opening to prevent confusion
        const currentTheme = initialSettings.colormode || 'dark';
        themeRadios.forEach(radio => radio.checked = (radio.value === currentTheme));
        uiModal.classList.add('visible');
    });

    const closeUiModal = () => {
        uiModal.classList.remove('visible');
        // Revert theme preview if not saved (optional, but cleaner)
        applyTheme(initialSettings.colormode || 'dark');
    };

    closeModalBtn.addEventListener('click', closeUiModal);
    
    // Live Preview inside Modal
    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    });

    // 4. DONE BUTTON Logic - The Critical Fix
    doneUiBtn.addEventListener('click', async () => {
        // 1. Get the newly selected theme
        const newTheme = getSelectedTheme();
        
        // 2. Collect ALL data (to avoid overwriting text fields with null)
        const allData = collectData();
        
        // 3. Save immediately
        await saveSettings(allData);
        
        // 4. Close modal
        uiModal.classList.remove('visible');
    });

    // Initial Load
    const mainProfileIcon = document.querySelector('.profile-section .profile-icon');
    if (mainProfileIcon) pfpPreview.textContent = mainProfileIcon.textContent;
    
    loadSettings();
})();