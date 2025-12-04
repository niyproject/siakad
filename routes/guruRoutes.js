const express = require('express');
const router = express.Router();
const guruController = require('../controllers/guruController');
const upload = require('../config/storage'); // Import Multer

// Middleware: Cek Login Guru
const cekGuru = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'guru') {
        return res.redirect('/login');
    }
    next();
};

router.use(cekGuru);

// --- MENU UTAMA (SIDEBAR) ---
router.get('/menu-nilai', guruController.halamanMenuNilai); // Ke halaman pilih kelas buat nilai
router.get('/menu-tugas', guruController.halamanMenuTugas); // Ke halaman pilih kelas buat tugas
router.get('/jadwal', guruController.lihatJadwalFull);      // Ke halaman roster

// --- INPUT NILAI RAPOR ---
router.get('/nilai/:id_mengajar', guruController.halamanInputNilai);
router.post('/nilai/:id_mengajar', guruController.prosesSimpanNilai);

// --- KELOLA TUGAS (LMS) ---
router.get('/tugas/:id_mengajar', guruController.halamanTugas);
router.post('/tugas/:id_mengajar', upload.single('file_tugas'), guruController.prosesBuatTugas);

// --- PENILAIAN TUGAS SISWA ---
router.get('/tugas/lihat/:id_tugas', guruController.halamanPengumpulan);
router.post('/tugas/nilai/:id_pengumpulan', guruController.prosesNilaiTugas);

// === EDIT & HAPUS TUGAS ===
router.get('/tugas/hapus/:id_tugas', guruController.hapusTugas);
router.get('/tugas/edit/:id_tugas', guruController.halamanEditTugas);
router.post('/tugas/edit/:id_tugas', upload.single('file_tugas'), guruController.prosesEditTugas);

module.exports = router;