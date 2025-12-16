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

function showProgressToast(message) {
    const container = document.getElementById('cloud-toast-container');
    if (!container) return null;

    const toast = document.createElement('div');
    toast.className = 'cloud-toast progress';
    toast.innerHTML = `
        <div class="progress-content">
            <span class="progress-message">${message}</span>
            <div class="progress-spinner"></div>
        </div>
    `;
    container.appendChild(toast);

    return {
        update: (newMessage) => {
            const messageEl = toast.querySelector('.progress-message');
            if (messageEl) messageEl.textContent = newMessage;
        },
        close: () => {
            toast.remove();
        }
    };
}

async function refreshCurrentView() {
    try {
        state.isSearching = false;
        state.currentSearchTerm = '';
        DOM.searchInput.value = ''; // Clear search input on refresh

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
            refreshCurrentView();
        }
    }, 300);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function handleEmptyTrash() {
    state.isEmptyingTrash = true;
    console.log('[Cloud] handleEmptyTrash called, isEmptyingTrash set to:', state.isEmptyingTrash);
    modals.openBulkDeleteModal(true);
}


function setupEventListeners() {
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

    // Toolbar and header actions
    DOM.newBtn.addEventListener('click', modals.openCreateFolderModal);
    DOM.emptyTrashBtn.addEventListener('click', handleEmptyTrash);
    DOM.selectionDeleteBtn.addEventListener('click', () => modals.openBulkDeleteModal(state.currentView === 'trash'));
    DOM.selectionMoveBtn.addEventListener('click', modals.openMoveModal);
    DOM.selectionRestoreBtn.addEventListener('click', () => api.restoreItems(Array.from(state.selectedItems)).then(refreshCurrentView));

    // Bulk Download
    const selectionDownloadBtn = document.getElementById('selection-download-btn');
    if (selectionDownloadBtn) {
        selectionDownloadBtn.addEventListener('click', async () => {
            const selectedIds = Array.from(state.selectedItems);
            if (selectedIds.length === 0) return;

            if (selectedIds.length === 1) {
                // Single file download (if not a folder)
                const itemId = selectedIds[0];
                const item = state.items.find(i => i.id == itemId);

                // If it's a file, download directly. If it's a folder, fall through to bulk ZIP download.
                if (item && item.type !== 'folder') {
                    try {
                        // Use streaming download URL directly
                        const downloadUrl = `api/cloud/download/${itemId}?type=download`;
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = item.name; // This might be redundant if Content-Disposition is set, but good fallback
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        clearSelection();
                        updateUI();
                        return; // Exit early for single file
                    } catch (e) { console.error("Download failed", e); showToast("Download failed", "error"); return; }
                }
            }

            // Bulk ZIP download (or single folder)
            {
                if (!window.NotificationManager) {
                    console.error('NotificationManager not available');
                    return;
                }
                const notifId = window.NotificationManager.showProgressNotification('Creating ZIP archive');
                window.NotificationManager.updateProgress(notifId, 0, 100, 'Preparing files...');

                try {
                    // Simulate progress or just wait for response (since it's a stream, we might not get granular progress easily without more complex backend)
                    // For now, we'll just show indeterminate or "Processing"

                    const blob = await api.downloadZip(selectedIds);

                    window.NotificationManager.updateProgress(notifId, 100, 100, 'Download starting...');

                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `files_archive_${Date.now()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    window.NotificationManager.closeNotification(notifId);
                    window.NotificationManager.showNotification('success', 'Download Started', 'Your ZIP archive is ready.');

                } catch (error) {
                    console.error("Bulk download failed", error);
                    window.NotificationManager.closeNotification(notifId);
                    window.NotificationManager.showNotification('error', 'Download Failed', 'Could not create ZIP archive.');
                }
            }
            clearSelection();
            updateUI();
        });
    }

    // Select All Checkbox
    if (DOM.selectAllCheckbox) {
        DOM.selectAllCheckbox.addEventListener('click', () => {
            const isChecked = DOM.selectAllCheckbox.classList.contains('checked');
            if (isChecked) {
                // Deselect all
                clearSelection();
                DOM.selectAllCheckbox.classList.remove('checked');
            } else {
                // Select all
                state.items.forEach(item => state.selectedItems.add(item.id.toString()));
                DOM.selectAllCheckbox.classList.add('checked');
            }
            updateUI();
        });
    }

    // Modal Handlers (default confirm actions)
    DOM.confirmCreateFolderBtn.onclick = async () => {
        const folderName = DOM.newFolderNameInput.value.trim();
        if (folderName) {
            await api.createFolder(folderName, state.currentParentId);
            await refreshCurrentView();
            modals.closeCreateFolderModal();
        }
    };

    console.log('[Cloud] Setting up delete button handler...');
    console.log('[Cloud] confirmDeleteBtn element:', DOM.confirmDeleteBtn);

    DOM.confirmDeleteBtn.onclick = async () => {
        console.log('[Cloud] Delete button clicked!');
        console.log('[Cloud] isEmptyingTrash:', state.isEmptyingTrash);
        console.log('[Cloud] currentView:', state.currentView);
        console.log('[Cloud] selectedItems:', state.selectedItems);

        if (state.isEmptyingTrash) {
            modals.closeDeleteModal();
            const itemsToDelete = [...state.items]; // Get all items currently in trash view
            const total = itemsToDelete.length;
            if (total === 0) {
                state.isEmptyingTrash = false;
                return;
            }

            // Check if NotificationManager is available
            if (!window.NotificationManager) {
                console.error('NotificationManager is not available!');
                showToast('Error: Notification system not loaded', 'error');
                state.isEmptyingTrash = false;
                return;
            }

            // Show non-blocking progress notification
            console.log('Starting trash deletion, showing notification...');
            const notifId = window.NotificationManager.showProgressNotification('Emptying Trash');
            console.log('Notification ID:', notifId);
            let deletedCount = 0;

            for (const item of itemsToDelete) {
                try {
                    await api.permanentlyDeleteItem(item.id);
                    deletedCount++;
                    console.log(`Deleted ${deletedCount}/${total}`);
                    window.NotificationManager.updateProgress(notifId, deletedCount, total, `Deleting ${deletedCount} of ${total} items...`);
                    // Reduced delay for database-only deletion
                    await sleep(100); 
                } catch (error) {
                    console.error(`Failed to delete item ${item.id}:`, error);
                    showToast(`Error deleting ${item.name}.`, 'error');
                }
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
                // Bulk permanent delete with progress notification
                modals.closeDeleteModal();

                if (!window.NotificationManager) {
                    console.error('NotificationManager not available');
                    for (const id of ids) await api.permanentlyDeleteItem(id);
                } else {
                    const notifId = window.NotificationManager.showProgressNotification('Deleting Items');
                    let deletedCount = 0;
                    const total = ids.length;

                    for (const id of ids) {
                        try {
                            await api.permanentlyDeleteItem(id);
                            deletedCount++;
                            window.NotificationManager.updateProgress(notifId, deletedCount, total, `Deleting ${deletedCount} of ${total} items...`);
                            // Reduced delay for database-only deletion
                            await sleep(100); 
                        } catch (error) {
                            console.error(`Failed to delete item ${id}:`, error);
                        }
                    }

                    window.NotificationManager.closeNotification(notifId);
                    window.NotificationManager.showNotification('success', 'Items Deleted', `Successfully deleted ${deletedCount} items.`);
                }
            } else {
                await api.moveItemsToTrash(ids);
            }
        } else if (state.itemToDelete) {
            if (isPermanent) {
                modals.closeDeleteModal();

                // Single item permanent delete with progress notification
                if (!window.NotificationManager) {
                    console.error('NotificationManager not available');
                    await api.permanentlyDeleteItem(state.itemToDelete.id);
                    showToast('Item permanently deleted.', 'success');
                } else {
                    const progressToast = window.NotificationManager.showProgressNotification('Deleting Item');
                    window.NotificationManager.updateProgress(progressToast, 0, 1, `Deleting ${state.itemToDelete.name}...`);

                    try {
                        await api.permanentlyDeleteItem(state.itemToDelete.id);
                        window.NotificationManager.updateProgress(progressToast, 1, 1, 'Deletion complete');
                        await sleep(100);
                        window.NotificationManager.closeNotification(progressToast);
                        window.NotificationManager.showNotification('success', 'Item Deleted', `Successfully deleted ${state.itemToDelete.name}.`);
                    } catch (error) {
                        window.NotificationManager.closeNotification(progressToast);
                        window.NotificationManager.showNotification('error', 'Delete Failed', 'Could not delete item.');
                        console.error('Delete error:', error);
                    }
                }
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

    // Generic modal close buttons
    [DOM.cancelCreateFolderBtn, DOM.createFolderModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeCreateFolderModal() }));
    [DOM.cancelDeleteBtn, DOM.confirmDeleteModal].forEach(el => el.addEventListener('click', (e) => {
        if (e.target === el) {
            state.isEmptyingTrash = false;
            modals.closeDeleteModal();
        }
    }));
    [DOM.cancelMoveBtn, DOM.moveItemModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeMoveModal() }));
    [DOM.closePreviewBtn, DOM.previewModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeFilePreview() }));

    // Move modal folder tree selection
    DOM.moveFolderTreeContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.folder-tree-item');
        if (target) {
            DOM.moveFolderTreeContainer.querySelectorAll('.folder-tree-item').forEach(el => el.classList.remove('selected'));
            target.classList.add('selected');
            state.destinationFolderId = target.dataset.id;
            DOM.confirmMoveBtn.disabled = false;
        }
    });

    // Mobile Sidebar Toggle
    const toggleSidebar = (show) => {
        if (show) {
            DOM.sidebar.classList.add('sidebar-open');
            DOM.sidebarOverlay.classList.add('active');
        } else {
            DOM.sidebar.classList.remove('sidebar-open');
            DOM.sidebarOverlay.classList.remove('active');
        }
    };

    if (DOM.mobileMenuBtn) {
        DOM.mobileMenuBtn.addEventListener('click', () => toggleSidebar(true));
    }

    if (DOM.sidebarOverlay) {
        DOM.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
    }

    // Close sidebar when navigating on mobile
    Object.values(DOM.navLinks).forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleSidebar(false);
            }
        });
    });
}

async function checkTelegramSettings() {
    try {
        const settings = await api.fetchSettings();
        if (!settings.telegramBotToken || !settings.telegramChannelId) {
            const warningContainer = document.getElementById('telegram-warning-container');
            if (warningContainer) {
                warningContainer.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error("Failed to check Telegram settings:", error);
    }
}

function initialize() {
    setupEventListeners();
    initializeUpload(showToast);
    initializeMarqueeSelection();
    setupSidebarNav('myFiles');
    checkTelegramSettings();
}

initialize();