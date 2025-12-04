const db = require('../config/database');
const bcrypt = require('bcryptjs'); // <--- WAJIB DITAMBAH!

// --- FITUR SISWA ---

// 1. Tampilkan Daftar Siswa
exports.viewSiswa = async (req, res) => {
    try {
        // Kita perlu data siswa + nama kelasnya (pake JOIN)
        const sql = `
            SELECT siswa.*, kelas.nama_kelas 
            FROM siswa 
            JOIN kelas ON siswa.kelas_id = kelas.id 
            ORDER BY kelas.nama_kelas ASC, siswa.nama_lengkap ASC
        `;
        const [rows] = await db.query(sql);

        res.render('admin/siswa/index', { 
            siswaList: rows,
            user: req.session.user, 
            title: 'Data Siswa'
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error mengambil data siswa');
    }
};

// 2. Tampilkan Form Tambah Siswa
exports.halamanTambahSiswa = async (req, res) => {
    try {
        // Ambil daftar kelas buat dropdown
        const [kelas] = await db.query('SELECT * FROM kelas ORDER BY tingkat ASC, nama_kelas ASC');
        
        res.render('admin/siswa/tambah', { 
            kelasList: kelas, // Kirim data kelas ke HTML
            user: req.session.user 
        });
    } catch (error) {
        res.status(500).send('Error mengambil data kelas');
    }
};

// 3. Proses Simpan Siswa Baru
exports.prosesTambahSiswa = async (req, res) => {
    const { nis, nama_lengkap, kelas_id, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat } = req.body;

    try {
        // A. Bikin Password Default (Format: YYYYMMDD dari tanggal lahir)
        // Contoh: 2009-05-20 jadi 20090520
        const rawPassword = tanggal_lahir.replace(/-/g, '');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // B. Insert ke tabel USERS dulu
        const [userResult] = await db.query(
            `INSERT INTO users (username, password, role) VALUES (?, ?, 'siswa')`,
            [nis, hashedPassword]
        );
        
        const newUserId = userResult.insertId; // Ambil ID user yang barusan dibuat

        // C. Insert ke tabel SISWA pake ID user tadi
        await db.query(
            `INSERT INTO siswa (user_id, kelas_id, nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [newUserId, kelas_id, nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat]
        );

        // Sukses? Balik ke daftar siswa
        res.redirect('/admin/siswa');

    } catch (error) {
        console.error(error);
        // Kalau error (misal NIS kembar), balikin ke form lagi (Idealnya pake flash message, tapi ini console dulu)
        res.send(`<h1>Gagal Menyimpan!</h1><p>Error: ${error.message}</p><a href="/admin/siswa/tambah">Coba Lagi</a>`);
    }
};

// ... kode import di atas ...

// 4. Tampilkan Form Edit (DENGAN PERBAIKAN TANGGAL)
exports.halamanEditSiswa = async (req, res) => {
    const { id } = req.params;
    try {
        // PERBAIKAN 1: Pake DATE_FORMAT biar tanggal gak mundur sehari karena Timezone
        const sql = `
            SELECT 
                id, user_id, nis, nama_lengkap, kelas_id, tempat_lahir, jenis_kelamin, alamat,
                DATE_FORMAT(tanggal_lahir, '%Y-%m-%d') as tgl_lahir_iso 
            FROM siswa 
            WHERE id = ?
        `;
        
        const [siswaRows] = await db.query(sql, [id]);
        
        // Ambil daftar kelas
        const [kelasRows] = await db.query('SELECT * FROM kelas ORDER BY tingkat ASC, nama_kelas ASC');

        if (siswaRows.length === 0) {
            return res.redirect('/admin/siswa');
        }

        res.render('admin/siswa/edit', {
            siswa: siswaRows[0],
            kelasList: kelasRows,
            user: req.session.user
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error mengambil data edit');
    }
};

// 5. Proses Update Siswa (DENGAN PERBAIKAN PASSWORD)
exports.prosesUpdateSiswa = async (req, res) => {
    const { id } = req.params;
    const { nis, nama_lengkap, kelas_id, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat } = req.body;

    try {
        // 1. Update data Profil Siswa
        await db.query(
            `UPDATE siswa SET 
                nis = ?, 
                nama_lengkap = ?, 
                kelas_id = ?, 
                tempat_lahir = ?, 
                tanggal_lahir = ?, 
                jenis_kelamin = ?, 
                alamat = ? 
             WHERE id = ?`,
            [nis, nama_lengkap, kelas_id, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, id]
        );

        // 2. PERBAIKAN PASSWORD: Update Username & Password di tabel USERS
        
        // Cari user_id dulu
        const [siswa] = await db.query('SELECT user_id FROM siswa WHERE id = ?', [id]);
        
        if (siswa.length > 0) {
            const userId = siswa[0].user_id;

            // Generate Hash Password Baru dari Tanggal Lahir Baru
            // Format: YYYYMMDD (Hapus tanda strip -)
            const rawPassword = tanggal_lahir.replace(/-/g, '');
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            // Update Username (NIS) DAN Password
            await db.query(
                'UPDATE users SET username = ?, password = ? WHERE id = ?', 
                [nis, hashedPassword, userId]
            );
        }

        res.redirect('/admin/siswa');

    } catch (error) {
        console.error(error);
        res.send('Gagal update data.');
    }
};

// 6. Proses Hapus Siswa
exports.hapusSiswa = async (req, res) => {
    const { id } = req.params;

    try {
        // Kita cukup hapus user-nya saja.
        // Karena relasi database pakai ON DELETE CASCADE, data di tabel siswa otomatis ikut hilang.
        
        // 1. Cari user_id dulu
        const [rows] = await db.query('SELECT user_id FROM siswa WHERE id = ?', [id]);
        
        if (rows.length > 0) {
            // 2. Hapus dari tabel Users
            await db.query('DELETE FROM users WHERE id = ?', [rows[0].user_id]);
        }

        res.redirect('/admin/siswa');

    } catch (error) {
        console.error(error);
        res.send('Gagal menghapus data.');
    }
};

// ==========================
// FITUR MATA PELAJARAN (MAPEL)
// ==========================

// 1. Lihat Daftar Mapel
exports.viewMapel = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM mapel ORDER BY nama_mapel ASC');
        res.render('admin/mapel/index', { 
            mapelList: rows, 
            user: req.session.user,
            title: 'Data Mata Pelajaran'
        });
    } catch (error) {
        res.status(500).send('Error ambil data mapel');
    }
};

// 2. Proses Tambah Mapel
exports.tambahMapel = async (req, res) => {
    const { kode_mapel, nama_mapel } = req.body;
    try {
        await db.query('INSERT INTO mapel (kode_mapel, nama_mapel) VALUES (?, ?)', [kode_mapel, nama_mapel]);
        res.redirect('/admin/mapel');
    } catch (error) {
        res.send('Gagal tambah mapel (Mungkin Kode Mapel kembar?)');
    }
};

// 3. Proses Edit Mapel
exports.editMapel = async (req, res) => {
    const { id } = req.params;
    const { kode_mapel, nama_mapel } = req.body;
    try {
        await db.query('UPDATE mapel SET kode_mapel = ?, nama_mapel = ? WHERE id = ?', [kode_mapel, nama_mapel, id]);
        res.redirect('/admin/mapel');
    } catch (error) {
        res.send('Gagal update mapel');
    }
};

// 4. Proses Hapus Mapel
exports.hapusMapel = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM mapel WHERE id = ?', [id]);
        res.redirect('/admin/mapel');
    } catch (error) {
        res.send('Gagal hapus mapel. (Mungkin mapel ini sudah dipakai di jadwal guru?)');
    }
};

// ==========================
// FITUR JADWAL MENGAJAR (PLOTTING)
// ==========================

// 1. Lihat Daftar Jadwal
exports.viewJadwal = async (req, res) => {
    try {
        // Query SAKTI: Join 4 Tabel sekaligus!
        const sql = `
            SELECT 
                mengajar.id, 
                guru.nama_lengkap, 
                mapel.nama_mapel, 
                kelas.nama_kelas, 
                tahun_ajaran.tahun, 
                tahun_ajaran.semester,
                mengajar.hari,         
                mengajar.jam_mulai,    
                mengajar.jam_selesai  
            FROM mengajar
            JOIN guru ON mengajar.guru_id = guru.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN kelas ON mengajar.kelas_id = kelas.id
            JOIN tahun_ajaran ON mengajar.tahun_ajaran_id = tahun_ajaran.id
            ORDER BY kelas.nama_kelas ASC, mapel.nama_mapel ASC
        `;
        const [rows] = await db.query(sql);
        
        res.render('admin/jadwal/index', { 
            jadwalList: rows, 
            user: req.session.user,
            title: 'Plotting Jadwal'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error ambil data jadwal');
    }
};

// 2. Halaman Tambah Jadwal (Butuh data Guru, Mapel, Kelas buat Dropdown)
exports.halamanTambahJadwal = async (req, res) => {
    try {
        const [guru] = await db.query('SELECT id, nama_lengkap FROM guru ORDER BY nama_lengkap ASC');
        const [mapel] = await db.query('SELECT id, nama_mapel FROM mapel ORDER BY nama_mapel ASC');
        const [kelas] = await db.query('SELECT id, nama_kelas FROM kelas ORDER BY tingkat ASC, nama_kelas ASC');

        res.render('admin/jadwal/tambah', {
            guruList: guru,
            mapelList: mapel,
            kelasList: kelas,
            user: req.session.user
        });
    } catch (error) {
        res.send('Gagal memuat form');
    }
};


// 3. Proses Simpan Jadwal (UPDATE DENGAN HARI & JAM)
exports.prosesTambahJadwal = async (req, res) => {
    // 1. UPDATE: Tambahkan hari, jam_mulai, jam_selesai di sini
    const { guru_id, mapel_id, kelas_id, hari, jam_mulai, jam_selesai } = req.body;

    try {
        // Cari Tahun Ajaran Aktif
        const [thn] = await db.query('SELECT id FROM tahun_ajaran WHERE status = 1 LIMIT 1');
        
        if (thn.length === 0) {
            return res.send('Error: Tidak ada Tahun Ajaran yang aktif! Aktifkan dulu di database.');
        }

        const tahunAktifId = thn[0].id;

        // 2. UPDATE CEK DUPLIKAT:
        // Kita cek biar gak ada jadwal tabrakan di HARI dan JAM yang sama untuk KELAS yang sama.
        // Jadi mapel yang sama BOLEH diinput lagi asalkan beda hari/jam.
        const [cek] = await db.query(
            'SELECT id FROM mengajar WHERE kelas_id=? AND hari=? AND jam_mulai=? AND tahun_ajaran_id=?',
            [kelas_id, hari, jam_mulai, tahunAktifId]
        );

        if (cek.length > 0) {
            return res.send(`Gagal! Kelas ini sudah ada jadwal lain pada hari ${hari} jam ${jam_mulai}.`);
        }

        // 3. UPDATE INSERT: Masukkan kolom hari & waktu ke database
        await db.query(
            `INSERT INTO mengajar 
            (guru_id, mapel_id, kelas_id, tahun_ajaran_id, hari, jam_mulai, jam_selesai) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [guru_id, mapel_id, kelas_id, tahunAktifId, hari, jam_mulai, jam_selesai]
        );

        res.redirect('/admin/jadwal');

    } catch (error) {
        console.error(error);
        res.send('Gagal menyimpan jadwal.');
    }
};

// 4. Hapus Jadwal
exports.hapusJadwal = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM mengajar WHERE id = ?', [id]);
        res.redirect('/admin/jadwal');
    } catch (error) {
        res.send('Gagal hapus jadwal');
    }
};

