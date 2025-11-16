const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const initializeDatabase = require('./config/db_init');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../views')));
app.use('/style', express.static(path.join(__dirname, '../views/style')));
app.use('/script', express.static(path.join(__dirname, '../script')));
app.use('/app/public', express.static(path.join(__dirname, '../app/public')));
app.use('/app/public/js', express.static(path.join(__dirname, '../app/public/js')));


const mainRoutes = require('./modules/main');
const authRoutes = require('./modules/auth');
const appRoutes = require('../app/routes/app');
const userRoutes = require('./modules/user');
const cloudRoutes = require('./modules/cloud'); // <-- NEU

app.use('/', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/app', appRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/cloud', authMiddleware, cloudRoutes); // <-- NEU

const startServer = async () => {
    try {
        await initializeDatabase();
        app.listen(port, () => {
            console.log(`Server is running on ${process.env.DOMAIN}:${port}`);
        });
    } catch (error) {
        console.error("Server konnte nicht gestartet werden:", error);
    }
};

startServer();