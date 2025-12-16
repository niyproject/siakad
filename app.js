const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// const https = require('https'); // Modul HTTPS
// const fs = require('fs');       // Modul Baca File

// ==========================================
// 1. SETUP ENGINE & STATIC FILES
// ==========================================
// Set EJS sebagai template engine
app.set('view engine', 'ejs');
// Set folder tempat file HTML/EJS disimpan
app.set('views', path.join(__dirname, 'views'));
// Set folder public (untuk CSS, Gambar, JS Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. MIDDLEWARE (PENGOLAH DATA)
// ==========================================
// Supaya bisa baca input dari Form HTML (POST request)
app.use(express.urlencoded({ extended: true }));
// Supaya bisa baca format JSON
app.use(express.json());

// ==========================================
// 3. SETUP SESSION (SISTEM LOGIN)
// ==========================================
app.use(session({
    secret: 'rahasia_dapur_siakad_termux_2025', // Ganti string ini bebas biar aman
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 // Session expired dalam 1 hari (24 jam)
    }
}));

// Middleware Global: Biar data user bisa diakses di semua file EJS
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ==========================================
// 4. DAFTAR RUTE (ROUTES)
// ==========================================
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <--- Rute Admin Baru
const guruRoutes = require('./routes/guruRoutes'); // <--- Tambah
const profilRoutes = require('./routes/profilRoutes'); // <--- Tambah

// Pasang Rutenya
app.use('/', authRoutes);               // Handle: Welcome, Login, Logout
app.use('/dashboard', dashboardRoutes); // Handle: Dashboard User
app.use('/admin', adminRoutes);         // Handle: Fitur Admin (Data Siswa, Guru, dll)
app.use('/guru', guruRoutes); // <--- Tambah (Prefix /guru)
app.use('/profil', profilRoutes); // <--- Tambah (Prefix /profil)
app.use('/siswa', require('./routes/siswaRoutes'));
app.use('/absensi', require('./routes/absensiRoutes'));
app.use('/layanan', require('./routes/laporanRoutes')); // Prefix /layanan
app.use('/about', require('./routes/aboutRoutes')); // Akses via /about

// ==========================================
// 5. ERROR HANDLING (404)
// ==========================================
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align:center; padding:50px;">
            <h1>404 - Nyasar Bung? 😅</h1>
            <p>Halaman yang lu cari gak ada.</p>
            <a href="/">Balik ke Jalan yang Benar</a>
        </div>
    `);
});

// ==========================================
// 6. JALANKAN SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 Server SIAKAD Siap Tempur!`);
    console.log(`📡 Akses Web: http://localhost:${PORT}`);
    console.log(`🔐 Login Admin: http://localhost:${PORT}/admin/center`);
    console.log(`=============================================`);
});

// --- SERVER HTTPS (Updated) ---

// // Baca sertifikat yang tadi kita bikin
// const sslOptions = {
//     key: fs.readFileSync('server.key'),
//     cert: fs.readFileSync('server.cert')
// };

// // Jalankan Server dengan HTTPS
// const PORT = process.env.PORT || 3000;
// https.createServer(sslOptions, app).listen(PORT, () => {
//     console.log(`=============================================`);
//     console.log(`🔒 Server HTTPS Aktif (Mode Aman)`);
//     console.log(`📡 Akses Lokal: https://localhost:${PORT}`);
//     console.log(`📱 Akses HP Lain: https://[IP_HP_LU]:${PORT}`);
//     console.log(`=============================================`);
// });