// ==========================
// FITUR MANAJEMEN GURU
// ==========================

// 1. Lihat Daftar Guru
exports.viewGuru = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM guru ORDER BY nama_lengkap ASC');
        res.render('admin/guru/index', { 
            guruList: rows, 
            user: req.session.user,
            title: 'Data Guru'
        });
    } catch (error) {
        res.status(500).send('Error ambil data guru');
    }
};

// 2. Halaman Tambah Guru
exports.halamanTambahGuru = (req, res) => {
    res.render('admin/guru/tambah', { user: req.session.user });
};

// 3. Proses Simpan Guru Baru
exports.prosesTambahGuru = async (req, res) => {
    const { nip, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin } = req.body;

    try {
        // A. Generate Password dari Tanggal Lahir (YYYYMMDD)
        const rawPassword = tanggal_lahir.replace(/-/g, '');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // B. Insert ke tabel USERS
        const [userResult] = await db.query(
            `INSERT INTO users (username, password, role) VALUES (?, ?, 'guru')`,
            [nip, hashedPassword]
        );
        
        // C. Insert ke tabel GURU
        await db.query(
            `INSERT INTO guru (user_id, nip, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userResult.insertId, nip, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin]
        );

        res.redirect('/admin/guru');

    } catch (error) {
        console.error(error);
        res.send(`Gagal tambah guru. Pastikan NIP belum terdaftar.`);
    }
};

// 4. Halaman Edit Guru (Pake DATE_FORMAT biar tanggal aman)
exports.halamanEditGuru = async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT 
                id, user_id, nip, nama_lengkap, tempat_lahir, jenis_kelamin,
                DATE_FORMAT(tanggal_lahir, '%Y-%m-%d') as tgl_lahir_iso 
            FROM guru 
            WHERE id = ?
        `;
        const [rows] = await db.query(sql, [id]);

        if (rows.length === 0) return res.redirect('/admin/guru');

        res.render('admin/guru/edit', { 
            guru: rows[0], 
            user: req.session.user 
        });
    } catch (error) {
        res.status(500).send('Error edit guru');
    }
};

// 5. Proses Update Guru (Sekalian Update Password User)
exports.prosesUpdateGuru = async (req, res) => {
    const { id } = req.params;
    const { nip, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin } = req.body;

    try {
        // Update Tabel GURU
        await db.query(
            `UPDATE guru SET nip=?, nama_lengkap=?, tempat_lahir=?, tanggal_lahir=?, jenis_kelamin=? WHERE id=?`,
            [nip, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, id]
        );

        // Update Tabel USERS (Password ikut berubah sesuai tgl lahir baru)
        const [guru] = await db.query('SELECT user_id FROM guru WHERE id = ?', [id]);
        if (guru.length > 0) {
            const rawPassword = tanggal_lahir.replace(/-/g, '');
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            await db.query(
                'UPDATE users SET username=?, password=? WHERE id=?', 
                [nip, hashedPassword, guru[0].user_id]
            );
        }

        res.redirect('/admin/guru');
    } catch (error) {
        console.error(error);
        res.send('Gagal update guru.');
    }
};


// 6. Hapus Guru (VERSI SAKTI: Hapus Sampai ke Akar-akarnya)
exports.hapusGuru = async (req, res) => {
    const { id } = req.params; // Ini adalah ID Guru

    try {
        // 1. Cari dulu user_id nya (buat hapus login nanti)
        const [guruData] = await db.query('SELECT user_id FROM guru WHERE id = ?', [id]);
        
        if (guruData.length === 0) {
            return res.redirect('/admin/guru');
        }
        
        const userId = guruData[0].user_id;

        // 2. BERSIH-BERSIH JADWAL & NILAI
        // Cari tau dulu guru ini punya jadwal (mengajar) apa aja?
        const [jadwalList] = await db.query('SELECT id FROM mengajar WHERE guru_id = ?', [id]);

        // Kalau dia punya jadwal, kita harus hapus
        if (jadwalList.length > 0) {
            // Ambil semua ID Jadwalnya, misal: [1, 5, 8]
            const jadwalIds = jadwalList.map(j => j.id);

            // A. Hapus Nilai yang terkait jadwal guru ini
            // (Kita pake IN (?) biar bisa hapus banyak sekaligus)
            await db.query('DELETE FROM nilai WHERE mengajar_id IN (?)', [jadwalIds]);

            // B. Hapus Jadwal Mengajar guru ini
            await db.query('DELETE FROM mengajar WHERE guru_id = ?', [id]);
        }

        // 3. FINAL EXECUTION: Hapus Akun User (Otomatis Profil Guru kehapus karena Cascade)
        await db.query('DELETE FROM users WHERE id = ?', [userId]);

        res.redirect('/admin/guru');

    } catch (error) {
        console.error(error);
        // Tampilkan pesan error biar tau kenapa
        res.send(`
            <h3>Gagal Hapus Guru!</h3>
            <p>Error: ${error.message}</p>
            <a href="/admin/guru">Kembali</a>
        `);
    }
};

// ==========================
// FITUR DATA KELAS
// ==========================

// 1. Lihat Daftar Kelas
exports.viewKelas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM kelas ORDER BY tingkat ASC, nama_kelas ASC');
        res.render('admin/kelas/index', { 
            kelasList: rows, 
            user: req.session.user,
            title: 'Data Kelas'
        });
    } catch (error) {
        res.status(500).send('Error ambil data kelas');
    }
};

