const db = require('./database');

const requiredTables = {
    users: {
        columns: {
            username: 'VARCHAR(255) NOT NULL PRIMARY KEY',
            password: 'VARCHAR(255) NOT NULL',
            rank: "VARCHAR(50) NOT NULL DEFAULT 'user'"
        }
    }
};

const initializeDatabase = async () => {
    console.log('Überprüfe Datenbank-Integrität...');
    try {
        for (const tableName in requiredTables) {
            const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);

            if (rows.length === 0) {
                console.log(`Tabelle '${tableName}' nicht gefunden. Erstelle sie...`);
                const columns = requiredTables[tableName].columns;
                const columnDefinitions = Object.entries(columns)
                    .map(([colName, colDef]) => `${colName} ${colDef}`)
                    .join(', ');
                
                await db.query(`CREATE TABLE ${tableName} (${columnDefinitions})`);
                console.log(`Tabelle '${tableName}' erfolgreich erstellt.`);
            } else {
                console.log(`Tabelle '${tableName}' existiert.`);
                const requiredColumns = Object.keys(requiredTables[tableName].columns);
                const [dbColumns] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
                const existingColumns = dbColumns.map(col => col.Field);

                const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

                if (missingColumns.length > 0) {
                    console.error(`FEHLER: In der Tabelle '${tableName}' fehlen die folgenden Spalten: ${missingColumns.join(', ')}.`);
                    console.error('Bitte füge die Spalten manuell hinzu oder leere die Datenbank, um eine Neuerstellung zu ermöglichen.');
                    process.exit(1); 
                }
            }
        }
        console.log('Datenbank-Integritätsprüfung erfolgreich abgeschlossen.');
    } catch (error) {
        console.error('Fehler bei der Datenbank-Initialisierung:', error);
        process.exit(1);
    }
};

module.exports = initializeDatabase;