const db = require('../config/database');
const fs = require('fs');     // Buat hapus file
const path = require('path'); // Buat atur path file
const bcrypt = require('bcryptjs'); // Buat hash password baru

// 1. UPDATE FOTO PROFIL (Dengan Fitur Hapus Foto Lama)
exports.updateFoto = async (req, res) => {
    // Cek ada file gak?
    if (!req.file) {
        return res.send('<script>alert("Pilih file dulu bung!"); window.history.back();</script>');
    }

    const userId = req.session.user.id;
    const role = req.session.user.role;
    const namaFileBaru = req.file.filename;

    try {
        let tableName = '';
        if (role === 'siswa') tableName = 'siswa';
        else if (role === 'guru') tableName = 'guru';
        else if (role === 'admin') tableName = 'admin';

        // A. Cari nama foto lama di database
        const [rows] = await db.query(`SELECT foto_profil FROM ${tableName} WHERE user_id = ?`, [userId]);
        const fotoLama = rows[0].foto_profil;

        // B. Hapus Foto Lama (Kecuali file default)
        const fileDefault = ['default.png', 'default-male.png', 'default-female.png'];

        if (fotoLama && !fileDefault.includes(fotoLama)) {
            const pathFotoLama = path.join(__dirname, '../public/uploads/profil/', fotoLama);
            
            // Cek fisik file, kalau ada hapus
            if (fs.existsSync(pathFotoLama)) {
                fs.unlinkSync(pathFotoLama);
            }
        }

        // C. Update Database dengan nama file baru
        await db.query(`UPDATE ${tableName} SET foto_profil = ? WHERE user_id = ?`, [namaFileBaru, userId]);

        // Balik ke Dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error(error);
        res.send('Gagal upload foto database.');
    }
};

// 2. HALAMAN GANTI PASSWORD
exports.halamanGantiPassword = (req, res) => {
    // Kita kirim data user session sebagai 'profil' sementara
    // Supaya navbar component gak error (karena butuh variabel 'user')
    res.render('profil/ganti_password', {
        user: req.session.user, 
        profil: req.session.user, // Dummy profil buat navbar
        title: 'Ganti Password',
        error: null,
        success: null
    });
};

// 3. PROSES GANTI PASSWORD (VERSI ULTRA SECURE)
exports.prosesGantiPassword = async (req, res) => {
    // Ambil inputan, tapi kasih default string kosong biar gak error 'undefined'
    const { pass_lama, pass_baru, pass_konfirmasi } = req.body;
    const userId = req.session.user.id;

    // Helper buat render error biar gak ngetik ulang-ulang
    const renderError = (msg) => {
        return res.render('profil/ganti_password', {
            user: req.session.user, profil: req.session.user, title: 'Ganti Password',
            error: msg, success: null
        });
    };

    try {
        // --- VALIDASI LEVEL 1: CEK KEKOSONGAN (Backend Validation) ---
        // Ini melindungi server kalau input HTML 'required' dijebol lewat Inspect Element
        if (!pass_lama || !pass_baru || !pass_konfirmasi) {
            return renderError('Semua kolom wajib diisi! Jangan dikosongin ya Bung.');
        }

        // --- VALIDASI LEVEL 2: INPUT SANITIZATION ---
        // Pastikan password baru bukan spasi doang ("   ")
        if (pass_baru.trim() === "") {
            return renderError('Password tidak boleh hanya spasi!');
        }

        // --- VALIDASI LEVEL 3: LOGIC PASSWORD ---
        
        // Cek Panjang
        if (pass_baru.length < 6) {
            return renderError('Password terlalu pendek! Minimal 6 karakter.');
        }

        // Cek Match Konfirmasi
        if (pass_baru !== pass_konfirmasi) {
            return renderError('Konfirmasi Password Baru tidak cocok!');
        }

        // Cek Kesamaan (Best Practice: Password baru gak boleh sama kayak yg lama)
        if (pass_lama === pass_baru) {
            return renderError('Password baru harus beda dong sama yang lama!');
        }

        // --- VALIDASI LEVEL 4: VERIFIKASI DATABASE ---
        
        // Ambil user dari DB
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        const currentUser = users[0];

        // Bandingkan Hash Password Lama
        const isMatch = await bcrypt.compare(pass_lama, currentUser.password);
        if (!isMatch) {
            return renderError('Password Lama Salah! Coba ingat-ingat lagi.');
        }

        // --- EKSEKUSI FINAL ---
        
        // Hash Password Baru
        const hashedNewPass = await bcrypt.hash(pass_baru, 10);
        
        // Simpan ke Database
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPass, userId]);

        // Matikan notifikasi merah di session
        req.session.user.isDefaultPass = false;

        // Sukses!
        res.render('profil/ganti_password', {
            user: req.session.user, profil: req.session.user, title: 'Ganti Password',
            error: null, success: 'Mantap! Password berhasil diamankan.'
        });

    } catch (error) {
        console.error(error);
        res.send('Terjadi kesalahan fatal saat ganti password.');
    }
};