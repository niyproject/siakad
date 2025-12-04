const express = require('express');
const router = express.Router();
const profilController = require('../controllers/profilController');
const upload = require('../config/storage'); // Config multer tadi

// Middleware Cek Login
const cekLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

router.use(cekLogin);

// Rute Upload: Pake middleware 'upload.single'
// 'foto' adalah nama field di form HTML nanti
router.post('/upload', upload.single('foto'), profilController.updateFoto);

router.get('/ganti-password', profilController.halamanGantiPassword);
router.post('/ganti-password', profilController.prosesGantiPassword); // Gak perlu multer (upload)

module.exports = router;