const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

// --- ZONA PUBLIK (Bisa Diakses Tanpa Login) ---
// Taruh DI ATAS middleware cekLogin
router.get('/public-kontak', laporanController.halamanKontakPublik);
router.post('/public-kirim', laporanController.kirimLaporanPublik);


// --- BATAS SUCI (Middleware Cek Login) ---
const cekLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};
router.use(cekLogin);

// --- ZONA MEMBER (Harus Login) ---
router.get('/kontak', laporanController.halamanKontak);
router.post('/kirim', laporanController.kirimLaporan);

module.exports = router;
