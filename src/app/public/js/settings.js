(() => {
    // --- State & Initial Data ---
    let initialSettings = {};
    let currentOrder = [];
    
    // --- DOM Elements ---
    const sidebar = document.querySelector('.app-sidebar');

    // Buttons to open drawers
    const btnPersonal = document.getElementById('btn-open-personal');
    const btnCloud = document.getElementById('btn-open-cloud');
    const btnUi = document.getElementById('btn-open-ui');
    const btnLayout = document.getElementById('btn-open-layout');

    // Drawers (Modals)
    const modalPersonal = document.getElementById('modal-personal');
    const modalCloud = document.getElementById('modal-cloud');
    const modalUi = document.getElementById('modal-ui');
    const modalLayout = document.getElementById('modal-layout');

    // Close Buttons
    const closeButtons = document.querySelectorAll('.close-drawer-btn, .close-modal-btn');

    // Save Buttons inside drawers
    const savePersonalBtn = document.getElementById('save-personal-btn');
    const saveCloudBtn = document.getElementById('save-cloud-btn');
    const saveUiBtn = document.getElementById('save-ui-btn');
    const saveLayoutBtn = document.getElementById('save-layout-btn');

    // Layout List
    const layoutList = document.getElementById('layout-sortable-list');

    // Inputs
    const inputs = {
        fullName: document.getElementById('full-name'),
        email: document.getElementById('email'),
        age: document.getElementById('age'),
        telegramBotToken: document.getElementById('telegram-bot-token'),
        telegramChannelId: document.getElementById('telegram-channel-id')
    };

    // PFP
    const pfpPreview = document.getElementById('pfp-preview');

    // Theme Logic
    const themeRadios = document.querySelectorAll('input[name="theme-radio"]');

    // Info Modal
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalBody = document.getElementById('info-modal-body');
    const infoOkBtn = document.getElementById('info-modal-ok-btn');

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

    const openDrawer = (modal) => {
        modal.classList.add('visible');
        if (sidebar) sidebar.classList.add('nav-hidden');
    };

    const closeDrawer = (modal) => {
        modal.classList.remove('visible');
        if (sidebar) sidebar.classList.remove('nav-hidden');
        loadSettings(false); 
    };

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

    // --- Change Detection Logic ---
    const checkForChanges = () => {
        const personalChanged = 
            inputs.fullName.value !== (initialSettings.fullName || '') ||
            inputs.email.value !== (initialSettings.email || '') ||
            inputs.age.value != (initialSettings.age || '');
        
        savePersonalBtn.disabled = !personalChanged;

        const cloudChanged = 
            inputs.telegramBotToken.value !== (initialSettings.telegramBotToken || '') ||
            inputs.telegramChannelId.value !== (initialSettings.telegramChannelId || '');
        
        saveCloudBtn.disabled = !cloudChanged;

        const currentTheme = getSelectedTheme();
        const savedTheme = initialSettings.colormode || 'dark';
        saveUiBtn.disabled = (currentTheme === savedTheme);
    };

    Object.values(inputs).forEach(input => {
        input.addEventListener('input', checkForChanges);
    });

    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyTheme(e.target.value);
            checkForChanges();
        });
    });

    const saveSettings = async (btnElement) => {
        const dataToSend = collectData();
        const originalText = btnElement.textContent;
        
        try {
            btnElement.textContent = 'Saving...';
            btnElement.disabled = true;

            const response = await fetch('api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (response.ok) {
                initialSettings = await (await fetch('api/user/settings')).json();
                
                btnElement.textContent = 'Saved!';
                setTimeout(() => {
                    btnElement.textContent = originalText;
                    checkForChanges(); 
                }, 1000);
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            btnElement.textContent = 'Error';
            setTimeout(() => {
                btnElement.textContent = originalText;
                checkForChanges();
            }, 2000);
        }
    };

    // --- LAYOUT LOGIC WITH MOBILE SUPPORT ---

    const fetchLayout = async () => {
        try {
            const res = await fetch('api/user/layout');
            const data = await res.json();
            currentOrder = data.order;
            renderLayoutList();
        } catch(e) { console.error(e); }
    };

    const renderLayoutList = () => {
        if(!layoutList) return;
        layoutList.innerHTML = '';
        currentOrder.forEach((app, index) => {
            const item = document.createElement('div');
            item.className = 'layout-item';
            item.draggable = true; // For Desktop
            item.dataset.app = app;
            item.innerHTML = `
                <div class="layout-handle">☰</div>
                <div class="layout-name">${app}</div>
                <div class="priority-badge">${index + 1}</div>
            `;
            
            // Desktop Drag Events
            item.addEventListener('dragstart', () => item.classList.add('dragging'));
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                updateOrderFromDOM();
            });

            // Mobile Touch Events
            item.addEventListener('touchstart', (e) => {
                item.classList.add('dragging');
            }, {passive: true});

            item.addEventListener('touchend', () => {
                item.classList.remove('dragging');
                updateOrderFromDOM();
            });
            
            layoutList.appendChild(item);
        });
    };

    const updateOrderFromDOM = () => {
        const items = [...layoutList.querySelectorAll('.layout-item')];
        currentOrder = items.map(item => item.dataset.app);
        
        items.forEach((item, idx) => {
            item.querySelector('.priority-badge').textContent = idx + 1;
        });
    };

    // Shared Helper for Drag/Touch Position
    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.layout-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    if(layoutList) {
        // Desktop Dragover
        layoutList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(layoutList, e.clientY);
            const draggingItem = document.querySelector('.dragging');
            if (afterElement == null) {
                layoutList.appendChild(draggingItem);
            } else {
                layoutList.insertBefore(draggingItem, afterElement);
            }
        });

        // Mobile Touchmove
        layoutList.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Stop scrolling while dragging
            const touch = e.touches[0];
            const afterElement = getDragAfterElement(layoutList, touch.clientY);
            const draggingItem = document.querySelector('.dragging');
            
            if (draggingItem) {
                if (afterElement == null) {
                    layoutList.appendChild(draggingItem);
                } else {
                    layoutList.insertBefore(draggingItem, afterElement);
                }
            }
        }, {passive: false});
    }

    if(saveLayoutBtn) {
        saveLayoutBtn.addEventListener('click', async () => {
            updateOrderFromDOM();
            const originalText = saveLayoutBtn.textContent;
            try {
                saveLayoutBtn.textContent = 'Saving...';
                const res = await fetch('api/user/layout', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ order: currentOrder })
                });
                if(res.ok) {
                    saveLayoutBtn.textContent = 'Saved!';
                    document.dispatchEvent(new Event('layoutChanged'));
                    setTimeout(() => saveLayoutBtn.textContent = originalText, 1000);
                }
            } catch(e) {
                saveLayoutBtn.textContent = 'Error';
                setTimeout(() => saveLayoutBtn.textContent = originalText, 2000);
            }
        });
    }

    // --- Initialization ---

    const loadSettings = async (fetchFromServer = true) => {
        try {
            if (fetchFromServer) {
                const response = await fetch('api/user/settings');
                if (response.ok) {
                    initialSettings = await response.json();
                }
            }

            inputs.fullName.value = initialSettings.fullName || '';
            inputs.email.value = initialSettings.email || '';
            inputs.age.value = initialSettings.age || '';
            inputs.telegramBotToken.value = initialSettings.telegramBotToken || '';
            inputs.telegramChannelId.value = initialSettings.telegramChannelId || '';

            const currentTheme = initialSettings.colormode || 'dark';
            themeRadios.forEach(radio => {
                radio.checked = (radio.value === currentTheme);
            });
            
            applyTheme(currentTheme);
            checkForChanges();

        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    // --- Event Listeners ---

    btnPersonal.addEventListener('click', () => openDrawer(modalPersonal));
    btnCloud.addEventListener('click', () => openDrawer(modalCloud));
    
    btnUi.addEventListener('click', () => {
        loadSettings(false); 
        openDrawer(modalUi);
    });
    
    if(btnLayout) {
        btnLayout.addEventListener('click', () => {
            modalUi.classList.remove('visible');
            fetchLayout();
            openDrawer(modalLayout);
        });
    }

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const modal = document.getElementById(targetId);
            if (modal) {
                closeDrawer(modal);

                // --- NEUE LOGIK FÜR ZURÜCK-BUTTON ---
                if (targetId === 'modal-layout') {
                    // Wenn Layout geschlossen wird, Interface-Einstellungen wieder öffnen
                    const modalUi = document.getElementById('modal-ui');
                    if (modalUi) {
                        modalUi.classList.add('visible');
                        // Sidebar muss versteckt bleiben
                        const sidebar = document.querySelector('.app-sidebar');
                        if(sidebar) sidebar.classList.add('nav-hidden');
                    }
                }

                if (targetId === 'modal-ui') {
                    applyTheme(initialSettings.colormode || 'dark');
                }
            }
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('slide-modal-overlay')) {
            closeDrawer(e.target);
            if (e.target.id === 'modal-ui') {
                applyTheme(initialSettings.colormode || 'dark');
            }
        }
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('visible'); 
        }
    });

    savePersonalBtn.addEventListener('click', () => saveSettings(savePersonalBtn));
    saveCloudBtn.addEventListener('click', () => saveSettings(saveCloudBtn));
    saveUiBtn.addEventListener('click', () => saveSettings(saveUiBtn));

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

    const mainProfileIcon = document.querySelector('.profile-section .profile-icon');
    if (mainProfileIcon) pfpPreview.textContent = mainProfileIcon.textContent;
    
    loadSettings();
})();