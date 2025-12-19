import { DOM } from './constants.js';
import { state, clearSelection } from './state.js';
import * as api from './api.js';
import { updateUI, switchToExplorer, switchToUpload } from './ui.js';
import * as modals from './modals.js';
import { toggleSelection, initializeMarqueeSelection } from './selection.js';
import { initializeUpload } from './upload.js';

let searchDebounceTimeout;

function showToast(message, type = 'default') {
    const container = document.getElementById('cloud-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `cloud-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Zentrale Download-Logik mit UI-Lock & No-Bar Notification
async function executeSecureDownload(itemId, itemName) {
    if (state.isDownloading) return;

    state.isDownloading = true;
    updateUI(); 

    let notifId = null;
    if (window.NotificationManager) {
        notifId = window.NotificationManager.showLoadingNotification('Downloading File', `Preparing ${itemName}...`);
    }

    try {
        const response = await fetch(`api/cloud/download/${itemId}?type=download`);
        
        if (!response.ok) throw new Error('Download request failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = itemName;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (notifId) {
            window.NotificationManager.closeNotification(notifId);
            window.NotificationManager.showNotification('success', 'Download Started', `${itemName} has been downloaded.`);
        }

    } catch (error) {
        console.error("Secure download failed:", error);
        if (notifId) window.NotificationManager.closeNotification(notifId);
        showToast("Download failed.", "error");
    } finally {
        state.isDownloading = false;
        updateUI(); 
    }
}

async function refreshCurrentView() {
    try {
        if (state.isSearching) return;

        console.log('[Cloud] Refreshing view...');

        if (state.currentView === 'myFiles') {
            state.items = await api.fetchItems(state.currentParentId);
        } else {
            state.items = await api.fetchView(state.currentView);
        }
        updateUI();
    } catch (error) {
        console.error("Failed to refresh view:", error);
    }
}

async function navigateToFolder(folderId) {
    clearSelection();
    state.currentView = 'myFiles';
    state.currentParentId = folderId;
    state.currentPath = await api.fetchPath(folderId);
    await refreshCurrentView();
}

async function setupSidebarNav(viewName) {
    clearSelection();
    state.currentView = viewName;
    state.currentParentId = null;

    if (viewName === 'myFiles') {
        state.currentPath = [{ id: null, name: 'Home' }];
    } else {
        state.currentPath = [];
    }
    await refreshCurrentView();
}

function handleSearch(event) {
    clearTimeout(searchDebounceTimeout);
    const searchTerm = event.target.value.trim();

    searchDebounceTimeout = setTimeout(async () => {
        if (searchTerm.length > 1) {
            try {
                clearSelection();
                state.isSearching = true;
                state.currentSearchTerm = searchTerm;
                state.items = await api.searchItems(searchTerm);
                updateUI();
            } catch (error) {
                console.error("Search failed:", error);
                showToast("Search failed to execute.", "error");
            }
        } else if (state.isSearching && searchTerm.length < 2) {
            state.isSearching = false;
            state.currentSearchTerm = '';
            refreshCurrentView();
        }
    }, 300);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function handleEmptyTrash() {
    state.isEmptyingTrash = true;
    modals.openBulkDeleteModal(true);
}


function setupEventListeners() {
    // Custom Event Listeners
    document.addEventListener('cloudRefreshRequired', refreshCurrentView);
    document.addEventListener('cloudRequestDownload', (e) => {
        executeSecureDownload(e.detail.itemId, e.detail.itemName);
    });

    // Main navigation
    DOM.explorerUploadBtn.addEventListener('click', switchToUpload);
    DOM.explorerBtn.addEventListener('click', () => {
        switchToExplorer();
        refreshCurrentView();
    });

    // Search
    DOM.searchInput.addEventListener('input', handleSearch);

    // View toggles
    DOM.gridViewBtn.addEventListener('click', () => {
        DOM.fileGrid.classList.remove('list-view');
        DOM.gridViewBtn.classList.add('active');
        DOM.listViewBtn.classList.remove('active');
    });
    DOM.listViewBtn.addEventListener('click', () => {
        DOM.fileGrid.classList.add('list-view');
        DOM.listViewBtn.classList.add('active');
        DOM.gridViewBtn.classList.remove('active');
    });

    // Breadcrumbs
    DOM.breadcrumbsContainer.addEventListener('click', (e) => {
        if (state.isSearching) return;
        const target = e.target.closest('a');
        if (target && !target.classList.contains('active')) {
            const id = target.dataset.id === 'null' ? null : parseInt(target.dataset.id);
            navigateToFolder(id);
        }
    });

    // File Grid Interactions
    DOM.fileGrid.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;

        const actionBtn = e.target.closest('.file-action-btn');
        const checkbox = e.target.closest('.selection-checkbox');
        const itemId = fileItem.dataset.id;

        if (checkbox) {
            e.stopPropagation();
            toggleSelection(itemId, fileItem);
        } else if (actionBtn) {
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            if (action === 'favorite') api.toggleFavorite(itemId, !actionBtn.classList.contains('is-favorite')).then(refreshCurrentView);
            if (action === 'delete') modals.openDeleteModal(fileItem);
            if (action === 'restore') api.restoreItems([itemId]).then(refreshCurrentView);
            if (action === 'permanent-delete') modals.openDeleteModal(fileItem, true);
        } else {
            if (fileItem.classList.contains('is-folder')) navigateToFolder(parseInt(itemId));
            else modals.openFilePreview(itemId, fileItem.dataset.name, parseInt(fileItem.dataset.size || 0));
        }
    });

    // Sidebar navigation
    DOM.navLinks.myFiles.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('myFiles'); });
    DOM.navLinks.favorites.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('favorites'); });
    DOM.navLinks.trash.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('trash'); });

    // Toolbar actions
    DOM.newBtn.addEventListener('click', modals.openCreateFolderModal);
    DOM.emptyTrashBtn.addEventListener('click', handleEmptyTrash);
    DOM.selectionDeleteBtn.addEventListener('click', () => modals.openBulkDeleteModal(state.currentView === 'trash'));
    DOM.selectionMoveBtn.addEventListener('click', modals.openMoveModal);
    DOM.selectionRestoreBtn.addEventListener('click', () => api.restoreItems(Array.from(state.selectedItems)).then(refreshCurrentView));

    // NEU: Rename Event Handler für die Toolbar
    if (DOM.selectionRenameBtn) {
        DOM.selectionRenameBtn.addEventListener('click', () => {
            const selectedIds = Array.from(state.selectedItems);
            if (selectedIds.length !== 1) return;
            const item = state.items.find(i => i.id == selectedIds[0]);
            if (item) modals.openRenameModal(item.id, item.name, item.type);
        });
    }

    // Bulk/Single Download Handler
    const selectionDownloadBtn = document.getElementById('selection-download-btn');
    if (selectionDownloadBtn) {
        selectionDownloadBtn.addEventListener('click', async () => {
            const selectedIds = Array.from(state.selectedItems);
            if (selectedIds.length === 0 || state.isDownloading) return;

            if (selectedIds.length === 1) {
                const itemId = selectedIds[0];
                const item = state.items.find(i => i.id == itemId);
                if (item && item.type !== 'folder') {
                    executeSecureDownload(itemId, item.name);
                    clearSelection();
                    return; 
                }
            }

            {
                if (!window.NotificationManager) return;
                state.isDownloading = true;
                updateUI();
                const notifId = window.NotificationManager.showLoadingNotification('Creating ZIP archive', 'Compressing files...');
                try {
                    const blob = await api.downloadZip(selectedIds);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `archive_${Date.now()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    window.NotificationManager.closeNotification(notifId);
                } catch (error) {
                    if(notifId) window.NotificationManager.closeNotification(notifId);
                    window.NotificationManager.showNotification('error', 'Download Failed', 'Could not create ZIP archive.');
                } finally {
                    state.isDownloading = false;
                    updateUI();
                }
            }
            clearSelection();
        });
    }

    // Select All
    if (DOM.selectAllCheckbox) {
        DOM.selectAllCheckbox.addEventListener('click', () => {
            const isChecked = DOM.selectAllCheckbox.classList.contains('checked');
            if (isChecked) {
                clearSelection();
                DOM.selectAllCheckbox.classList.remove('checked');
            } else {
                state.items.forEach(item => state.selectedItems.add(item.id.toString()));
                DOM.selectAllCheckbox.classList.add('checked');
            }
            updateUI();
        });
    }

    // Modal Confirmation Handlers
    DOM.confirmCreateFolderBtn.onclick = async () => {
        const folderName = DOM.newFolderNameInput.value.trim();
        if (folderName) {
            await api.createFolder(folderName, state.currentParentId);
            await refreshCurrentView();
            modals.closeCreateFolderModal();
        }
    };

    DOM.confirmDeleteBtn.onclick = async () => {
        if (state.isEmptyingTrash) {
            modals.closeDeleteModal();
            const itemsToDelete = [...state.items]; 
            const total = itemsToDelete.length;
            if (total === 0) { state.isEmptyingTrash = false; return; }
            if (!window.NotificationManager) { state.isEmptyingTrash = false; return; }

            const notifId = window.NotificationManager.showProgressNotification('Emptying Trash');
            let deletedCount = 0;
            for (const item of itemsToDelete) {
                try {
                    await api.permanentlyDeleteItem(item.id);
                    deletedCount++;
                    window.NotificationManager.updateProgress(notifId, deletedCount, total, `Deleting ${deletedCount} of ${total} items...`);
                    await sleep(100); 
                } catch (error) { console.error(`Delete item ${item.id} failed:`, error); }
            }
            window.NotificationManager.closeNotification(notifId);
            window.NotificationManager.showNotification('success', 'Trash Emptied', `Successfully deleted ${deletedCount} items.`);
            state.isEmptyingTrash = false;
            await refreshCurrentView();
            return;
        }

        const isPermanent = state.currentView === 'trash';
        if (state.selectedItems.size > 0) {
            const ids = Array.from(state.selectedItems);
            if (isPermanent) {
                modals.closeDeleteModal();
                const notifId = window.NotificationManager.showProgressNotification('Deleting Items');
                let deletedCount = 0;
                for (const id of ids) {
                    try {
                        await api.permanentlyDeleteItem(id);
                        deletedCount++;
                        window.NotificationManager.updateProgress(notifId, deletedCount, ids.length, `Deleting ${deletedCount} of ${ids.length} items...`);
                        await sleep(100); 
                    } catch (error) {}
                }
                window.NotificationManager.closeNotification(notifId);
            } else {
                await api.moveItemsToTrash(ids);
            }
        } else if (state.itemToDelete) {
            if (isPermanent) {
                modals.closeDeleteModal();
                const progressToast = window.NotificationManager.showProgressNotification('Deleting Item');
                try {
                    await api.permanentlyDeleteItem(state.itemToDelete.id);
                    window.NotificationManager.closeNotification(progressToast);
                } catch (error) { window.NotificationManager.closeNotification(progressToast); }
                await refreshCurrentView();
                return;
            } else {
                await api.moveItemsToTrash([state.itemToDelete.id]);
            }
        }
        clearSelection();
        await refreshCurrentView();
        modals.closeDeleteModal();
    };

    DOM.confirmMoveBtn.onclick = async () => {
        if (state.destinationFolderId !== null && state.selectedItems.size > 0) {
            await api.moveItems(Array.from(state.selectedItems), state.destinationFolderId);
            clearSelection();
            await refreshCurrentView();
            modals.closeMoveModal();
        }
    };

    // Close logic
    [DOM.cancelCreateFolderBtn, DOM.createFolderModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeCreateFolderModal() }));
    [DOM.cancelDeleteBtn, DOM.confirmDeleteModal].forEach(el => el.addEventListener('click', (e) => {
        if (e.target === el) { state.isEmptyingTrash = false; modals.closeDeleteModal(); }
    }));
    [DOM.cancelMoveBtn, DOM.moveItemModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeMoveModal() }));
    [DOM.closePreviewBtn, DOM.previewModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeFilePreview() }));
    [DOM.cancelRenameItemBtn, DOM.renameItemModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeRenameModal() }));

    // Move modal tree
    DOM.moveFolderTreeContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.folder-tree-item');
        if (target) {
            DOM.moveFolderTreeContainer.querySelectorAll('.folder-tree-item').forEach(el => el.classList.remove('selected'));
            target.classList.add('selected');
            state.destinationFolderId = target.dataset.id;
            DOM.confirmMoveBtn.disabled = false;
        }
    });

    const toggleSidebar = (show) => {
        if (show) {
            DOM.sidebar.classList.add('sidebar-open');
            DOM.sidebarOverlay.classList.add('active');
        } else {
            DOM.sidebar.classList.remove('sidebar-open');
            DOM.sidebarOverlay.classList.remove('active');
        }
    };

    if (DOM.mobileMenuBtn) DOM.mobileMenuBtn.addEventListener('click', () => toggleSidebar(true));
    if (DOM.sidebarOverlay) DOM.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

    Object.values(DOM.navLinks).forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) toggleSidebar(false);
        });
    });
}

function initialize() {
    setupEventListeners();
    initializeUpload(showToast);
    initializeMarqueeSelection();
    setupSidebarNav('myFiles');
    api.fetchSettings().then(settings => {
        if (!settings.telegramBotToken || !settings.telegramChannelId) {
            document.getElementById('telegram-warning-container')?.classList.remove('hidden');
        }
    });
}

initialize();