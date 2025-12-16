const express = require('express');
const router = express.Router();
const guruController = require('../controllers/guruController');
const multer = require('multer');
const path = require('path');

// ==========================================
// 1. CONFIG MULTER (UPLOAD FILE)
// ==========================================

// A. Config Upload TUGAS
const storageTugas = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/tugas/');
    },
    filename: function (req, file, cb) {
        cb(null, 'TUGAS-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadTugas = multer({ storage: storageTugas });

// B. Config Upload MATERI (Khusus PDF)
const storageMateri = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/materi/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'MATERI-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const fileFilterPDF = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Hanya file PDF yang diperbolehkan!'), false);
    }
};
const uploadMateri = multer({ 
    storage: storageMateri,
    fileFilter: fileFilterPDF,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

// C. Config Upload FOTO PROFIL (🔥 WAJIB DITAMBAH BIAR KAMERA JALAN 🔥)
const storageProfil = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/profil/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, 'GURU-' + uniqueSuffix); 
    }
});
const uploadProfil = multer({ 
    storage: storageProfil,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Hanya gambar!'), false);
    },
    limits: { fileSize: 2 * 1024 * 1024 } 
});


// ==========================================
// 2. MIDDLEWARE CEK LOGIN
// ==========================================
const cekGuru = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'guru') {
        return res.redirect('/login');
    }
    next();
};

router.use(cekGuru);


// ==========================================
// 3. DAFTAR RUTE (ROUTES)
// ==========================================

// --- DASHBOARD & PROFIL ---
router.get('/dashboard', guruController.dashboard);

// Rute ini tetap kita biarkan ada (sesuai request lu), 
// tapi nanti di controller kita bikin dia redirect ke dashboard biar gak error.
router.get('/profil', guruController.profil); 

// Rute POST Profil (Update Foto) - Pake middleware uploadProfil
router.post('/profil', uploadProfil.single('foto_profil'), guruController.updateProfil);

// --- JADWAL MENGAJAR ---
router.get('/jadwal', guruController.lihatJadwalFull);

// --- ABSENSI ---
router.get('/absen/:id_mengajar', guruController.halamanAbsen);
router.post('/absen/:id_mengajar', guruController.prosesAbsen);
router.get('/absen/buka/:id_mengajar', guruController.bukaAbsen);
router.get('/absen/tutup/:id_mengajar', guruController.tutupAbsen);

// --- MANAJEMEN NILAI RAPOR ---
router.get('/menu-nilai', guruController.halamanMenuNilai);
router.get('/nilai/:id_mengajar', guruController.halamanInputNilai);
router.post('/nilai/:id_mengajar', guruController.prosesSimpanNilai);

// --- MANAJEMEN TUGAS & UJIAN ---
router.get('/menu-tugas', guruController.halamanMenuTugas);
router.get('/tugas/:id_mengajar', guruController.halamanTugas);
router.post('/tugas/:id_mengajar', uploadTugas.single('file_tugas'), guruController.prosesBuatTugas);
 
router.get('/tugas/lihat/:id', guruController.lihatDetailTugas);
router.get('/tugas/hapus/:id', guruController.hapusTugas);
router.get('/tugas/edit/:id_tugas', guruController.halamanEditTugas);
router.post('/tugas/edit/:id_tugas', uploadTugas.single('file_tugas'), guruController.prosesEditTugas);

router.get('/tugas/nilai/:id_tugas', guruController.halamanPenilaian);
router.post('/tugas/nilai', guruController.simpanNilai);

// --- MATERI & E-BOOK ---
router.get('/materi-saya', guruController.listKelasMateri);
router.get('/materi/:id_mengajar', guruController.halamanMateri);
router.post('/materi/:id_mengajar', uploadMateri.single('file_materi'), guruController.prosesUploadMateri);
router.get('/materi/hapus/:id/:id_mengajar', guruController.hapusMateri);

module.exports = router;