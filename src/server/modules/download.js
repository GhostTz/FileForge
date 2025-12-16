const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Pfad zum Temp-Ordner (root/temp)
const TEMP_DIR = path.resolve(__dirname, '../../../temp');

// Stelle sicher, dass der Temp-Ordner existiert
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

router.post('/process', async (req, res) => {
    const { url, type } = req.body;

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

    console.log(`[Download] Starting: ${type} for ${url}`);

    const process = spawn('yt-dlp', args);
    let errorOutput = ''; // Variable zum Sammeln von Fehlermeldungen

    process.stdout.on('data', (data) => {
        console.log(`[yt-dlp]: ${data}`);
    });

    process.stderr.on('data', (data) => {
        const errorData = data.toString();
        console.error(`[yt-dlp error]: ${errorData}`);
        errorOutput += errorData; // Fehler-Output sammeln
    });

    process.on('close', (code) => {
        if (code === 0) {
            const ext = type === 'mp3' ? 'mp3' : 'mp4';
            const filename = `${fileId}.${ext}`;
            
            if (fs.existsSync(path.join(TEMP_DIR, filename))) {
                res.json({ 
                    success: true, 
                    downloadUrl: `temp/${filename}`,
                    filename: filename 
                });
            } else {
                res.status(500).json({ message: 'Download finished but file not found.' });
            }
        } else {
            // NEU: Fehleranalyse
            if (errorOutput.includes('Sign in to confirm your age')) {
                res.status(403).json({ message: 'This video is age-restricted and cannot be downloaded.' });
            } else {
                // Generische Fehlermeldung für alle anderen Probleme
                res.status(500).json({ message: 'The download process failed. The link may be invalid or private.' });
            }
        }
    });
});

module.exports = router;