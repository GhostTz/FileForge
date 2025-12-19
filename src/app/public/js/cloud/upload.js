import { DOM } from './constants.js';
import { state } from './state.js';

// 2GB Limit (Local Telegram Server restriction)
// 2000 MB * 1024 * 1024
const MAX_FILE_SIZE = 2000 * 1024 * 1024; 

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

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(e.loaded, e.total);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    console.error("Full Error Response:", errorResponse);
                    const errorMsg = errorResponse.message + (errorResponse.error ? `: ${errorResponse.error}` : '');
                    reject(new Error(errorMsg));
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

const uploadQueue = [];
let isProcessingQueue = false;

async function processQueue(showToast) {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    while (uploadQueue.length > 0) {
        const { files, parentId } = uploadQueue.shift();
        
        const fileList = Array.from(files);

        if (fileList.length === 0) continue;

        const totalFiles = fileList.length;
        let completed = 0;
        let failed = 0;

        const totalBatchSize = fileList.reduce((acc, file) => acc + file.size, 0);
        let totalUploadedBytes = 0;
        let currentFileUploadedBytes = 0;

        let notifId = null;
        if (window.NotificationManager) {
            notifId = window.NotificationManager.showProgressNotification('Uploading Files');
            window.NotificationManager.updateProgress(notifId, 0, totalBatchSize, `Preparing ${totalFiles} file(s)...`);
        }

        const startTime = Date.now();

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const fileNum = i + 1;
            currentFileUploadedBytes = 0; // Reset for new file

            try {
                await uploadFile(file, parentId, (loaded, total) => {
                    currentFileUploadedBytes = loaded;
                    const currentTotalUploaded = totalUploadedBytes + currentFileUploadedBytes;

                    if (notifId && window.NotificationManager) {
                        const elapsedSeconds = (Date.now() - startTime) / 1000;
                        const speed = elapsedSeconds > 0 ? currentTotalUploaded / elapsedSeconds : 0;
                        const speedText = formatSpeed(speed);

                        window.NotificationManager.updateProgress(
                            notifId,
                            currentTotalUploaded,
                            totalBatchSize,
                            `Uploading ${file.name} (${fileNum}/${totalFiles}) - ${speedText}`
                        );
                    }
                });

                completed++;
                totalUploadedBytes += file.size;

                document.dispatchEvent(new CustomEvent('cloudRefreshRequired'));

            } catch (error) {
                failed++;
                console.error(`Failed to upload ${file.name}:`, error);
                totalUploadedBytes += file.size;

                if (notifId && window.NotificationManager) {
                    window.NotificationManager.updateProgress(
                        notifId,
                        totalUploadedBytes,
                        totalBatchSize,
                        `Failed to upload ${file.name}`
                    );
                }
            }

            // Rate limiting: wait 2 seconds between uploads
            if (i < fileList.length - 1 || uploadQueue.length > 0) {
                await sleep(2000);
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

    isProcessingQueue = false;
}

async function handleFiles(files, showToast) {
    const rawFileList = Array.from(files);
    const validFiles = [];
    const invalidFiles = [];

    // Pre-Check Phase
    for (const file of rawFileList) {
        if (file.size > MAX_FILE_SIZE) {
            invalidFiles.push(file);
        } else {
            validFiles.push(file);
        }
    }

    // Immediate Feedback for invalid files
    if (invalidFiles.length > 0) {
        if (window.NotificationManager) {
            invalidFiles.forEach(file => {
                window.NotificationManager.showNotification(
                    'error', 
                    'File too large', 
                    `"${file.name}" exceeds the 2GB limit.`
                );
            });
        } else {
            // Fallback if notification system isn't ready
            alert(`${invalidFiles.length} file(s) skipped because they exceed 2GB.`);
        }
    }

    // Process valid files
    if (validFiles.length > 0) {
        // Push only valid files to queue
        uploadQueue.push({ files: validFiles, parentId: state.currentParentId });
        // Trigger processing
        processQueue(showToast);
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