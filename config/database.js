const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

// KITA UBAH DARI 'createConnection' JADI 'createPool'
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    
    // --- Settingan Turbo Biar Ngebut ---
    waitForConnections: true, // Kalau penuh, tungguin bentar (jangan error)
    connectionLimit: 10,      // Maksimal 10 koneksi sekaligus (sesuai kekuatan HP)
    queueLimit: 0,            // Antrian tak terbatas
    enableKeepAlive: true,    // Jaga koneksi biar gak putus nyambung
    keepAliveInitialDelay: 0
});

// Cek koneksi pas pertama kali jalan (Opsional, buat mastiin aja)
db.getConnection()
    .then(conn => {
        console.log(`✅ Database terhubung! (Pool Mode: Aktif)`);
        conn.release(); // Balikin koneksi ke kolam
    })
    .catch(err => {
        console.error('❌ Gagal konek database:', err.message);
    });

module.exports = db;