// 2. Tambah Kelas
exports.tambahKelas = async (req, res) => {
    const { nama_kelas, tingkat } = req.body;
    try {
        await db.query('INSERT INTO kelas (nama_kelas, tingkat) VALUES (?, ?)', [nama_kelas, tingkat]);
        res.redirect('/admin/kelas');
    } catch (error) {
        res.send('Gagal tambah kelas');
    }
};

// 3. Edit Kelas
exports.editKelas = async (req, res) => {
    const { id } = req.params;
    const { nama_kelas, tingkat } = req.body;
    try {
        await db.query('UPDATE kelas SET nama_kelas = ?, tingkat = ? WHERE id = ?', [nama_kelas, tingkat, id]);
        res.redirect('/admin/kelas');
    } catch (error) {
        res.send('Gagal update kelas');
    }
};

// 4. Hapus Kelas
exports.hapusKelas = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM kelas WHERE id = ?', [id]);
        res.redirect('/admin/kelas');
    } catch (error) {
        res.send('Gagal hapus kelas. (Mungkin masih ada siswa di kelas ini?)');
    }
};

// ==========================
// FITUR TAHUN AJARAN (SAKLAR)
// ==========================

// 1. Lihat Daftar Tahun Ajaran
exports.viewTahun = async (req, res) => {
    try {
        // Urutkan dari tahun terbaru biar gampang dilihat
        const [rows] = await db.query('SELECT * FROM tahun_ajaran ORDER BY tahun DESC, semester DESC');
        res.render('admin/tahun/index', { 
            tahunList: rows, 
            user: req.session.user,
            title: 'Tahun Ajaran'
        });
    } catch (error) {
        res.status(500).send('Error ambil data tahun');
    }
};

