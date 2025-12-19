const fs = require('fs');
const path = require('path');
const http = require('http');

const TEMP_DIR = path.join(__dirname, '..', '..', '..', 'temp');
const TG_DATA_DIR = '/var/lib/telegram-bot-api'; 

const TEMP_CLEANUP_INTERVAL = 10 * 60 * 1000;
const TG_CHECK_INTERVAL = 6 * 60 * 60 * 1000;

const TG_SIZE_LIMIT_GB = 10;
const TG_SIZE_LIMIT_BYTES = TG_SIZE_LIMIT_GB * 1024 * 1024 * 1024;

const getFolderSize = (dirPath) => {
    let size = 0;
    try {
        if (!fs.existsSync(dirPath)) return 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.lstatSync(filePath);
            if (stats.isDirectory()) {
                size += getFolderSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (error) {}
    return size;
};

const restartTelegramContainer = () => {
    console.log('[Cleanup] Sending restart request to Docker Socket for: telegram-bot-api');

    const options = {
        socketPath: '/var/run/docker.sock',
        path: '/containers/telegram-bot-api/restart',
        method: 'POST'
    };

    const req = http.request(options, (res) => {
        if (res.statusCode === 204) {
            console.log('[Cleanup] Docker acknowledged restart request. Container is restarting.');
        } else {
            console.error(`[Cleanup] Docker Socket returned status: ${res.statusCode}`);
        }
    });

    req.on('error', (e) => {
        console.error(`[Cleanup] Docker Socket communication error: ${e.message}`);
        console.error('[Cleanup] Tip: Check if /var/run/docker.sock is correctly mounted in docker-compose.yml');
    });

    req.end();
};

const purgeTelegramData = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) return;
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            fs.rmSync(filePath, { recursive: true, force: true });
        }
        console.log(`[Cleanup] Purge complete. Directory ${dirPath} wiped.`);
        
        // Den Neustart über den Socket auslösen
        restartTelegramContainer();
        
    } catch (error) {
        console.error(`[Cleanup] Purge failed:`, error.message);
    }
};

const checkAndCleanTelegramData = () => {
    console.log(`[${new Date().toISOString()}] Running storage check...`);
    
    if (!fs.existsSync(TG_DATA_DIR)) {
        console.log(`[Cleanup] Directory ${TG_DATA_DIR} not found. Ensure volume is mounted.`);
        return;
    }

    const currentSize = getFolderSize(TG_DATA_DIR);
    const sizeInGB = (currentSize / (1024 * 1024 * 1024)).toFixed(2);

    console.log(`[Cleanup] Folder: ${TG_DATA_DIR} | Size: ${sizeInGB} GB | Limit: ${TG_SIZE_LIMIT_GB} GB`);

    if (currentSize > TG_SIZE_LIMIT_BYTES) {
        console.log(`[Cleanup] LIMIT EXCEEDED! Wiping Telegram cache and restarting service...`);
        purgeTelegramData(TG_DATA_DIR);
    } else {
        console.log(`[Cleanup] Size is within limits.`);
    }
};

const cleanupTempFolder = () => {
    if (!fs.existsSync(TEMP_DIR)) return;
    try {
        const files = fs.readdirSync(TEMP_DIR);
        files.forEach((file) => {
            const filePath = path.join(TEMP_DIR, file);
            try { fs.unlinkSync(filePath); } catch (e) {}
        });
    } catch (err) {}
};

const start = () => {
    console.log(`[Cleanup] Services initialized.`);
    
    cleanupTempFolder();
    setInterval(cleanupTempFolder, TEMP_CLEANUP_INTERVAL);

    checkAndCleanTelegramData(); 
    setInterval(checkAndCleanTelegramData, TG_CHECK_INTERVAL);
};

module.exports = { start };