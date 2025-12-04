const mysql = require('mysql2');
require('dotenv').config();

// Buat kolam koneksi (Pool)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Maksimal 10 koneksi sekaligus
    queueLimit: 0
});

// Ubah jadi Promise biar bisa pake async/await (Gaya modern)
const db = pool.promise();

module.exports = db;