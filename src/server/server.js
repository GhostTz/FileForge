const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../views')));
app.use('/script', express.static(path.join(__dirname, '../script')));

const mainRoutes = require('./modules/main');
app.use('/', mainRoutes);

app.listen(port, () => {
    console.log(`Server is running on ${process.env.DOMAIN}`);
});