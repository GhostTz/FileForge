const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const db = require('./src/server/config/database');
const jwt = require('jsonwebtoken');

async function testStatusEndpoint() {
    console.log('Starting test...');

    // 1. Simulate Auth Middleware
    const mockUser = { username: 'admin' }; // Assuming 'admin' exists
    console.log('Mock user:', mockUser);

    try {
        // 2. Simulate Endpoint Logic
        console.log('Executing query...');
        const [users] = await db.query('SELECT password_type FROM users WHERE username = ?', [mockUser.username]);
        console.log('Query result:', users);

        if (users.length > 0 && users[0].password_type) {
            console.log('Result: isSet=true, type=' + users[0].password_type);
        } else {
            console.log('Result: isSet=false');
        }

    } catch (error) {
        console.error('CRASH/ERROR in endpoint logic:', error);
    } finally {
        await db.end();
    }
}

testStatusEndpoint();
