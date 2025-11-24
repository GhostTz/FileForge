const robot = require("robotjs");
const ncp = require("copy-paste");
const process = require('process');

// --- Konfiguration ---
const CHECK_INTERVAL_MS = 1000;
const TYPING_DELAY_S = 3;
const TARGET_ENDING = "@alt.com";

// --- Menschliche Simulation ---
const MIN_DELAY_BETWEEN_CHARS_MS = 60; // Minimale Pause ZWISCHEN den Zeichen
const MAX_DELAY_BETWEEN_CHARS_MS = 180; // Maximale Pause ZWISCHEN den Zeichen

// --- Farben ---
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    red: "\x1b[31m",
};

let lastClipboardContent = "";
let isTyping = false;
let spinner = ['|', '/', '-', '\\'];
let spinnerIndex = 0;

console.log(colors.green + "======================================================" + colors.reset);
console.log(colors.green + "=====     Auto-Typer v7 (Reliable) gestartet     =====" + colors.reset);
console.log(colors.green + "======================================================" + colors.reset);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

function readClipboard() {
    return new Promise((resolve, reject) => {
        ncp.paste((err, content) => err ? reject(err) : resolve(content || ""));
    });
}

const mainLoop = async () => {
    if (isTyping) return;
    process.stdout.write(`\r${colors.cyan}[ AKTIV ]${colors.reset} Überwache Zwischenablage... ${spinner[spinnerIndex]}`);
    spinnerIndex = (spinnerIndex + 1) % spinner.length;

    const currentClipboardContent = await readClipboard();

    if (currentClipboardContent !== lastClipboardContent) {
        process.stdout.write('\r' + ' '.repeat(50) + '\r');
        console.log(`\n${colors.yellow}--- [ NEUE EINGABE IN ZWISCHENABLAGE ] ---${colors.reset}`);
        console.log(`   ┖ᐅ Inhalt: "${currentClipboardContent}"`);

        lastClipboardContent = currentClipboardContent;

        if (typeof currentClipboardContent === 'string' && currentClipboardContent.endsWith(TARGET_ENDING)) {
            console.log(`   ┖ᐅ Check:  Endet mit "${TARGET_ENDING}"? ${colors.green}[ GÜLTIG ]${colors.reset}\n`);
            await startTypingProcess(currentClipboardContent);
        } else {
            console.log(`   ┖ᐅ Check:  Endet mit "${TARGET_ENDING}"? ${colors.red}[ UNGÜLTIG ]${colors.reset}\n`);
        }
    }
};

async function startTypingProcess(contentToType) {
    isTyping = true;

    for (let i = TYPING_DELAY_S; i > 0; i--) {
        process.stdout.write(`\r${colors.magenta}[ COUNTDOWN ]${colors.reset} Beginne zu tippen in ${i}...`);
        await sleep(1000);
    }
    
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    console.log(`${colors.green}[ AKTION ]${colors.reset} Starte zuverlässige Tastatureingabe...\n`);
    await sleep(getRandomDelay(100, 300));

    const chars = contentToType.split('');
    for (const char of chars) {
        // HIER IST DIE KORREKTUR: Wir nutzen typeString für JEDEN Buchstaben.
        // Das ist die zuverlässigste Methode für Sonderzeichen.
        robot.typeString(char);
        console.log(`   ${colors.green}Tippe:${colors.reset} ${char}`);
        
        // Zufällige Pause bis zum nächsten Buchstaben
        await sleep(getRandomDelay(MIN_DELAY_BETWEEN_CHARS_MS, MAX_DELAY_BETWEEN_CHARS_MS));
    }
    
    console.log(`\n${colors.green}[ FERTIG ]${colors.reset} Eingabe abgeschlossen. Überwachung wird fortgesetzt.\n`);
    isTyping = false;
}

const start = async () => {
    lastClipboardContent = await readClipboard();
    setInterval(mainLoop, CHECK_INTERVAL_MS);
};

start();
