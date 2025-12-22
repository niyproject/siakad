const express = require('express');
const router = express.Router();
const siswaController = require('../controllers/siswaController');
const path = require('path');
const multer = require('multer');

// ==========================================
// 1. CONFIG UPLOAD (MULTER)
// ==========================================

// A. Config Upload TUGAS (Ambil dari config lama lu)
// Kita rename jadi 'uploadTugas' biar jelas
const uploadTugas = require('../config/storage'); 

// B. Config Upload FOTO PROFIL (BARU)
const storageProfil = multer.diskStorage({
    destination: function (req, file, cb) {
        // Pastikan folder ini sudah dibuat: public/uploads/profil/
        cb(null, 'public/uploads/profil/');
    },
    filename: function (req, file, cb) {
        // Nama file: PROFIL-timestamp.jpg
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, 'PROFIL-' + uniqueSuffix);
    }
});

const filterFoto = (req, file, cb) => {
    // Validasi: Cuma boleh file gambar (jpg, png, jpeg, gif)
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Hanya boleh upload file gambar!'), false);
    }
};

const uploadProfil = multer({ 
    storage: storageProfil, 
    fileFilter: filterFoto,
    limits: { fileSize: 2 * 1024 * 1024 } // Maksimal 2MB
});


// ==========================================
// 2. MIDDLEWARE CEK SISWA
// ==========================================
const cekSiswa = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'siswa') {
//        return res.redirect('/login');
         return  res.status(404).render('404');
    }
    next();
};

router.use(cekSiswa);


// ==========================================
// 3. DAFTAR RUTE (ROUTES)
// ==========================================

// --- DASHBOARD & JADWAL ---
router.get('/jadwal', siswaController.lihatJadwal);

// --- PROFIL & AKUN (FITUR BARU) ---
router.post('/profil', uploadProfil.single('foto_profil'), siswaController.updateProfil);

// --- TUGAS & KUIS ---
router.get('/tugas', siswaController.lihatTugas);
// Upload Tugas pakai config lama (uploadTugas)
router.post('/tugas/kumpul/:id_tugas', uploadTugas.single('file_tugas'), siswaController.kumpulTugas);

// Mengerjakan Kuis (Tanpa upload file)
router.get('/tugas/kerjakan/:id_tugas', siswaController.halamanKerjakan);
router.post('/tugas/kerjakan/:id_tugas', siswaController.prosesKerjakan);

// --- MATERI / E-BOOK ---
router.get('/materi', siswaController.menuMateri);              // 1. Pilih Mapel
router.get('/materi/mapel/:id_mapel', siswaController.lihatMateriMapel); // 2. Lihat List PDF
router.get('/materi/baca/:id', siswaController.bacaMateri);     // 3. Baca PDF (Embed)


module.exports = router;
