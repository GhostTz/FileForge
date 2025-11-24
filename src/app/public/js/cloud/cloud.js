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
    modals.openBulkDeleteModal(true);
    // Overwrite the confirm button's default behavior for this specific case
    DOM.confirmDeleteBtn.onclick = async () => {
        modals.closeDeleteModal();
        const itemsToDelete = [...state.items]; // Get all items currently in trash view
        const total = itemsToDelete.length;
        if (total === 0) return;

        modals.openBulkDeleteProgressModal();
        let deletedCount = 0;

        for (const item of itemsToDelete) {
            try {
                await api.permanentlyDeleteItem(item.id);
                deletedCount++;
                modals.updateBulkDeleteProgress(deletedCount, total);
                await sleep(1000); // Wait 1 second
            } catch (error) {
                console.error(`Failed to delete item ${item.id}:`, error);
                showToast(`Error deleting ${item.name}.`, 'error');
            }
        }

        modals.closeBulkDeleteProgressModal();
        showToast('Trash has been emptied.', 'success');
        refreshCurrentView();
    };
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
            else modals.openFilePreview(itemId, fileItem.dataset.name);
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

    // Modal Handlers (default confirm actions)
    DOM.confirmCreateFolderBtn.onclick = async () => {
        const folderName = DOM.newFolderNameInput.value.trim();
        if (folderName) {
            await api.createFolder(folderName, state.currentParentId);
            await refreshCurrentView();
            modals.closeCreateFolderModal();
        }
    };
    DOM.confirmDeleteBtn.onclick = async () => {
        const isPermanent = state.currentView === 'trash';
        if (state.selectedItems.size > 0) {
            const ids = Array.from(state.selectedItems);
            if (isPermanent) {
                for (const id of ids) await api.permanentlyDeleteItem(id);
            } else {
                await api.moveItemsToTrash(ids);
            }
        } else if (state.itemToDelete) {
            if (isPermanent) await api.permanentlyDeleteItem(state.itemToDelete.id);
            else await api.deleteSingleItem(state.itemToDelete.id);
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
    [DOM.cancelDeleteBtn, DOM.confirmDeleteModal].forEach(el => el.addEventListener('click', (e) => { if (e.target === el) modals.closeDeleteModal() }));
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
}

function initialize() {
    setupEventListeners();
    initializeUpload(showToast);
    initializeMarqueeSelection();
    setupSidebarNav('myFiles');
}

initialize();