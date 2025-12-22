const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit'); // <--- Import Library Satpam

// ==========================================
// KONFIGURASI SECURITY GUARD (RATE LIMITER)
// ==========================================
// const loginLimiter = rateLimit({
//     windowMs: 60 * 60 * 1000, 
//     max: 5, 
//     // Kita ganti 'message' jadi 'handler' biar lebih fleksibel
//     handler: (req, res, next, options) => {
//         res.status(429).render('404', { 
//             user: req.session.user || null,
//             // Kirim pesan khusus buat korban rate limit
//             code: '429',
//             errorTitle: "Akses Dibekukan!",
//             message: "Terlalu banyak percobaan login, IP lu dibekukan sementara selama 1 jam demi keamanan." 
//         }); 
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
// });

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 5, 
    // PAKSA Satpam buat liat IP masing-masing secara eksplisit
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },
    handler: (req, res) => {
        // LOG ini bakal kasih tau siapa yang sebenernya kena tendang
        console.log(`!!! BLOKIR LOGIN: Perangkat dengan IP ${req.ip} mencoba akses ${req.originalUrl}`);
        
        res.status(429).render('404', { 
            code: '429',
            errorTitle: "Akses Dibekukan!",
            message: "Terlalu banyak percobaan login pada IP ini." 
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ==========================================
// RUTE AUTHENTICATION
// ==========================================

// Halaman Utama = Welcome Page
router.get('/', authController.halamanWelcome);

// Halaman Login Publik (Guru/Siswa)
router.get('/login', authController.halamanLogin);

// Halaman Login Admin (URL Khusus/Pintu Rahasia)
// Kita pasang limiter di sini biar gak dispam request
router.get('/admin/center', authController.halamanLoginAdmin);

// Proses Login (Tetap satu pintu untuk semua role)
// Ini rute paling krusial, wajib dipasang satpam galak (loginLimiter)
router.post('/auth/login', loginLimiter, authController.prosesLogin);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
