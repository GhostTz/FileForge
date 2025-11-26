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
let currentPreviewId = null;

export const openFilePreview = async (itemId, itemName, fileSize = 0) => {
    currentPreviewId = itemId;
    DOM.previewFileName.textContent = itemName;
    DOM.previewContainer.innerHTML = '<h4>Loading preview...</h4>';
    DOM.previewModal.classList.remove('hidden');

    // Setup Navigation Buttons
    const prevBtn = document.getElementById('preview-prev-btn');
    const nextBtn = document.getElementById('preview-next-btn');
    const downloadBtn = document.getElementById('preview-download-action-btn');

    if (downloadBtn) {
        downloadBtn.onclick = async () => {
            try {
                // Use streaming download URL
                const downloadUrl = `api/cloud/download/${itemId}?type=download`;
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = itemName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (e) {
                console.error("Download failed", e);
            }
        };
    }

    const updateNavButtons = () => {
        const currentIndex = state.items.findIndex(i => i.id == currentPreviewId);
        if (currentIndex === -1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            return;
        }
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentIndex < state.items.length - 1 ? 'flex' : 'none';
    };

    updateNavButtons();

    prevBtn.onclick = () => navigatePreview(-1);
    nextBtn.onclick = () => navigatePreview(1);

    // Size limit check (30MB)
    const MAX_SIZE = 30 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
        DOM.previewContainer.innerHTML = `
            <div class="preview-no-preview">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                <h3>File too large to preview</h3>
                <p>This file exceeds the 30MB preview limit.</p>
                <div class="preview-actions">
                    <button id="preview-download-btn" class="cloud-modal-btn primary">Download File</button>
                </div>
            </div>`;

        try {
            // Use streaming download URL for large file fallback
            const btn = document.getElementById('preview-download-btn');
            if (btn) {
                btn.onclick = () => {
                    const downloadUrl = `api/cloud/download/${itemId}?type=download`;
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = itemName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }
        } catch (e) {
            console.error("Failed to setup download for large file", e);
        }
        return;
    }

    try {
        const { tempPath } = await api.getDownloadPath(itemId);
        const fileType = itemName.split('.').pop().toLowerCase();
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'];
        const videoTypes = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
        const audioTypes = ['mp3', 'wav', 'ogg', 'm4a'];
        const textTypes = ['txt', 'md', 'js', 'css', 'html', 'json', 'log', 'xml', 'csv'];

        if (imageTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `<img src="${tempPath}" alt="${itemName}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">`;
        } else if (fileType === 'pdf') {
            DOM.previewContainer.innerHTML = `<iframe src="${tempPath}#toolbar=0&navpanes=0&scrollbar=0" type="application/pdf" width="100%" height="100%" style="height: 70vh; border: none;"></iframe>`;
        } else if (videoTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `<video controls src="${tempPath}" style="max-width: 100%; max-height: 70vh;"></video>`;
        } else if (audioTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    <audio controls src="${tempPath}" style="width: 100%; max-width: 400px;"></audio>
                </div>`;
        } else if (textTypes.includes(fileType)) {
            const textContent = await (await fetch(tempPath)).text();
            DOM.previewContainer.innerHTML = `<pre style="background: #1e1e1e; padding: 15px; border-radius: 8px; overflow: auto; max-height: 70vh; color: #d4d4d4;">${textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
        } else {
            DOM.previewContainer.innerHTML = `<div class="preview-no-preview">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <h3>No preview available for this file type.</h3>
                <p><a href="${tempPath}" download="${itemName}" class="cloud-modal-btn primary" style="text-decoration: none; display: inline-block; margin-top: 10px;">Download File</a></p>
            </div>`;
        }
    } catch (error) {
        let errorMessage = error.message;
        if (errorMessage.includes('Preview not allowed') || errorMessage.includes('File too large')) {
            DOM.previewContainer.innerHTML = `
            <div class="preview-no-preview">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <h3>Preview Unavailable</h3>
                <p>${errorMessage}</p>
                <div class="preview-actions">
                    <button id="preview-error-download-btn" class="cloud-modal-btn primary">Download File</button>
                </div>
            </div>`;

            const btn = document.getElementById('preview-error-download-btn');
            if (btn) {
                btn.onclick = () => {
                    const downloadUrl = `api/cloud/download/${itemId}?type=download`;
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = itemName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
            }
        } else {
            DOM.previewContainer.innerHTML = `<h4>Error loading preview: ${errorMessage}</h4>`;
        }
    }
};

const navigatePreview = (direction) => {
    const currentIndex = state.items.findIndex(i => i.id == currentPreviewId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;
    while (newIndex >= 0 && newIndex < state.items.length) {
        const newItem = state.items[newIndex];
        if (newItem.type === 'file') {
            const meta = newItem.file_meta ? JSON.parse(newItem.file_meta) : {};
            openFilePreview(newItem.id, newItem.name, parseInt(meta.sizeBytes || 0));
            return;
        }
        newIndex += direction;
    }
};

export const closeFilePreview = () => {
    DOM.previewModal.classList.add('hidden');
    DOM.previewContainer.innerHTML = '';
    DOM.previewFileName.textContent = '';
    currentPreviewId = null;
};