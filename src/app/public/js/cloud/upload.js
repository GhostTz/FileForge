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

function uploadFile(file, parentId, notificationId) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentId', parentId === null ? 'null' : parentId);

        const xhr = new XMLHttpRequest();
        const startTime = Date.now();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && window.NotificationManager) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                const elapsedSeconds = (Date.now() - startTime) / 1000;
                const speed = e.loaded / elapsedSeconds;
                const remainingBytes = e.total - e.loaded;
                const timeRemaining = remainingBytes / speed;

                const speedText = formatSpeed(speed);
                const timeText = isFinite(timeRemaining) ? formatTime(timeRemaining) : 'calculating...';

                window.NotificationManager.updateProgress(
                    notificationId,
                    e.loaded,
                    e.total,
                    `Uploading ${file.name} - ${speedText} • ${timeText}`
                );
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    reject(new Error(errorResponse.message));
                } catch (jsonError) {
                    reject(new Error(`Server error: ${xhr.status}`));
                }
            }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));

        xhr.open('POST', 'api/cloud/upload');
        xhr.send(formData);
    });
}

async function handleFiles(files, showToast) {
    let fileList = Array.from(files);
    if (fileList.length === 0) return;

    const MAX_FILE_SIZE = 49 * 1024 * 1024; // 49 MB
    const totalFiles = fileList.length;
    let completed = 0;
    let failed = 0;

    // Create single notification for all uploads
    let notifId = null;
    if (window.NotificationManager) {
        notifId = window.NotificationManager.showProgressNotification('Uploading Files');
        window.NotificationManager.updateProgress(notifId, 0, totalFiles, `Preparing ${totalFiles} file(s)...`);
    }

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fileNum = i + 1;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            failed++;
            console.error(`Failed to upload ${file.name}: File exceeds 50 MB limit.`);
            if (notifId && window.NotificationManager) {
                window.NotificationManager.updateProgress(
                    notifId,
                    completed,
                    totalFiles,
                    `Skipped ${file.name} (too large) - ${fileNum} of ${totalFiles}`
                );
            }
            continue;
        }

        // Update notification to show current file being uploaded
        if (notifId && window.NotificationManager) {
            window.NotificationManager.updateProgress(
                notifId,
                completed,
                totalFiles,
                `Uploading ${file.name} (${fileNum} of ${totalFiles})...`
            );
        }

        try {
            await uploadFile(file, state.currentParentId, notifId);
            completed++;

            // Update progress after successful upload
            if (notifId && window.NotificationManager) {
                window.NotificationManager.updateProgress(
                    notifId,
                    completed,
                    totalFiles,
                    `Uploaded ${completed} of ${totalFiles} files`
                );
            }
        } catch (error) {
            failed++;
            console.error(`Failed to upload ${file.name}:`, error);

            // Update with error info
            if (notifId && window.NotificationManager) {
                window.NotificationManager.updateProgress(
                    notifId,
                    completed,
                    totalFiles,
                    `Failed to upload ${file.name} - ${completed} of ${totalFiles} complete`
                );
            }
        }
    }

    // Close progress notification and show final result
    if (notifId && window.NotificationManager) {
        window.NotificationManager.closeNotification(notifId);

        if (failed === 0) {
            window.NotificationManager.showNotification('success', 'Upload Complete', `Successfully uploaded ${completed} file(s).`);
        } else if (completed > 0) {
            window.NotificationManager.showNotification('info', 'Upload Finished', `Uploaded ${completed} file(s), ${failed} failed.`);
        } else {
            window.NotificationManager.showNotification('error', 'Upload Failed', `Failed to upload ${failed} file(s).`);
        }
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