const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');

// Middleware Cek Login
const cekLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};
router.use(cekLogin);

// --- GURU ---
router.get('/guru/dashboard/:id_mengajar', absensiController.halamanAbsenGuru);
// API untuk AJAX (Guru)
router.get('/api/generate-qr/:id_mengajar', absensiController.apiGenerateQR);
router.get('/api/cek-scan/:id_mengajar', absensiController.apiCekScanTerbaru);

// --- SISWA ---
router.get('/siswa/scan', absensiController.halamanScanSiswa);
router.post('/siswa/proses-scan', absensiController.prosesScan);

module.exports = router;