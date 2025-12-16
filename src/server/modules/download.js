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

    // Eindeutige ID für den Dateinamen generieren (vermeidet Probleme mit Sonderzeichen)
    const fileId = `dl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let outputTemplate = '';
    let args = [];

    // Konfiguration basierend auf Auswahl
    if (type === 'mp3') {
        // Audio: MP3, 128k
        outputTemplate = path.join(TEMP_DIR, `${fileId}.%(ext)s`);
        args = [
            '-x', // Extract audio
            '--audio-format', 'mp3',
            '--audio-quality', '128K',
            '--no-playlist',
            '-o', outputTemplate,
            url
        ];
    } else {
        // Video: MP4, max 1080p
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

    process.stdout.on('data', (data) => {
        // Optional: Hier könnte man den Fortschritt parsen
        console.log(`[yt-dlp]: ${data}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`[yt-dlp error]: ${data}`);
    });

    process.on('close', (code) => {
        if (code === 0) {
            // Erfolg! Dateinamen ermitteln
            const ext = type === 'mp3' ? 'mp3' : 'mp4';
            const filename = `${fileId}.${ext}`;
            
            // Prüfen ob Datei wirklich da ist
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
            res.status(500).json({ message: 'Download process failed.', code });
        }
    });
});

module.exports = router;