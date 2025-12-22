const db = require('../config/database');
const bcrypt = require('bcryptjs');

// 1. Halaman Welcome (Landing Page)
exports.halamanWelcome = (req, res) => {
    res.render('welcome');
};

// 2. Halaman Login Publik (Guru & Siswa)
exports.halamanLogin = (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    // Default tab yang aktif adalah siswa
    res.render('login', { error: null, tab: 'siswa' });
};

// 3. Halaman Login Admin (URL Rahasia)
exports.halamanLoginAdmin = (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login-admin', { error: null });
};

// 4. PROSES LOGIN (Satu Pintu untuk Semua)
exports.prosesLogin = async (req, res) => {
    const { username, password, target_role } = req.body;

    try {
        // A. Cari user berdasarkan username & role yang dipilih
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ? AND role = ?', 
            [username, target_role]
        );

        // Kalau user gak ketemu
        if (users.length === 0) {
            // Cek apakah ini login admin atau publik buat nentuin render view-nya
            if (target_role === 'admin') {
                return res.render('login-admin', { error: 'Username tidak ditemukan!' });
            } else {
                return res.render('login', { error: 'Username tidak ditemukan pada peran ini!', tab: target_role });
            }
        }

        const user = users[0];

        // B. Cek Password (Bandingkan inputan vs Hash di DB)
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            if (target_role === 'admin') {
                return res.render('login-admin', { error: 'Password salah!' });
            } else {
                return res.render('login', { error: 'Password salah!', tab: target_role });
            }
        }

        // --- C. LOGIC DETEKSI PASSWORD BAWAAN (TANGGAL LAHIR) ---
        let isDefaultPass = false;

        // Cuma cek buat Guru & Siswa (Admin passwordnya custom)
        if (target_role === 'siswa' || target_role === 'guru') {
            const tableName = target_role === 'siswa' ? 'siswa' : 'guru';
            // Ambil tanggal lahir dari tabel profil
            const [profil] = await db.query(`SELECT tanggal_lahir FROM ${tableName} WHERE user_id = ?`, [user.id]);
            
            if (profil.length > 0) {
                // Ubah tanggal lahir database jadi format YYYYMMDD
                const tgl = new Date(profil[0].tanggal_lahir);
                const yyyy = tgl.getFullYear();
                const mm = String(tgl.getMonth() + 1).padStart(2, '0');
                const dd = String(tgl.getDate()).padStart(2, '0');
                const defaultPassStr = `${yyyy}${mm}${dd}`;

                // Cek: Apakah password yg diinput SAMA PERSIS dengan tanggal lahir?
                // Catatan: Ini perbandingan string mentah. 
                // Karena user baru login pake password mentah, kita bandingkan inputannya.
                if (password === defaultPassStr) {
                    isDefaultPass = true;
                }
            }
        }
        // --------------------------------------------------------

        // D. Simpan data penting ke Session
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            is_super_admin: user.is_super_admin, // Buat proteksi hapus admin
            isDefaultPass: isDefaultPass         // Buat notifikasi ganti password
        };

        // Redirect ke dashboard
        console.log(`✅ Login Berhasil: ${user.username} sebagai ${user.role}`);
        res.redirect('/dashboard');

    } catch (error) {
        console.error(error);
        console.log("Ada yang mau login nih! IP-nya: ", req.ip);
        // Ini bakal otomatis lari ke middleware Error 500 yang ada di app.js
        next(error); 
        
    }
};

// 5. Logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};