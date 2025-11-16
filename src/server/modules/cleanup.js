
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', '..', '..', 'temp');
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

const cleanupTempFolder = () => {
    console.log(`[${new Date().toISOString()}] Running cleanup for temp folder...`);
    fs.readdir(TEMP_DIR, (err, files) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log('Temp directory does not exist, skipping cleanup.');
                return;
            }
            console.error('Could not list the directory.', err);
            return;
        }

        if (files.length === 0) {
            console.log('Temp folder is already empty.');
            return;
        }

        let deletedCount = 0;
        files.forEach((file, index) => {
            const filePath = path.join(TEMP_DIR, file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error deleting file ${filePath}:`, err);
                } else {
                    deletedCount++;
                    if (index === files.length - 1) { // Last file
                        console.log(`Cleanup complete. Deleted ${deletedCount} file(s).`);
                    }
                }
            });
        });
    });
};

const start = () => {
    console.log(`Cleanup service started. Temp folder will be cleared every ${CLEANUP_INTERVAL / 60000} minutes.`);
    cleanupTempFolder();
    setInterval(cleanupTempFolder, CLEANUP_INTERVAL);
};

module.exports = { start };