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

const uploadQueue = [];
let isProcessingQueue = false;

async function processQueue(showToast) {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    while (uploadQueue.length > 0) {
        // Take the next batch of files
        const { files, parentId } = uploadQueue.shift();
        const fileList = Array.from(files);

        if (fileList.length === 0) continue;

        const MAX_FILE_SIZE = 49 * 1024 * 1024; // 49 MB
        const totalFiles = fileList.length;
        let completed = 0;
        let failed = 0;

        // Calculate total batch size for smooth progress
        const totalBatchSize = fileList.reduce((acc, file) => acc + file.size, 0);
        let totalUploadedBytes = 0;
        let currentFileUploadedBytes = 0;

        // Create single notification for all uploads
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

            // Check file size
            if (file.size > MAX_FILE_SIZE) {
                failed++;
                console.error(`Failed to upload ${file.name}: File exceeds 50 MB limit.`);
                // Add skipped file size to total uploaded so progress bar doesn't lag
                totalUploadedBytes += file.size;

                if (notifId && window.NotificationManager) {
                    window.NotificationManager.updateProgress(
                        notifId,
                        totalUploadedBytes,
                        totalBatchSize,
                        `Skipped ${file.name} (too large)`
                    );
                }
                continue;
            }

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
                totalUploadedBytes += file.size; // Add completed file size to total

            } catch (error) {
                failed++;
                console.error(`Failed to upload ${file.name}:`, error);
                // Even if failed, we count it as "processed" for progress bar continuity
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
    if (files.length === 0) return;
    // Push to queue
    uploadQueue.push({ files, parentId: state.currentParentId });
    // Trigger processing
    processQueue(showToast);
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