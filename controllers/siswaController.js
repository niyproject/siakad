const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. DASHBOARD & JADWAL
// ==========================================
exports.lihatJadwal = async (req, res) => {
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const siswa = s[0];

        // 🔥 PERBAIKAN QUERY SQL 🔥
        const sql = `
            SELECT 
                mengajar.hari, 
                TIME_FORMAT(mengajar.jam_mulai, '%H:%i') as jam_mulai,
                TIME_FORMAT(mengajar.jam_selesai, '%H:%i') as jam_selesai,
                mapel.nama_mapel,
                
                -- INI YANG TADI HILANG BUNG 👇
                guru.nama_lengkap, 
                guru.foto_profil,
                guru.jenis_kelamin -- Tambahan buat logic avatar default kalau foto kosong
                
            FROM mengajar
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN guru ON mengajar.guru_id = guru.id
            WHERE mengajar.kelas_id = ?
            ORDER BY FIELD(mengajar.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), mengajar.jam_mulai
        `;
        
        const [jadwal] = await db.query(sql, [siswa.kelas_id]);
        
        res.render('siswa/jadwal', {
            title: 'Jadwal Pelajaran',
            user: req.session.user,
            profil: siswa,
            jadwalList: jadwal
        });
    } catch (e) { res.send(e.message); }
};exports.lihatJadwal = async (req, res) => {
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const siswa = s[0];

        // 🔥 PERBAIKAN QUERY SQL 🔥
        const sql = `
            SELECT 
                mengajar.hari, 
                TIME_FORMAT(mengajar.jam_mulai, '%H:%i') as jam_mulai,
                TIME_FORMAT(mengajar.jam_selesai, '%H:%i') as jam_selesai,
                mapel.nama_mapel,
                
                -- INI YANG TADI HILANG BUNG 👇
                guru.nama_lengkap, 
                guru.foto_profil,
                guru.jenis_kelamin -- Tambahan buat logic avatar default kalau foto kosong
                
            FROM mengajar
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN guru ON mengajar.guru_id = guru.id
            WHERE mengajar.kelas_id = ?
            ORDER BY FIELD(mengajar.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), mengajar.jam_mulai
        `;
        
        const [jadwal] = await db.query(sql, [siswa.kelas_id]);
        
        res.render('siswa/jadwal', {
            title: 'Jadwal Pelajaran',
            user: req.session.user,
            profil: siswa,
            jadwalList: jadwal
        });
    } catch (e) { res.send(e.message); }
};

// ==========================================
// 2. PROFIL SAYA (INI YANG TADI HILANG)
// ==========================================
exports.profil = async (req, res) => {
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        res.render('siswa/profil', {
            title: 'Profil Saya',
            user: req.session.user,
            profil: s[0]
        });
    } catch (e) { res.send(e.message); }
};

exports.updateProfil = async (req, res) => {
    const siswaId = req.session.user.id;
    const fs = require('fs');
    const path = require('path');

    try {
        let queryFoto = "";
        let params = [];

        if (req.file) {
            // 1. Hapus Foto Lama
            const [old] = await db.query('SELECT foto_profil FROM siswa WHERE user_id = ?', [siswaId]);
            if (old[0].foto_profil && old[0].foto_profil !== 'default.png' && !old[0].foto_profil.startsWith('default-')) {
                const oldPath = path.join(__dirname, '../public/uploads/profil/', old[0].foto_profil);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            // 2. Siapkan Query Foto Baru
            queryFoto = "foto_profil = ?, ";
            params.push(req.file.filename);
            
            // 3. Update Session (Penting biar layar berubah)
            if (req.session.profil) req.session.profil.foto_profil = req.file.filename;
            if (req.session.user) req.session.user.foto = req.file.filename;
        }

        // 4. Eksekusi Database
        params.push(siswaId);
        await db.query(`UPDATE siswa SET ${queryFoto} updated_at = NOW() WHERE user_id = ?`, params);

        // --- 🔥 PERBAIKAN REDIRECT (SOLUSI 404) 🔥 ---
        // Kita ambil alamat 'Referer' (halaman asal) secara manual.
        // Kalau referer gak kebaca, kita lempar ke '/dashboard' biar aman.
        const halamanAsal = req.get('Referer') || '/dashboard';
        res.redirect(halamanAsal);

    } catch (error) {
        console.error("Error update profil:", error);
        res.send('<script>alert("Gagal update profil."); window.history.back();</script>');
    }
};

// ==========================================
// 3. FITUR TUGAS & KUIS
// ==========================================
exports.lihatTugas = async (req, res) => {
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const siswa = s[0];

        const sql = `
            SELECT tugas.*, mapel.nama_mapel, guru.nama_lengkap as nama_guru,
                   DATE_FORMAT(tugas.deadline, '%d %b %H:%i') as deadline_fmt,
                   (SELECT COUNT(*) FROM pengumpulan WHERE tugas_id = tugas.id AND siswa_id = ?) as sudah_kumpul,
                   (SELECT nilai FROM pengumpulan WHERE tugas_id = tugas.id AND siswa_id = ?) as nilai
            FROM tugas
            JOIN mengajar ON tugas.mengajar_id = mengajar.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN guru ON mengajar.guru_id = guru.id
            WHERE mengajar.kelas_id = ? AND tugas.status_approval = 'Direct'
            ORDER BY tugas.created_at DESC
        `;
        const [tugasList] = await db.query(sql, [siswa.id, siswa.id, siswa.kelas_id]);

        res.render('siswa/tugas', {
            title: 'Daftar Tugas', user: req.session.user, profil: siswa, tugasList: tugasList
        });
    } catch (e) { res.send(e.message); }
};

