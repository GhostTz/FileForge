// config/preflightChecks.js
const fs = require('fs');
const path = require('path');
const semver = require('semver');

// ANSI Farbcodes für schöne Konsolenausgaben
const C = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
};

/**
 * Führt eine Reihe von Überprüfungen durch, um sicherzustellen,
 * dass die Anwendungsumgebung korrekt konfiguriert ist.
 */
const runPreflightChecks = () => {
    console.log(`${C.Bright}${C.Blue}ZRS Pre-Flight Check wird gestartet...${C.Reset}`);
    
    // =================================================================
    //                 PHASE 1: SYSTEM-CHECKS
    // =================================================================
    console.log(`\n${C.Bright}1. Überprüfe System-Abhängigkeiten...${C.Reset}`);

    // Check 1: Node.js Version
    // Wir müssen den Pfad zur package.json vom Projekt-Root aus betrachten
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const requiredNodeVersion = require(packageJsonPath).engines.node;
    const currentNodeVersion = process.version;

    if (!semver.satisfies(currentNodeVersion, requiredNodeVersion)) {
        console.error(`${C.Red}FEHLER: Falsche Node.js Version.${C.Reset}`);
        console.error(` - Benötigt: ${requiredNodeVersion}`);
        console.error(` - Installiert: ${currentNodeVersion}`);
        console.error(`${C.Yellow}Bitte installiere eine kompatible Node.js Version.${C.Reset}`);
        process.exit(1);
    }
    console.log(`${C.Green}  - Node.js Version ist kompatibel (${currentNodeVersion}). [OK]${C.Reset}`);

    // Check 2: .env Datei
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.error(`${C.Red}FEHLER: Konfigurationsdatei (.env) nicht gefunden.${C.Reset}`);
        if (fs.existsSync(path.join(__dirname, '..', '.env.example'))) {
            console.error(`${C.Yellow}Eine Vorlage (.env.example) existiert. Bitte kopiere sie zu '.env' und fülle sie aus.${C.Reset}`);
        }
        process.exit(1);
    }
    console.log(`${C.Green}  - Konfigurationsdatei (.env) gefunden. [OK]${C.Reset}`);
    
    // =================================================================
    //                 PHASE 2: PAKET-CHECKS
    // =================================================================
    console.log(`\n${C.Bright}2. Überprüfe NPM Pakete...${C.Reset}`);
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        console.error(`${C.Red}FEHLER: Der 'node_modules'-Ordner fehlt.${C.Reset}`);
        console.error(`${C.Yellow}Bitte führe 'npm install' aus, um alle nötigen Pakete zu installieren.${C.Reset}`);
        process.exit(1);
    }
    console.log(`${C.Green}  - 'node_modules' Ordner gefunden. [OK]${C.Reset}`);

    console.log(`\n${C.Green}✅ System- und Paket-Checks erfolgreich abgeschlossen.${C.Reset}`);
};

module.exports = { runPreflightChecks };