// 2. Tambah Tahun Baru
exports.tambahTahun = async (req, res) => {
    const { tahun, semester } = req.body;
    try {
        // Default status = 0 (Tidak Aktif) pas baru dibuat
        await db.query('INSERT INTO tahun_ajaran (tahun, semester, status) VALUES (?, ?, 0)', [tahun, semester]);
        res.redirect('/admin/tahun');
    } catch (error) {
        res.send('Gagal tambah tahun ajaran');
    }
};

// 3. AKTIFKAN TAHUN (Logic Saklar)
exports.aktifkanTahun = async (req, res) => {
    const { id } = req.params;
    try {
        // Langkah A: Matikan SEMUA tahun dulu (Reset)
        await db.query('UPDATE tahun_ajaran SET status = 0');

        // Langkah B: Aktifkan SATU yang dipilih
        await db.query('UPDATE tahun_ajaran SET status = 1 WHERE id = ?', [id]);

        res.redirect('/admin/tahun');
    } catch (error) {
        res.send('Gagal mengaktifkan tahun ajaran');
    }
};

// 4. Hapus Tahun
exports.hapusTahun = async (req, res) => {
    const { id } = req.params;
    try {
        // Hapus data (Hati-hati, ini bisa ngaruh ke data nilai historis kalau gak pake soft delete, tapi buat MVP gpp)
        await db.query('DELETE FROM tahun_ajaran WHERE id = ?', [id]);
        res.redirect('/admin/tahun');
    } catch (error) {
        res.send('Gagal hapus (Mungkin data nilai sudah terkait tahun ini?)');
    }
};
// ==========================
// FITUR KELOLA ADMIN (PENGATURAN)
// ==========================

