import { DOM, ICONS } from './constants.js';
import { state } from './state.js';
import * as api from './api.js';
import { renderFolderTree } from './ui.js';

// --- Create Folder Modal ---
export const openCreateFolderModal = () => {
    DOM.createFolderModal.classList.remove('hidden');
    DOM.newFolderNameInput.value = '';
    DOM.newFolderNameInput.focus();
};
export const closeCreateFolderModal = () => DOM.createFolderModal.classList.add('hidden');

// --- Delete Modal ---
export const openDeleteModal = (itemElement, isPermanent = false) => {
    state.itemToDelete = { id: itemElement.dataset.id, name: itemElement.dataset.name };
    const actionText = isPermanent ? 'permanently delete' : 'move to Trash';
    DOM.deleteModalText.innerHTML = `Are you sure you want to <strong>${actionText}</strong> "${state.itemToDelete.name}"? This action cannot be undone.`;
    DOM.confirmDeleteModal.classList.remove('hidden');
};
export const openBulkDeleteModal = (isPermanent = false) => {
    const count = state.selectedItems.size;
    const actionText = isPermanent ? 'permanently delete' : 'move to Trash';
    const itemText = count === 1 ? '1 selected item' : `${count} selected items`;
    DOM.deleteModalText.innerHTML = `Are you sure you want to <strong>${actionText} ${itemText}</strong>? This action cannot be undone.`;
    DOM.confirmDeleteModal.classList.remove('hidden');
};
export const closeDeleteModal = () => {
    DOM.confirmDeleteModal.classList.add('hidden');
    state.itemToDelete = null;
};

// --- Move Modal ---
export const openMoveModal = async () => {
    try {
        const folderTree = await api.fetchFolders();
        DOM.moveFolderTreeContainer.innerHTML = '';
        const rootEl = document.createElement('div');
        rootEl.innerHTML = `<div class="folder-tree-item" data-id="root">${ICONS.folder}<span>Home (Root)</span></div>`;
        DOM.moveFolderTreeContainer.appendChild(rootEl);
        renderFolderTree(folderTree, DOM.moveFolderTreeContainer);

        state.destinationFolderId = null;
        DOM.confirmMoveBtn.disabled = true;
        DOM.moveItemModal.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to open move modal:', error);
    }
};
export const closeMoveModal = () => {
    DOM.moveItemModal.classList.add('hidden');
    state.destinationFolderId = null;
};


// --- Preview Modal ---
export const openFilePreview = async (itemId, itemName) => {
    DOM.previewFileName.textContent = itemName;
    DOM.previewContainer.innerHTML = '<h4>Loading preview...</h4>';
    DOM.previewModal.classList.remove('hidden');
    try {
        const { tempPath } = await api.getDownloadPath(itemId);
        const fileType = itemName.split('.').pop().toLowerCase();
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        const videoTypes = ['mp4', 'webm', 'ogg'];
        const textTypes = ['txt', 'md', 'js', 'css', 'html', 'json', 'log'];
        if (imageTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `<img src="${tempPath}" alt="${itemName}">`;
        } else if (fileType === 'pdf') {
            DOM.previewContainer.innerHTML = `<iframe src="${tempPath}"></iframe>`;
        } else if (videoTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `<video controls src="${tempPath}"></video>`;
        } else if (textTypes.includes(fileType)) {
            const textContent = await (await fetch(tempPath)).text();
            DOM.previewContainer.innerHTML = `<pre>${textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
        } else {
            DOM.previewContainer.innerHTML = `<div class="preview-no-preview">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <h3>No preview available for this file type.</h3>
                <p><a href="${tempPath}" download="${itemName}">Download the file directly</a> to view it.</p>
            </div>`;
        }
    } catch (error) {
        DOM.previewContainer.innerHTML = `<h4>Error loading preview: ${error.message}</h4>`;
    }
};
export const closeFilePreview = () => {
    DOM.previewModal.classList.add('hidden');
    DOM.previewContainer.innerHTML = '';
    DOM.previewFileName.textContent = '';
};