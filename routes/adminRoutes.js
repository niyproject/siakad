const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Middleware sederhana: Pastikan yang akses cuma ADMIN
const cekAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin/center'); // Tendang ke login admin
    }
    next();
};

// Pasang middleware di semua rute admin
router.use(cekAdmin);

// RUTE DATA SISWA
router.get('/siswa', adminController.viewSiswa);
router.get('/siswa/tambah', adminController.halamanTambahSiswa);
router.post('/siswa/tambah', adminController.prosesTambahSiswa);

// --- TAMBAHAN BARU (EDIT & HAPUS) ---
router.get('/siswa/edit/:id', adminController.halamanEditSiswa);   // Buka form edit
router.post('/siswa/edit/:id', adminController.prosesUpdateSiswa); // Simpan perubahan
router.get('/siswa/hapus/:id', adminController.hapusSiswa);        // Hapus data

// --- RUTE DATA MAPEL ---
router.get('/mapel', adminController.viewMapel);
router.post('/mapel/tambah', adminController.tambahMapel); // Langsung POST aja biar cepet (gak pake halaman form terpisah)
router.post('/mapel/edit/:id', adminController.editMapel);
router.get('/mapel/hapus/:id', adminController.hapusMapel);

// --- RUTE PLOTTING JADWAL ---
router.get('/jadwal', adminController.viewJadwal);
router.get('/jadwal/tambah', adminController.halamanTambahJadwal);
router.post('/jadwal/tambah', adminController.prosesTambahJadwal);
router.get('/jadwal/hapus/:id', adminController.hapusJadwal);

// --- RUTE DATA GURU ---
router.get('/guru', adminController.viewGuru);
router.get('/guru/tambah', adminController.halamanTambahGuru);
router.post('/guru/tambah', adminController.prosesTambahGuru);
router.get('/guru/edit/:id', adminController.halamanEditGuru);
router.post('/guru/edit/:id', adminController.prosesUpdateGuru);
router.get('/guru/hapus/:id', adminController.hapusGuru);

// --- RUTE DATA KELAS ---
router.get('/kelas', adminController.viewKelas);
router.post('/kelas/tambah', adminController.tambahKelas);
router.post('/kelas/edit/:id', adminController.editKelas);
router.get('/kelas/hapus/:id', adminController.hapusKelas);

// --- RUTE TAHUN AJARAN ---
router.get('/tahun', adminController.viewTahun);
router.post('/tahun/tambah', adminController.tambahTahun);
router.get('/tahun/aktifkan/:id', adminController.aktifkanTahun); // Ini tombol saklarnya
router.get('/tahun/hapus/:id', adminController.hapusTahun);

// --- RUTE PENGATURAN ADMIN ---
router.get('/pengaturan', adminController.viewAdmin);
router.post('/pengaturan/tambah', adminController.tambahAdmin);
router.get('/pengaturan/hapus/:id', adminController.hapusAdmin);

module.exports = router;