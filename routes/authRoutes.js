const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Halaman Utama = Welcome Page
router.get('/', authController.halamanWelcome);

// Halaman Login Publik (Guru/Siswa)
router.get('/login', authController.halamanLogin);

// --- UPDATE BAGIAN INI ---
// Rute Login Admin (URL Khusus pilihan lu)
router.get('/admin/center', authController.halamanLoginAdmin); 
// -------------------------

// Proses Login (Tetap satu pintu untuk semua)
router.post('/auth/login', authController.prosesLogin);

// Logout
router.get('/logout', authController.logout);

module.exports = router;