// 1. Lihat Daftar Admin
exports.viewAdmin = async (req, res) => {
    try {
        // Ambil data admin gabung sama users biar tau username-nya (buat proteksi di backend)
        // Tapi Username TIDAK DITAMPILKAN di view (sesuai request keamanan)
        // Update Query SELECT-nya:
        const sql = `
            SELECT admin.*, users.username, users.is_super_admin, admin.user_id 
            FROM admin 
            JOIN users ON admin.user_id = users.id 
            ORDER BY admin.nama_lengkap ASC
        `;
        const [rows] = await db.query(sql);

        res.render('admin/pengaturan/index', { 
            adminList: rows, 
            user: req.session.user, // Data admin yang lagi login (buat cek permission di EJS)
            title: 'Kelola Admin'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error ambil data admin');
    }
};

// 2. Tambah Admin Baru (HANYA SUPER ADMIN)
exports.tambahAdmin = async (req, res) => {
    // --- PROTEKSI SUPER ADMIN ---
    // Ganti 'admin01' dengan username Super Admin lu yang asli
    if (req.session.user.username !== 'admin01') {
        return res.send(`
            <script>
                alert("⛔ AKSES DITOLAK!\\nHanya SUPER ADMIN yang boleh menambah admin baru.");
                window.location.href = "/admin/pengaturan";
            </script>
        `);
    }

    const { username, password, nama_lengkap } = req.body;

    try {
        // Cek username udah ada belum?
        const [cek] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (cek.length > 0) return res.send('Username sudah dipakai!');

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert ke Users (Role: admin)
        const [userResult] = await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, "admin")',
            [username, hashedPassword]
        );

        // Insert ke Tabel Admin
        await db.query(
            'INSERT INTO admin (user_id, nama_lengkap) VALUES (?, ?)',
            [userResult.insertId, nama_lengkap]
        );

        res.redirect('/admin/pengaturan');

    } catch (error) {
        console.error(error);
        res.send('Gagal tambah admin');
    }
};

