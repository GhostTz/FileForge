import { DOM, ICONS } from './constants.js';
import { state } from './state.js';
import * as api from './api.js';
import { renderFolderTree } from './ui.js';

export const openCreateFolderModal = () => {
    DOM.createFolderModal.classList.remove('hidden');
    DOM.newFolderNameInput.value = '';
    DOM.newFolderNameInput.focus();
};
export const closeCreateFolderModal = () => DOM.createFolderModal.classList.add('hidden');

// --- Rename Modal Logic ---
let renameState = { itemId: null, extension: '' };

export const openRenameModal = (itemId, fullName, itemType = 'file') => {
    renameState.itemId = itemId;
    let baseName = fullName;
    renameState.extension = '';

    if (itemType === 'file') {
        const lastDotIndex = fullName.lastIndexOf('.');
        if (lastDotIndex !== -1 && lastDotIndex > 0) {
            baseName = fullName.substring(0, lastDotIndex);
            renameState.extension = fullName.substring(lastDotIndex);
        }
    }

    DOM.renameItemInput.value = baseName;
    DOM.renameItemModal.classList.remove('hidden');
    DOM.renameItemInput.focus();
};

export const closeRenameModal = () => {
    DOM.renameItemModal.classList.add('hidden');
    renameState = { itemId: null, extension: '' };
};

// Global confirm handler for rename
if (DOM.confirmRenameItemBtn) {
    DOM.confirmRenameItemBtn.onclick = async () => {
        const newBaseName = DOM.renameItemInput.value.trim();
        if (newBaseName && renameState.itemId) {
            const finalName = newBaseName + renameState.extension;
            try {
                await api.renameItem(renameState.itemId, finalName);
                closeRenameModal();
                closeFilePreview(); 
                document.dispatchEvent(new CustomEvent('cloudRefreshRequired'));
            } catch (error) {
                console.error("Rename failed:", error);
            }
        }
    };
}

// --- Delete Modal ---
export const openDeleteModal = (itemElement, isPermanent = false) => {
    state.itemToDelete = { id: itemElement.dataset.id, name: itemElement.dataset.name };
    const actionText = isPermanent ? 'permanently delete' : 'move to Trash';
    DOM.deleteModalText.innerHTML = `Are you sureyou want to permanently delete these files from the Cloud? This Action is irreversible.`;
    DOM.confirmDeleteModal.classList.remove('hidden');
};
export const openBulkDeleteModal = (isPermanent = false) => {
    const count = state.selectedItems.size;
    const actionText = isPermanent ? 'permanently delete' : 'move to Trash';
    DOM.deleteModalText.innerHTML = `Are you sureyou want to permanently delete these files from the Cloud? This Action is irreversible.`;
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
    } catch (error) { console.error('Move modal setup failed', error); }
};
export const closeMoveModal = () => {
    DOM.moveItemModal.classList.add('hidden');
    state.destinationFolderId = null;
};


// --- Preview Modal ---
let currentPreviewId = null;
let currentAudio = null;
let currentVideo = null;

