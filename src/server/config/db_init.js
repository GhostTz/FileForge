const db = require('./database');

const requiredTables = {
    users: {
        columns: {
            username: 'VARCHAR(255) NOT NULL PRIMARY KEY',
            password: 'VARCHAR(255) NOT NULL',
            rank: "VARCHAR(50) NOT NULL DEFAULT 'user'"
        }
    },
    settings: {
        columns: {
            username: 'VARCHAR(255) NOT NULL PRIMARY KEY',
            fullName: 'VARCHAR(255)',
            age: 'INT',
            pfp: 'VARCHAR(255)',
            email: 'VARCHAR(255)',
            telegramBotToken: 'VARCHAR(255)',
            telegramChannelId: 'VARCHAR(255)',
            colormode: "VARCHAR(20) DEFAULT 'dark'"
        },
        foreignKeys: [
            'FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE'
        ]
    },
    cloud_items: {
        columns: {
            id: 'INT AUTO_INCREMENT PRIMARY KEY',
            owner_username: 'VARCHAR(255) NOT NULL',
            parent_id: 'INT NULL',
            name: 'VARCHAR(255) NOT NULL',
            type: "ENUM('folder', 'file') NOT NULL",
            is_favorite: 'BOOLEAN NOT NULL DEFAULT FALSE',
            is_trashed: 'BOOLEAN NOT NULL DEFAULT FALSE',
            file_meta: 'TEXT NULL',
            created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        },
        foreignKeys: [
            'FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE CASCADE',
            'FOREIGN KEY (parent_id) REFERENCES cloud_items(id) ON DELETE CASCADE'
        ]
    },
    downloaded_media: {
        columns: {
            id: 'INT AUTO_INCREMENT PRIMARY KEY',
            username: 'VARCHAR(255) NOT NULL',
            link: 'TEXT NOT NULL',
            format: 'VARCHAR(10) NOT NULL', // mp3 oder mp4
            date: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            success: 'BOOLEAN NOT NULL',
            errorcode: 'TEXT NULL'
        },
        foreignKeys: [
            'FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE'
        ]
    }
};

const initializeDatabase = async () => {
    console.log('Überprüfe Datenbank-Integrität...');
    try {
        for (const tableName in requiredTables) {
            const table = requiredTables[tableName];
            const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);

            if (rows.length === 0) {
                console.log(`Tabelle '${tableName}' nicht gefunden. Erstelle sie...`);
                
                const columnDefinitions = Object.entries(table.columns)
                    .map(([colName, colDef]) => `\`${colName}\` ${colDef}`)
                    .join(', ');
                
                const foreignKeyDefs = table.foreignKeys ? `, ${table.foreignKeys.join(', ')}` : '';
                
                await db.query(`CREATE TABLE \`${tableName}\` (${columnDefinitions}${foreignKeyDefs})`);
                console.log(`Tabelle '${tableName}' erfolgreich erstellt.`);
            } else {
                console.log(`Tabelle '${tableName}' existiert.`);
                
                const [dbColumns] = await db.query(`SHOW COLUMNS FROM \`${tableName}\``);
                const existingColumns = dbColumns.map(col => col.Field);

                for(const colName in table.columns) {
                    if(!existingColumns.includes(colName)) {
                        console.log(`Spalte '${colName}' in Tabelle '${tableName}' fehlt. Füge sie hinzu...`);
                        await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${table.columns[colName]}`);
                        console.log(`Spalte '${colName}' erfolgreich hinzugefügt.`);
                    }
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