exports.kumpulTugas = async (req, res) => {
    const { id_tugas } = req.params;
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT id FROM siswa WHERE user_id = ?', [siswaId]);
        const realSiswaId = s[0].id;
        
        const fileName = req.file ? req.file.filename : null;
        
        // Cek udah kumpul belum
        const [cek] = await db.query('SELECT id FROM pengumpulan WHERE tugas_id=? AND siswa_id=?', [id_tugas, realSiswaId]);
        
        if (cek.length > 0) {
            // Update
            if (fileName) {
                 await db.query('UPDATE pengumpulan SET file_siswa=?, tanggal_kumpul=NOW() WHERE id=?', [fileName, cek[0].id]);
            } else {
                 await db.query('UPDATE pengumpulan SET tanggal_kumpul=NOW() WHERE id=?', [cek[0].id]);
            }
        } else {
            // Insert
            await db.query('INSERT INTO pengumpulan (tugas_id, siswa_id, file_siswa, tanggal_kumpul) VALUES (?, ?, ?, NOW())', [id_tugas, realSiswaId, fileName]);
        }
        res.redirect('/siswa/tugas');
    } catch (e) { res.send(e.message); }
};

exports.halamanKerjakan = async (req, res) => {
    const { id_tugas } = req.params;
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const [tugas] = await db.query('SELECT * FROM tugas WHERE id = ?', [id_tugas]);
        
        // Parse Soal JSON
        const soalList = JSON.parse(tugas[0].soal_json || '[]');

        res.render('siswa/kerjakan_kuis', {
            title: 'Mengerjakan: ' + tugas[0].judul,
            user: req.session.user, profil: s[0], tugas: tugas[0], soalList: soalList
        });
    } catch (e) { res.send(e.message); }
};

exports.prosesKerjakan = async (req, res) => {
    const { id_tugas } = req.params;
    const siswaId = req.session.user.id;
    // Ambil jawaban dari body (format: jawaban_1, jawaban_2, dst)
    // Simpan logic sederhana dulu
    try {
        const [s] = await db.query('SELECT id FROM siswa WHERE user_id = ?', [siswaId]);
        const realSiswaId = s[0].id;

        // Ambil semua jawaban dan bungkus jadi JSON
        const jawabanUser = JSON.stringify(req.body);

        // Cek udah kumpul belum
        const [cek] = await db.query('SELECT id FROM pengumpulan WHERE tugas_id=? AND siswa_id=?', [id_tugas, realSiswaId]);
        
        if (cek.length > 0) {
            await db.query('UPDATE pengumpulan SET jawaban_json=?, tanggal_kumpul=NOW() WHERE id=?', [jawabanUser, cek[0].id]);
        } else {
            await db.query('INSERT INTO pengumpulan (tugas_id, siswa_id, jawaban_json, tanggal_kumpul) VALUES (?, ?, ?, NOW())', [id_tugas, realSiswaId, jawabanUser]);
        }
        
        res.send('<script>alert("Jawaban tersimpan!"); window.location.href="/siswa/tugas";</script>');

    } catch (e) { res.send(e.message); }
};

// ==========================================
// 4. FITUR PERPUSTAKAAN / MATERI (SISWA)
// ==========================================
exports.menuMateri = async (req, res) => {
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const siswa = s[0];

        const sql = `
            SELECT 
                mapel.id as mapel_id, mapel.nama_mapel, guru.nama_lengkap as nama_guru,
                (SELECT COUNT(*) FROM materi 
                 WHERE materi.mapel_id = mapel.id 
                 AND materi.guru_id = guru.id
                 AND materi.kelas_id = mengajar.kelas_id) as total_materi 
            FROM mengajar
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN guru ON mengajar.guru_id = guru.id
            WHERE mengajar.kelas_id = ?
        `;
        const [mapelList] = await db.query(sql, [siswa.kelas_id]);

        res.render('siswa/materi/list_mapel', {
            title: 'Perpustakaan Digital', user: req.session.user, profil: siswa, mapelList: mapelList
        });
    } catch (error) { res.send('Gagal memuat menu materi.'); }
};

exports.lihatMateriMapel = async (req, res) => {
    const { id_mapel } = req.params;
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const siswa = s[0];
        const [m] = await db.query('SELECT nama_mapel FROM mapel WHERE id = ?', [id_mapel]);
        
        const sql = `
            SELECT materi.*, guru.nama_lengkap as nama_guru
            FROM materi
            JOIN guru ON materi.guru_id = guru.id
            WHERE materi.mapel_id = ? AND materi.kelas_id = ? 
            ORDER BY materi.created_at DESC
        `;
        const [materiList] = await db.query(sql, [id_mapel, siswa.kelas_id]);

        res.render('siswa/materi/index', {
            title: 'Daftar Materi - ' + m[0].nama_mapel, user: req.session.user, profil: siswa, nama_mapel: m[0].nama_mapel, materiList: materiList
        });
    } catch (error) { res.send('Gagal memuat daftar file.'); }
};

exports.bacaMateri = async (req, res) => {
    const { id } = req.params;
    const siswaId = req.session.user.id;
    try {
        const [s] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const [file] = await db.query(`SELECT materi.*, mapel.nama_mapel FROM materi JOIN mapel ON materi.mapel_id = mapel.id WHERE materi.id = ?`, [id]);

        if (file.length === 0) return res.redirect('back');

        res.render('siswa/materi/baca', {
            title: 'Membaca: ' + file[0].judul, user: req.session.user, profil: s[0], materi: file[0]
        });
    } catch (error) { res.send('Gagal membuka file.'); }
};