export const openFilePreview = async (itemId, itemName, fileSize = 0) => {
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.add('nav-hidden');

    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (currentVideo) { currentVideo.pause(); currentVideo = null; }

    currentPreviewId = itemId;
    DOM.previewFileName.textContent = itemName;
    DOM.previewContainer.innerHTML = '<h4>Loading preview...</h4>';
    DOM.previewModal.classList.remove('hidden');

    const prevBtn = document.getElementById('preview-prev-btn');
    const nextBtn = document.getElementById('preview-next-btn');
    const downloadBtn = document.getElementById('preview-download-action-btn');
    const renameBtn = DOM.previewRenameBtn;

    if (renameBtn) {
        renameBtn.innerHTML = ICONS.edit;
        renameBtn.onclick = () => openRenameModal(itemId, itemName, 'file');
    }

    if (downloadBtn) {
        downloadBtn.onclick = () => {
            if (state.isDownloading) return;
            document.dispatchEvent(new CustomEvent('cloudRequestDownload', { detail: { itemId, itemName } }));
        };
        downloadBtn.disabled = state.isDownloading;
        downloadBtn.style.opacity = state.isDownloading ? "0.5" : "1";
    }

    const updateNavButtons = () => {
        const currentIndex = state.items.findIndex(i => i.id == currentPreviewId);
        if (currentIndex === -1) { prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; return; }
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentIndex < state.items.length - 1 ? 'flex' : 'none';
    };
    updateNavButtons();

    prevBtn.onclick = () => navigatePreview(-1);
    nextBtn.onclick = () => navigatePreview(1);

    const MAX_SIZE = 30 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
        DOM.previewContainer.innerHTML = `<div class="preview-no-preview"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg><h3>File too large to preview</h3><p>Exceeds 30MB limit.</p><div class="preview-actions"><button id="preview-download-btn" class="cloud-modal-btn primary">Download File</button></div></div>`;
        const btn = document.getElementById('preview-download-btn');
        if (btn) btn.onclick = () => { if (state.isDownloading) return; document.dispatchEvent(new CustomEvent('cloudRequestDownload', { detail: { itemId, itemName } })); };
        return;
    }

    try {
        const { tempPath } = await api.getDownloadPath(itemId);
        const fileType = itemName.split('.').pop().toLowerCase();
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'];
        const videoTypes = ['mp4', 'webm', 'mov'];
        const audioTypes = ['mp3', 'wav', 'm4a'];
        const textTypes = ['txt', 'md', 'js', 'css', 'html', 'json'];

        if (imageTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `<img src="${tempPath}" alt="${itemName}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">`;
        } else if (fileType === 'pdf') {
            DOM.previewContainer.innerHTML = `<iframe src="${tempPath}#toolbar=0" width="100%" height="70vh" style="border: none;"></iframe>`;
        } else if (videoTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `
                <div class="custom-video-player paused" id="video-player-container">
                    <div class="video-wrapper">
                        <video class="video-element" id="custom-video-element" src="${tempPath}" preload="metadata"></video>
                    </div>
                    <div class="video-controls-panel">
                        <div class="video-progress-container" id="video-progress-bar">
                            <div class="video-progress-fill" id="video-progress-fill"></div>
                        </div>
                        <div class="video-controls-row">
                            <div class="video-controls-left">
                                <button class="video-btn" id="video-rewind"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg></button>
                                <button class="video-btn" id="video-play-toggle"><svg id="video-play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
                                <button class="video-btn" id="video-forward"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg></button>
                                <div class="video-time"><span id="video-current-time">0:00</span> / <span id="video-duration">0:00</span></div>
                            </div>
                        </div>
                    </div>
                </div>`;
            const video = document.getElementById('custom-video-element'); currentVideo = video;
            const playBtn = document.getElementById('video-play-toggle');
            const formatT = (s) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
            video.addEventListener('loadedmetadata', () => { document.getElementById('video-duration').textContent = formatT(video.duration); });
            video.addEventListener('timeupdate', () => { document.getElementById('video-progress-fill').style.width = `${(video.currentTime/video.duration)*100}%`; document.getElementById('video-current-time').textContent = formatT(video.currentTime); });
            playBtn.onclick = () => { if (video.paused) video.play(); else video.pause(); };
        } else if (audioTypes.includes(fileType)) {
            DOM.previewContainer.innerHTML = `<div class="custom-audio-player"><div class="audio-icon-container">${ICONS.file}</div><div class="audio-info"><div class="audio-title">${itemName}</div></div><div class="audio-controls"><button class="audio-play-btn" id="audio-play-toggle"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg></button></div></div>`;
            const audio = new Audio(tempPath); currentAudio = audio;
            document.getElementById('audio-play-toggle').onclick = () => { if (audio.paused) audio.play(); else audio.pause(); };
        } else if (textTypes.includes(fileType)) {
            const text = await (await fetch(tempPath)).text();
            DOM.previewContainer.innerHTML = `<pre style="background: #1e1e1e; padding: 15px; border-radius: 8px; overflow: auto; max-height: 70vh; color: #d4d4d4;">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
        } else {
            DOM.previewContainer.innerHTML = `<h4>No preview available</h4><a href="${tempPath}" download="${itemName}" class="cloud-modal-btn primary">Download</a>`;
        }
    } catch (e) { DOM.previewContainer.innerHTML = `<h4>Error loading preview</h4>`; }
};

const navigatePreview = (direction) => {
    const currentIndex = state.items.findIndex(i => i.id == currentPreviewId);
    if (currentIndex === -1) return;
    let newIndex = currentIndex + direction;
    while (newIndex >= 0 && newIndex < state.items.length) {
        const item = state.items[newIndex];
        if (item.type === 'file') { 
            const meta = item.file_meta ? JSON.parse(item.file_meta) : {};
            openFilePreview(item.id, item.name, meta.sizeBytes || 0); return; 
        }
        newIndex += direction;
    }
};

export const closeFilePreview = () => {
    DOM.previewModal.classList.add('hidden');
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.remove('nav-hidden');
    if (currentAudio) currentAudio.pause();
    if (currentVideo) currentVideo.pause();
    DOM.previewContainer.innerHTML = '';
    currentPreviewId = null;
};