// 3. Hapus Admin (VERSI SECURE: DATABASE FLAG)
exports.hapusAdmin = async (req, res) => {
    // PROTEKSI AKSES: Cek apakah PENGHAPUS adalah Super Admin?
    // (Kita asumsikan session user lu udah nyimpen info is_super_admin pas login,
    //  tapi kalau belum, kita query dulu buat validasi double)
    
    const { id } = req.params; 
    const myId = req.session.user.id;

    try {
        // 1. Cek User SAYA (Yang mau menghapus) -> Apakah Super Admin?
        const [me] = await db.query('SELECT is_super_admin FROM users WHERE id = ?', [myId]);
        
        if (!me[0] || me[0].is_super_admin !== 1) {
             return res.send(`<script>alert("Hanya SUPER ADMIN yang boleh menghapus."); window.location.href = "/admin/pengaturan";</script>`);
        }

        // 2. Cek TARGET (Yang mau dihapus)
        const sql = 'SELECT admin.user_id, users.is_super_admin FROM admin JOIN users ON admin.user_id = users.id WHERE admin.id = ?';
        const [target] = await db.query(sql, [id]);
        
        if (target.length === 0) return res.redirect('/admin/pengaturan');

        const targetUserId = target[0].user_id;
        const targetIsSuper = target[0].is_super_admin;

        // PROTEKSI: Jangan Hapus Diri Sendiri
        if (targetUserId === myId) {
            return res.send(`<script>alert("Gak bisa hapus diri sendiri bos."); window.location.href = "/admin/pengaturan";</script>`);
        }

        // PROTEKSI UTAMA: Cek Flag Database
        if (targetIsSuper === 1) { 
            return res.send(`
                <script>
                    alert("⚠️ AKSES DITOLAK!\\nAkun ini memiliki status SUPER ADMIN di database dan tidak bisa dihapus.");
                    window.location.href = "/admin/pengaturan";
                </script>
            `);
        }

        // Hapus
        await db.query('DELETE FROM users WHERE id = ?', [targetUserId]);

        res.redirect('/admin/pengaturan');

    } catch (error) {
        console.error(error);
        res.send('Gagal hapus admin');
    }
};