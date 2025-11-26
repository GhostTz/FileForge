require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDb() {
    try {
        console.log('Connecting to DB...');
        const connection = await mysql.createConnection({
            host: process.env.host,
            user: process.env.user,
            password: process.env.password,
            database: process.env.name
        });
        console.log('Connected.');

        console.log('Checking users table columns...');
        const [rows] = await connection.query('SHOW COLUMNS FROM users');
        console.log('Columns:', rows.map(r => r.Field));

        const hasCloudPassword = rows.some(r => r.Field === 'cloud_password');
        const hasPasswordType = rows.some(r => r.Field === 'password_type');

        console.log('Has cloud_password:', hasCloudPassword);
        console.log('Has password_type:', hasPasswordType);

        await connection.end();
    } catch (error) {
        console.error('DB Error:', error);
    }
}

checkDb();
