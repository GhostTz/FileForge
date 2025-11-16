(() => {
    const form = document.getElementById('settings-form');
    const saveBtn = document.getElementById('save-settings-btn');
    const pfpPreview = document.getElementById('pfp-preview');

    const inputs = {
        fullName: document.getElementById('full-name'),
        email: document.getElementById('email'),
        age: document.getElementById('age'),
        telegramBotToken: document.getElementById('telegram-bot-token'),
        telegramChannelId: document.getElementById('telegram-channel-id')
    };
    
    let initialSettings = {};

    const areEqual = (val1, val2) => {
        const isVal1Empty = val1 === null || val1 === undefined || val1 === '';
        const isVal2Empty = val2 === null || val2 === undefined || val2 === '';
        if (isVal1Empty && isVal2Empty) return true;
        // Use == for intentional type coercion (e.g., 30 == '30')
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

    saveBtn.addEventListener('click', async () => {
        const settingsData = {
            fullName: inputs.fullName.value,
            email: inputs.email.value,
            age: inputs.age.value,
            telegramBotToken: inputs.telegramBotToken.value,
            telegramChannelId: inputs.telegramChannelId.value
        };

        try {
            const response = await fetch('api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });

            if(response.ok) {
                initialSettings = await (await fetch('api/user/settings')).json();
                
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