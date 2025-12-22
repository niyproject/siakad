const express = require('express');
const session = require('express-session');
const path = require('path');
const minifyHTML = require('express-minify-html-2');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.use((req, res, next) => {
    console.log(`[LOG TRAFIK] IP: ${req.ip} | URL: ${req.url}`);
    next();
});

// Pasang Helmet dengan konfigurasi khusus buat SIAKAD
// PASANG HELMET (Security Headers)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            // Defaultnya cuma bolehin dari domain sendiri
            "default-src": ["'self'"],
            
            // Bolehkan script lokal & inline (penting buat JS di dalam EJS lu)
            "script-src": ["'self'", "'unsafe-inline'"],
            "script-src-attr": ["'unsafe-inline'"],
            
            // Bolehkan style lokal & inline (biar CSS di 404.ejs tetep jalan)
            "style-src": ["'self'", "'unsafe-inline'"],
            
            // Bolehkan gambar lokal, base64 (buat hantu SVG), dan Google Drive
            "img-src": ["'self'", "data:", "drive.google.com", "lh3.googleusercontent.com", "images.unsplash.com", "cdn-icons-png.flaticon.com"],
            
            // Bolehkan font lokal (Poppins & FontAwesome lu)
            "font-src": ["'self'", "data:"],
            
            // Proteksi tambahan
            "object-src": ["'none'"],
            "upgrade-insecure-requests": null,
        },
    },
    // Proteksi biar web lu gak bisa di-frame orang lain (Anti-Clickjacking)
    hsts: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// const https = require('https'); // Modul HTTPS
// const fs = require('fs');       // Modul Baca File
app.use(minifyHTML({
    override: true,
    exception_url: false,
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        
        minifyJS: true,   
        minifyCSS: true   
    }
}));

// Satpam umum: Maksimal 100 request per 15 menit per IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    // Kita ganti message jadi handler
    handler: (req, res, next, options) => {
        res.status(429).render('404', {
            code: '429',
            user: req.session.user || null,
            errorTitle: "Slow Down, Bung!",
            message: "Lu terlalu bersemangat nge-klik nih. Santai dulu, tarik napas, coba lagi 15 menit lagi ya."
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});


// ==========================================
// 1. SETUP ENGINE & STATIC FILES
// ==========================================
// Set EJS sebagai template engine
app.set('view engine', 'ejs');
// Set folder tempat file HTML/EJS disimpan
app.set('views', path.join(__dirname, 'views'));

// Set folder public (untuk CSS, Gambar, JS Frontend)
// app.use(express.static(path.join(__dirname, 'public')));
// Definisi folder public dengan konfigurasi Header khusus
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: function (res, filePath) {
        // 1. Pastikan MIME Type Font dikenali
        if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
        }
        if (filePath.endsWith('.woff')) {
            res.setHeader('Content-Type', 'font/woff');
        }

        // 2. OBAT KOTAK-KOTAK DI LAN (CORS)
        // Izinkan font diakses dari IP manapun (misal 192.168.x.x)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
}));

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
    secret: process.env.SESSION_SECRET,
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

//pasang route absensi terlebih dahulu
app.use('/absensi', require('./routes/absensiRoutes'));
// Pasang ke semua rute
app.use(generalLimiter);


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
//app.use('/absensi', require('./routes/absensiRoutes'));
app.use('/layanan', require('./routes/laporanRoutes')); // Prefix /layanan
app.use('/about', require('./routes/aboutRoutes')); // Akses via /about

// ==========================================
// 5. ERROR HANDLING (404 dll)
// ==========================================

// Catch-all Middleware untuk Halaman Tidak Ditemukan (404)
app.use((req, res) => {
    res.status(404).render('404', { 
        code: '404',
        errorTitle: 'Halaman Hilang',
        message: 'Waduh Bung, sepertinya lu nyasar. Alamat yang lu tuju gak ada di peta SIAKAD kita.',
        user: req.session.user || null,
        favicon: '/img/ghost-solid.svg'
    });
});

// Middleware untuk menangani Error 500 (Internal Server Error)
app.use((err, req, res, next) => {
    console.error(err.stack); // Log error di terminal buat lu cek
    res.status(500).render('404', {
        code: '500',
        errorTitle: 'Server Lagi Puyeng',
        message: 'Ada masalah teknis di server kami, Bung. Tim IT lagi berusaha benerin, coba lagi nanti ya!',
        user: req.session.user || null
    });
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

