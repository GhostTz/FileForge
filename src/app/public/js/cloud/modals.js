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

// --- Rename Modal ---
let renameState = {
    itemId: null,
    extension: ''
};

export const openRenameModal = (itemId, fullName) => {
    renameState.itemId = itemId;
    
    // Logik: Dateiendung extrahieren
    const lastDotIndex = fullName.lastIndexOf('.');
    let baseName = fullName;
    renameState.extension = '';

    if (lastDotIndex !== -1 && lastDotIndex > 0) {
        baseName = fullName.substring(0, lastDotIndex);
        renameState.extension = fullName.substring(lastDotIndex); // z.B. ".mp4"
    }

    DOM.renameItemInput.value = baseName;
    DOM.renameItemModal.classList.remove('hidden');
    DOM.renameItemInput.focus();
};

export const closeRenameModal = () => {
    DOM.renameItemModal.classList.add('hidden');
    renameState = { itemId: null, extension: '' };
};

// Confirm Rename Handler
if (DOM.confirmRenameItemBtn) {
    DOM.confirmRenameItemBtn.onclick = async () => {
        const newBaseName = DOM.renameItemInput.value.trim();
        if (newBaseName && renameState.itemId) {
            const finalName = newBaseName + renameState.extension;
            try {
                await api.renameItem(renameState.itemId, finalName);
                closeRenameModal();
                closeFilePreview(); 
                
                // SPA Refresh via Event
                document.dispatchEvent(new CustomEvent('cloudRefreshRequired'));
                
            } catch (error) {
                console.error("Rename failed:", error);
            }
        }
    };
}

if (DOM.cancelRenameItemBtn) {
    DOM.cancelRenameItemBtn.onclick = closeRenameModal;
}


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
let currentAudio = null;
let currentVideo = null;

