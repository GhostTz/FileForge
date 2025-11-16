import { DOM } from './constants.js';
import { state, clearSelection } from './state.js';
import * as api from './api.js';
import { updateUI, switchToExplorer, switchToUpload, renderFolderTree } from './ui.js';
import * as modals from './modals.js';
import { toggleSelection, initializeMarqueeSelection } from './selection.js';
import { initializeUpload } from './upload.js';

function showToast(message, type = 'default') {
    // --- HIER IST DIE KORREKTUR ---
    // Wir suchen den Container jedes Mal, wenn die Funktion aufgerufen wird.
    // Das verhindert den "appendChild of undefined" Fehler.
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

function setupEventListeners() {
    // Main navigation
    DOM.explorerUploadBtn.addEventListener('click', switchToUpload);
    DOM.explorerBtn.addEventListener('click', () => {
        switchToExplorer();
        refreshCurrentView();
    });

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

        if (checkbox) {
            e.stopPropagation();
            toggleSelection(fileItem.dataset.id, fileItem);
        } else if (actionBtn) {
            e.stopPropagation();
            const action = actionBtn.dataset.action;
            const itemId = fileItem.dataset.id;
            if (action === 'favorite') {
                const isFavorite = actionBtn.classList.contains('is-favorite');
                api.toggleFavorite(itemId, !isFavorite).then(refreshCurrentView);
            }
            if (action === 'delete') modals.openDeleteModal(fileItem);
        } else {
             if (fileItem.classList.contains('is-folder')) {
                navigateToFolder(parseInt(fileItem.dataset.id));
            } else {
                modals.openFilePreview(fileItem.dataset.id, fileItem.dataset.name);
            }
        }
    });

    // Sidebar navigation
    DOM.navLinks.myFiles.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('myFiles'); });
    DOM.navLinks.favorites.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('favorites'); });
    DOM.navLinks.trash.addEventListener('click', (e) => { e.preventDefault(); setupSidebarNav('trash'); });

    // Toolbar actions
    DOM.newBtn.addEventListener('click', modals.openCreateFolderModal);
    DOM.selectionDeleteBtn.addEventListener('click', modals.openBulkDeleteModal);
    DOM.selectionMoveBtn.addEventListener('click', modals.openMoveModal);

    // Modal Handlers
    DOM.confirmCreateFolderBtn.addEventListener('click', async () => {
        const folderName = DOM.newFolderNameInput.value.trim();
        if (folderName) {
            await api.createFolder(folderName, state.currentParentId);
            await refreshCurrentView();
            modals.closeCreateFolderModal();
        }
    });
    DOM.confirmDeleteBtn.addEventListener('click', async () => {
        if (state.selectedItems.size > 0) {
            await api.moveItemsToTrash(Array.from(state.selectedItems));
            clearSelection();
        } else if (state.itemToDelete) {
            await api.deleteSingleItem(state.itemToDelete.id);
        }
        await refreshCurrentView();
        modals.closeDeleteModal();
    });
    DOM.confirmMoveBtn.addEventListener('click', async () => {
        if (state.destinationFolderId !== null && state.selectedItems.size > 0) {
            await api.moveItems(Array.from(state.selectedItems), state.destinationFolderId);
            clearSelection();
            await refreshCurrentView();
            modals.closeMoveModal();
        }
    });
    
    // Generic modal close buttons
    [DOM.cancelCreateFolderBtn, DOM.createFolderModal].forEach(el => el.addEventListener('click', (e) => { if(e.target === el) modals.closeCreateFolderModal() }));
    [DOM.cancelDeleteBtn, DOM.confirmDeleteModal].forEach(el => el.addEventListener('click', (e) => { if(e.target === el) modals.closeDeleteModal() }));
    [DOM.cancelMoveBtn, DOM.moveItemModal].forEach(el => el.addEventListener('click', (e) => { if(e.target === el) modals.closeMoveModal() }));
    [DOM.closePreviewBtn, DOM.previewModal].forEach(el => el.addEventListener('click', (e) => { if(e.target === el) modals.closeFilePreview() }));

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

// --- INITIALIZATION ---
function initialize() {
    setupEventListeners();
    initializeUpload(showToast);
    initializeMarqueeSelection();
    setupSidebarNav('myFiles'); // Initial load
}

initialize();