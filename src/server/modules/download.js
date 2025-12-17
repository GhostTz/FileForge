const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../config/database'); // DB Import hinzugefügt

// Pfad zum Temp-Ordner (root/temp)
const TEMP_DIR = path.resolve(__dirname, '../../../temp');

// Stelle sicher, dass der Temp-Ordner existiert
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

router.post('/process', async (req, res) => {
    const { url, type } = req.body;
    const username = req.user.username; // User aus dem Auth-Token

    if (!url) return res.status(400).json({ message: 'No URL provided' });

    const fileId = `dl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let outputTemplate = '';
    let args = [];

    if (type === 'mp3') {
        outputTemplate = path.join(TEMP_DIR, `${fileId}.%(ext)s`);
        args = [
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '128K',
            '--no-playlist',
            '-o', outputTemplate,
            url
        ];
    } else {
        outputTemplate = path.join(TEMP_DIR, `${fileId}.%(ext)s`);
        args = [
            '-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '--no-playlist',
            '-o', outputTemplate,
            url
        ];
    }

    console.log(`[Download] Starting: ${type} for ${url} by ${username}`);

    const process = spawn('yt-dlp', args);
    let errorOutput = '';

    process.stdout.on('data', (data) => {
        console.log(`[yt-dlp]: ${data}`);
    });

    process.stderr.on('data', (data) => {
        const errorData = data.toString();
        console.error(`[yt-dlp error]: ${errorData}`);
        errorOutput += errorData;
    });

    process.on('close', async (code) => {
        if (code === 0) {
            const ext = type === 'mp3' ? 'mp3' : 'mp4';
            const filename = `${fileId}.${ext}`;
            const filePath = path.join(TEMP_DIR, filename);

            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);

                // Erfolgreicher Download -> DB Eintrag
                try {
                    await db.query(
                        'INSERT INTO downloaded_media (username, link, format, success, errorcode) VALUES (?, ?, ?, ?, ?)',
                        [username, url, type, true, null]
                    );
                } catch (dbError) {
                    console.error('Database logging error (Success):', dbError);
                }

                res.json({ 
                    success: true, 
                    downloadUrl: `temp/${filename}`,
                    filename: filename,
                    filesize: stats.size // Dateigröße in Bytes
                });
            } else {
                // Download angeblich fertig, aber Datei nicht da -> Fehler DB Eintrag
                const errorMsg = 'Download process finished but file not found.';
                try {
                    await db.query(
                        'INSERT INTO downloaded_media (username, link, format, success, errorcode) VALUES (?, ?, ?, ?, ?)',
                        [username, url, type, false, errorMsg]
                    );
                } catch (dbError) {
                    console.error('Database logging error (File Missing):', dbError);
                }

                res.status(500).json({ message: errorMsg });
            }
        } else {
            // Fehler beim Download Prozess -> Fehler DB Eintrag
            let cleanError = errorOutput;
            if (errorOutput.includes('Sign in to confirm your age')) {
                cleanError = 'Age restricted content.';
                res.status(403).json({ message: 'This video is age-restricted and cannot be downloaded.' });
            } else {
                res.status(500).json({ message: 'The download process failed. The link may be invalid or private.' });
            }

            try {
                await db.query(
                    'INSERT INTO downloaded_media (username, link, format, success, errorcode) VALUES (?, ?, ?, ?, ?)',
                    [username, url, type, false, cleanError]
                );
            } catch (dbError) {
                console.error('Database logging error (Process Failed):', dbError);
            }
        }
    });
});

module.exports = router;