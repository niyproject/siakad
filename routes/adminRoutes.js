const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const ujianController = require('../controllers/ujianController'); // <--- PASTIKAN INI ADA!
const adminLaporanController = require('../controllers/adminLaporanController');


// Middleware sederhana: Pastikan yang akses cuma ADMIN
const cekAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/admin/center'); // Tendang ke login admin
    }
    next();
};

// Pasang middleware di semua rute admin
router.use(cekAdmin);

// ==========================
// DATA SISWA
// ==========================
router.get('/siswa', adminController.viewSiswa);
router.get('/siswa/tambah', adminController.halamanTambahSiswa);
router.post('/siswa/tambah', adminController.prosesTambahSiswa);
router.get('/siswa/edit/:id', adminController.halamanEditSiswa);
router.post('/siswa/edit/:id', adminController.prosesUpdateSiswa);
router.get('/siswa/hapus/:id', adminController.hapusSiswa);

// ==========================
// DATA MATA PELAJARAN (MAPEL)
// ==========================
router.get('/mapel', adminController.viewMapel);
router.post('/mapel/tambah', adminController.tambahMapel);
router.post('/mapel/edit/:id', adminController.editMapel);
router.get('/mapel/hapus/:id', adminController.hapusMapel);

// ==========================
// JADWAL MENGAJAR (PLOTTING)
// ==========================
router.get('/jadwal', adminController.viewJadwal);
router.get('/jadwal/tambah', adminController.halamanTambahJadwal);
router.post('/jadwal/tambah', adminController.prosesTambahJadwal);
router.get('/jadwal/hapus/:id', adminController.hapusJadwal);

// ==========================
// MANAJEMEN GURU
// ==========================
router.get('/guru', adminController.viewGuru);
router.get('/guru/tambah', adminController.halamanTambahGuru);
router.post('/guru/tambah', adminController.prosesTambahGuru);
router.get('/guru/edit/:id', adminController.halamanEditGuru);
router.post('/guru/edit/:id', adminController.prosesUpdateGuru);
router.get('/guru/hapus/:id', adminController.hapusGuru);

// ==========================
// DATA KELAS
// ==========================
router.get('/kelas', adminController.viewKelas);
router.post('/kelas/tambah', adminController.tambahKelas);
router.post('/kelas/edit/:id', adminController.editKelas);
router.get('/kelas/hapus/:id', adminController.hapusKelas);

// ==========================
// TAHUN AJARAN & RILIS NILAI
// ==========================
router.get('/tahun', adminController.viewTahun);
router.post('/tahun/tambah', adminController.tambahTahun);
router.get('/tahun/aktifkan/:id', adminController.aktifkanTahun);
router.get('/tahun/hapus/:id', adminController.hapusTahun);
router.get('/tahun/toggle-nilai/:id/:tipe', adminController.toggleRilisNilai);

// ========================== 
// MONITORING NILAI (BARU)
// ==========================
router.get('/monitoring-nilai', adminController.monitoringNilai);
router.get('/monitoring-nilai/detail/:id_mengajar', adminController.detailNilaiKelas);

// ==========================
// VALIDASI UJIAN (BARU)
// ==========================
router.get('/ujian/approval', ujianController.halamanApproval);
router.get('/ujian/detail-api/:id', ujianController.getDetailTugas);
router.post('/ujian/set-online', ujianController.approveOnline); // POST
router.post('/ujian/revisi', ujianController.mintaRevisi);       // POST
router.get('/ujian/download-offline/:id', ujianController.approveOffline);

// ==========================
// PENGATURAN ADMIN
// ==========================
router.get('/pengaturan', adminController.viewAdmin);
router.post('/pengaturan/tambah', adminController.tambahAdmin);
router.get('/pengaturan/hapus/:id', adminController.hapusAdmin);


// RUTE LAPORAN (ADMIN)
router.get('/laporan', adminLaporanController.inbox);
router.post('/laporan/balas', adminLaporanController.balasPesan);

module.exports = router;
