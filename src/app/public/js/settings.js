(() => {
    // --- Elements ---
    const form = document.getElementById('settings-form');
    const saveBtn = document.getElementById('save-settings-btn');
    const pfpPreview = document.getElementById('pfp-preview');
    
    // UI Modal Elements
    const openUiBtn = document.getElementById('open-ui-modal-btn');
    const uiModal = document.getElementById('ui-modal');
    const doneUiBtn = document.getElementById('ui-modal-done-btn');
    const themeRadios = document.querySelectorAll('input[name="theme-radio"]');

    // Info Modal Elements
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalBody = document.getElementById('info-modal-body');
    const infoOkBtn = document.getElementById('info-modal-ok-btn');
    
    // Generic Modal Close Buttons
    const closeButtons = document.querySelectorAll('.close-modal-btn');

    const inputs = {
        fullName: document.getElementById('full-name'),
        email: document.getElementById('email'),
        age: document.getElementById('age'),
        telegramBotToken: document.getElementById('telegram-bot-token'),
        telegramChannelId: document.getElementById('telegram-channel-id')
    };
    
    let initialSettings = {};

    // --- Content Data ---
    const TUTORIALS = {
        'bot-token': {
            title: 'How to get a Bot Token',
            content: `
                <ol>
                    <li>Open <a href="https://web.telegram.org/" target="_blank" rel="noopener">Telegram Web</a> or open the app on your device.</li>
                    <li>Go to the search bar and search for <code>@BotFather</code>.</li>
                    <li>Start a chat with him and type <code>/newbot</code>.</li>
                    <li><strong>BotFather</strong> will ask for a name. Choose any name (e.g. <em>My Cloud Bot</em>).</li>
                    <li>Next, he will ask for a unique username. This <strong>must</strong> end in <code>bot</code> (e.g. <code>telecloud_bot</code>).</li>
                    <li>If successful, you will receive a message with a long string of characters. This is your <strong>HTTP API Token</strong>.</li>
                    <li>Copy this token and paste it into the field here.</li>
                </ol>
            `
        },
        'channel-id': {
            title: 'Channel Setup & ID',
            content: `
                <p><strong>Part 1: Get the Channel ID</strong></p>
                <ol>
                    <li>Create a <strong>New Channel</strong> in Telegram.</li>
                    <li>Send any text message into this new channel.</li>
                    <li>Forward this message to the bot <code>@JsonDumpCUBot</code>.</li>
                    <li>The bot will reply with a large JSON message. Look for the line that says <code>"forward_from_chat"</code>.</li>
                    <li>Inside that block, look for <code>"id"</code>. It is a long number usually starting with a minus sign (e.g. <code>-100123456789</code>).</li>
                    <li>Copy this entire number (including the minus) and paste it here.</li>
                </ol>
                
                <hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--card-border);">
                
                <p><strong>Part 2: Configure the Bot</strong></p>
                <ol>
                    <li>Go to the channel settings/info and add your newly created Bot (from the Bot Token step) as a <strong>Subscriber</strong>.</li>
                    <li>Edit the subscriber list and promote your bot to be an <strong>Administrator</strong>. <br><em>(This is required for the Cloud to work properly).</em></li>
                </ol>
            `
        }
    };

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
        const dataToSend = specificData || collectData();

        try {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            const response = await fetch('api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (response.ok) {
                initialSettings = await (await fetch('api/user/settings')).json();
                saveBtn.textContent = 'Saved!';
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    checkForChanges();
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

                inputs.fullName.value = settings.fullName || '';
                inputs.email.value = settings.email || '';
                inputs.age.value = settings.age || '';
                inputs.telegramBotToken.value = settings.telegramBotToken || '';
                inputs.telegramChannelId.value = settings.telegramChannelId || '';

                const currentTheme = settings.colormode || 'dark';
                themeRadios.forEach(radio => {
                    radio.checked = (radio.value === currentTheme);
                });
                
                applyTheme(currentTheme);
                checkForChanges();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    // --- Event Listeners ---

    form.addEventListener('input', checkForChanges);
    saveBtn.addEventListener('click', () => saveSettings());

    // UI Modal
    openUiBtn.addEventListener('click', () => {
        const currentTheme = initialSettings.colormode || 'dark';
        themeRadios.forEach(radio => radio.checked = (radio.value === currentTheme));
        uiModal.classList.add('visible');
    });

    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    });

    doneUiBtn.addEventListener('click', async () => {
        const allData = collectData();
        await saveSettings(allData);
        uiModal.classList.remove('visible');
    });

    // Info Icons Logic
    document.querySelectorAll('.info-icon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = btn.dataset.info;
            const data = TUTORIALS[type];
            if (data) {
                infoModalTitle.textContent = data.title;
                infoModalBody.innerHTML = data.content;
                infoModal.classList.add('visible');
            }
        });
    });

    infoOkBtn.addEventListener('click', () => {
        infoModal.classList.remove('visible');
    });

    // Global Close Logic
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const modal = document.getElementById(targetId);
            if (modal) {
                modal.classList.remove('visible');
                // Revert theme if UI modal closed without saving
                if (targetId === 'ui-modal') {
                    applyTheme(initialSettings.colormode || 'dark');
                }
            }
        });
    });

    // Click outside to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('visible');
            if (e.target.id === 'ui-modal') {
                applyTheme(initialSettings.colormode || 'dark');
            }
        }
    });

    const mainProfileIcon = document.querySelector('.profile-section .profile-icon');
    if (mainProfileIcon) pfpPreview.textContent = mainProfileIcon.textContent;
    
    loadSettings();
})();