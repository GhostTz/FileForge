import { DOM } from './constants.js';
import { state } from './state.js';

function formatTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m remaining`;
}

function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

function uploadFile(file, parentId, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentId', parentId === null ? 'null' : parentId);

        const xhr = new XMLHttpRequest();
        const elId = `upload-item-${Date.now()}-${Math.random()}`;
        const uploadItemHTML = `
            <div class="upload-item" id="${elId}">
                <div class="upload-item-info">
                    <p class="file-name">${file.name}</p>
                    <p class="upload-status-text">Starting...</p>
                    <div class="upload-progress-bar"><div class="upload-progress-fill"></div></div>
                </div>
                <span class="upload-percentage">0%</span>
            </div>`;
        DOM.uploadQueueContainer.insertAdjacentHTML('beforeend', uploadItemHTML);
        
        const itemElement = document.getElementById(elId);
        const fill = itemElement.querySelector('.upload-progress-fill');
        const percent = itemElement.querySelector('.upload-percentage');
        const statusText = itemElement.querySelector('.upload-status-text');
        
        const startTime = Date.now();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                const elapsedSeconds = (Date.now() - startTime) / 1000;
                const speed = e.loaded / elapsedSeconds;
                const remainingBytes = e.total - e.loaded;
                const timeRemaining = remainingBytes / speed;
                
                onProgress({ el: itemElement, percentage, speed, timeRemaining });
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                statusText.textContent = 'Completed';
                resolve(JSON.parse(xhr.responseText));
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    statusText.textContent = `Error: ${errorResponse.message}`;
                    reject(new Error(errorResponse.message));
                } catch (jsonError) {
                    statusText.textContent = `Error: Server returned an invalid response.`;
                    reject(new Error(`Server error: ${xhr.status}`));
                }
                itemElement.querySelector('.upload-progress-bar').style.backgroundColor = 'var(--danger-color)';
            }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));

        xhr.open('POST', 'api/cloud/upload');
        xhr.send(formData);
    });
}

async function handleFiles(files, showToast) {
    DOM.uploadQueueContainer.innerHTML = '';
    
    let fileList = Array.from(files);
    if (fileList.length === 0) return;

    let completed = 0;
    let failed = 0;

    const onProgress = ({ el, percentage, speed, timeRemaining }) => {
        el.querySelector('.upload-progress-fill').style.width = percentage + '%';
        el.querySelector('.upload-percentage').textContent = percentage + '%';
        const statusEl = el.querySelector('.upload-status-text');
        statusEl.textContent = `${formatSpeed(speed)} • ${isFinite(timeRemaining) ? formatTime(timeRemaining) : '...'}`;
    };

    const MAX_FILE_SIZE = 49 * 1024 * 1024; // 49 MB (Sicherheitsmarge für Telegrams 50MB Limit)
    
    for(const file of fileList) {
        // --- HIER IST DIE NEUE PRÜFUNG ---
        if (file.size > MAX_FILE_SIZE) {
            failed++;
            console.error(`Failed to upload ${file.name}: File exceeds 50 MB limit.`);
            showToast(`${file.name} is too large (max 50 MB).`, 'error');
            continue; // Überspringt diese Datei und macht mit der nächsten weiter
        }
        
        try {
            await uploadFile(file, state.currentParentId, onProgress);
            completed++;
        } catch (error) {
            failed++;
            console.error(`Failed to upload ${file.name}:`, error);
        }
    }

    if (completed > 0) {
        showToast(`${completed} file(s) uploaded successfully`, 'success');
    }
    if (failed > 0 && completed === 0) { // Zeigt die allgemeine Fehlermeldung nur an, wenn keine andere spezifische Meldung angezeigt wurde
        showToast(`${failed} upload(s) failed.`, 'error');
    }
}

export function initializeUpload(showToast) {
    DOM.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
    DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
    DOM.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files, showToast);
    });
    DOM.browseFilesBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = e => handleFiles(e.target.files, showToast);
        input.click();
    });
}