export const openFilePreview = async (itemId, itemName, fileSize = 0) => {
    // Navbar verstecken (Mobile Fix)
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.add('nav-hidden');

    // Stop any currently playing audio or video before loading new preview
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if (currentVideo) {
        currentVideo.pause();
        currentVideo = null;
    }

    currentPreviewId = itemId;
    DOM.previewFileName.textContent = itemName;
    DOM.previewContainer.innerHTML = '<h4>Loading preview...</h4>';
    DOM.previewModal.classList.remove('hidden');

    // Setup Navigation Buttons
    const prevBtn = document.getElementById('preview-prev-btn');
    const nextBtn = document.getElementById('preview-next-btn');
    const downloadBtn = document.getElementById('preview-download-action-btn');
    const renameBtn = DOM.previewRenameBtn;

    // Rename Button Setup
    if (renameBtn) {
        renameBtn.innerHTML = ICONS.edit;
        renameBtn.onclick = () => openRenameModal(itemId, itemName);
    }

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
                                <button class="video-btn" id="video-rewind" title="-10s">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
                                </button>
                                <button class="video-btn" id="video-play-toggle">
                                    <svg id="video-play-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    <svg id="video-pause-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                </button>
                                <button class="video-btn" id="video-forward" title="+10s">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
                                </button>
                                <div class="video-time">
                                    <span id="video-current-time">0:00</span> / <span id="video-duration">0:00</span>
                                </div>
                                <div class="video-volume-container">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
                                    <input type="range" class="video-volume-slider" id="video-volume" min="0" max="1" step="0.05" value="1">
                                </div>
                            </div>
                            <div class="video-controls-right">
                                <button class="video-btn" id="video-fullscreen">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;

            const video = document.getElementById('custom-video-element');
            currentVideo = video;
            const playerContainer = document.getElementById('video-player-container');
            const playBtn = document.getElementById('video-play-toggle');
            const playIcon = document.getElementById('video-play-icon');
            const pauseIcon = document.getElementById('video-pause-icon');
            const progressBar = document.getElementById('video-progress-bar');
            const progressFill = document.getElementById('video-progress-fill');
            const currentTimeEl = document.getElementById('video-current-time');
            const durationEl = document.getElementById('video-duration');
            const volumeSlider = document.getElementById('video-volume');
            const rewindBtn = document.getElementById('video-rewind');
            const forwardBtn = document.getElementById('video-forward');
            const fullscreenBtn = document.getElementById('video-fullscreen');

            const formatTime = (s) => {
                const mins = Math.floor(s / 60);
                const secs = Math.floor(s % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            const togglePlay = () => {
                if (video.paused || video.ended) {
                    video.play();
                    playerContainer.classList.remove('paused');
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                } else {
                    video.pause();
                    playerContainer.classList.add('paused');
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                }
            };

            playBtn.onclick = togglePlay;
            video.onclick = togglePlay;

            video.addEventListener('loadedmetadata', () => {
                durationEl.textContent = formatTime(video.duration);
            });

            video.addEventListener('timeupdate', () => {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = `${percent}%`;
                currentTimeEl.textContent = formatTime(video.currentTime);
            });

            video.addEventListener('ended', () => {
                playerContainer.classList.add('paused');
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            });

            progressBar.onclick = (e) => {
                const rect = progressBar.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                video.currentTime = pos * video.duration;
            };

            volumeSlider.oninput = () => {
                video.volume = volumeSlider.value;
            };

            rewindBtn.onclick = () => {
                video.currentTime = Math.max(0, video.currentTime - 10);
            };

            forwardBtn.onclick = () => {
                video.currentTime = Math.min(video.duration, video.currentTime + 10);
            };

            fullscreenBtn.onclick = () => {
                if (!document.fullscreenElement) {
                    if (playerContainer.requestFullscreen) {
                        playerContainer.requestFullscreen();
                    } else if (playerContainer.webkitRequestFullscreen) {
                        playerContainer.webkitRequestFullscreen();
                    } else if (playerContainer.msRequestFullscreen) {
                        playerContainer.msRequestFullscreen();
                    }
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                }
            };
        } else if (audioTypes.includes(fileType)) {

            DOM.previewContainer.innerHTML = `
                <div class="custom-audio-player">
                    <div class="audio-icon-container">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    </div>
                    <div class="audio-info">
                        <div class="audio-title">${itemName}</div>
                    </div>
                    
                    <div class="audio-progress-container">
                        <input type="range" class="audio-progress-bar" id="audio-progress" value="0" min="0" max="100" step="0.1">
                        <div class="audio-time">
                            <span id="audio-current-time">0:00</span>
                            <span id="audio-duration">0:00</span>
                        </div>
                    </div>
                    
                    <div class="audio-controls">
                        <button class="audio-btn" id="audio-rewind" title="-10s">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
                        </button>
                        <button class="audio-play-btn" id="audio-play-toggle">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <button class="audio-btn" id="audio-forward" title="+10s">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
                        </button>
                    </div>

                    <div class="audio-volume-container">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        <input type="range" class="audio-volume-slider" id="audio-volume" min="0" max="1" step="0.05" value="1">
                    </div>
                </div>`;

            const audio = new Audio(tempPath);
            currentAudio = audio;

            const playBtn = document.getElementById('audio-play-toggle');
            const progress = document.getElementById('audio-progress');
            const currentTimeEl = document.getElementById('audio-current-time');
            const durationEl = document.getElementById('audio-duration');
            const volumeSlider = document.getElementById('audio-volume');
            const rewindBtn = document.getElementById('audio-rewind');
            const forwardBtn = document.getElementById('audio-forward');

            const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>`;
            const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

            const formatTime = (s) => {
                const mins = Math.floor(s / 60);
                const secs = Math.floor(s % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            audio.addEventListener('loadedmetadata', () => {
                if (!isNaN(audio.duration)) {
                    durationEl.textContent = formatTime(audio.duration);
                    progress.max = audio.duration;
                }
            });

            audio.addEventListener('timeupdate', () => {
                progress.value = audio.currentTime;
                currentTimeEl.textContent = formatTime(audio.currentTime);
            });

            playBtn.onclick = () => {
                if (audio.paused) {
                    audio.play().catch(e => console.log('Playback prevented', e));
                    playBtn.innerHTML = pauseIcon;
                } else {
                    audio.pause();
                    playBtn.innerHTML = playIcon;
                }
            };

            progress.oninput = () => {
                audio.currentTime = progress.value;
            };

            volumeSlider.oninput = () => {
                audio.volume = volumeSlider.value;
            };

            rewindBtn.onclick = () => {
                audio.currentTime = Math.max(0, audio.currentTime - 10);
            };

            forwardBtn.onclick = () => {
                audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
            };

            audio.onended = () => {
                playBtn.innerHTML = playIcon;
            };
        } else if (textTypes.includes(fileType)) {
            const textContent = await (await fetch(tempPath)).text();
            DOM.previewContainer.innerHTML = `<pre style="background: #1e1e1e; padding: 15px; border-radius: 8px; overflow: auto; max-height: 70vh; color: #d4d4d4;">${textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
        } else {
            DOM.previewContainer.innerHTML = `<div class="preview-no-preview">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
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

    // Navbar wieder anzeigen (Mobile Fix)
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) sidebar.classList.remove('nav-hidden');

    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if (currentVideo) {
        currentVideo.pause();
        currentVideo = null;
    }

    DOM.previewContainer.innerHTML = '';
    DOM.previewFileName.textContent = '';
    currentPreviewId = null;
};