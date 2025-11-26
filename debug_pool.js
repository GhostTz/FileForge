const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const db = require('./src/server/config/database');

async function testPool() {
    console.log('Testing DB Pool...');
    try {
        const [rows] = await db.query('SELECT 1 as val');
        console.log('Query success:', rows);
        process.exit(0);
    } catch (error) {
        console.error('Pool Error:', error);
        process.exit(1);
    }
}

testPool();
