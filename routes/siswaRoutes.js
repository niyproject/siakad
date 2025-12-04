const express = require('express');
const router = express.Router();
const siswaController = require('../controllers/siswaController');
const upload = require('../config/storage'); // <--- PENTING: Import Multer

// Middleware Cek Siswa
const cekSiswa = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'siswa') return res.redirect('/login');
    next();
};

router.use(cekSiswa);

// Rute Jadwal
router.get('/jadwal', siswaController.lihatJadwal);

// === RUTE TUGAS ===
router.get('/tugas', siswaController.lihatTugas);

router.post('/tugas/kumpul/:id_tugas', upload.single('file_tugas'), siswaController.kumpulTugas);

// RUTE BARU: MENGERJAKAN KUIS
router.get('/tugas/kerjakan/:id_tugas', siswaController.halamanKerjakan);
router.post('/tugas/kerjakan/:id_tugas', siswaController.prosesKerjakan); // Gak pake upload karena isinya teks

module.exports = router;
