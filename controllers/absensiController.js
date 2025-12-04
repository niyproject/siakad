const db = require('../config/database');
const QRCode = require('qrcode');

// Variable Global (di RAM) buat nyimpen Token Aktif sementara
// Format: { id_mengajar: { token: 'ACAK123', created_at: 123456789 } }
let activeTokens = {}; 

// 1. Halaman Absensi Guru (Tampilkan QR) - SUDAH DIPERBAIKI
exports.halamanAbsenGuru = async (req, res) => {
    const { id_mengajar } = req.params;
    const guruId = req.session.user.id;

    try {
        // --- PERBAIKAN: Ambil Profil Guru Lengkap Dulu ---
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        
        // Kalau data guru gak ketemu (aneh sih), balikin ke login
        if (guruRows.length === 0) return res.redirect('/login');
        
        const profilGuru = guruRows[0]; 
        // ------------------------------------------------

        // Validasi: Guru ini beneran ngajar kelas ini gak?
        const [info] = await db.query(`
            SELECT mengajar.*, kelas.nama_kelas, mapel.nama_mapel 
            FROM mengajar 
            JOIN kelas ON mengajar.kelas_id = kelas.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN guru ON mengajar.guru_id = guru.id
            WHERE mengajar.id = ? AND guru.user_id = ?
        `, [id_mengajar, guruId]);

        if (info.length === 0) return res.send('Akses ditolak.');

        // Ambil list siswa di kelas itu (buat checklist manual)
        const [siswaList] = await db.query(`
            SELECT siswa.id, siswa.nama_lengkap, siswa.nis,
                   (SELECT status FROM absensi WHERE siswa_id = siswa.id AND mengajar_id = ? AND tanggal = CURDATE()) as status_hari_ini
            FROM siswa 
            WHERE kelas_id = ? 
            ORDER BY nama_lengkap ASC
        `, [id_mengajar, info[0].kelas_id]);

        res.render('guru/absensi/dashboard', {
            mengajar: info[0],
            siswaList: siswaList,
            user: req.session.user,
            profil: profilGuru, // <--- INI KUNCINYA (Kirim data profil lengkap)
            title: 'Sesi Absensi'
        });

    } catch (error) {
        console.error(error);
        res.send('Error server absensi.');
    }
};

// 2. API: Generate QR Baru (Dipanggil AJAX oleh Browser Guru)
exports.apiGenerateQR = async (req, res) => {
    const { id_mengajar } = req.params;
    
    // Bikin Token Acak (Random String)
    const tokenBaru = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Simpan di memori server
    activeTokens[id_mengajar] = {
        token: tokenBaru,
        created: Date.now()
    };

    // Generate Gambar QR Data URL
    // Isi QR-nya adalah JSON: { t: 'TOKEN', m: 'ID_MENGAJAR' }
    const qrData = JSON.stringify({ t: tokenBaru, m: id_mengajar });
    
    try {
        const qrImage = await QRCode.toDataURL(qrData);
        res.json({ success: true, qrImage: qrImage, token: tokenBaru });
    } catch (err) {
        res.json({ success: false });
    }
};

// 3. API: Cek Status Scan (Polling oleh Browser Guru)
// Guru nanya: "Ada yang berhasil scan belum?"
exports.apiCekScanTerbaru = async (req, res) => {
    const { id_mengajar } = req.params;
    
    // Cek database absensi 5 detik terakhir
    const [terbaru] = await db.query(`
        SELECT siswa.nama_lengkap 
        FROM absensi 
        JOIN siswa ON absensi.siswa_id = siswa.id
        WHERE mengajar_id = ? AND created_at > (NOW() - INTERVAL 2 SECOND)
        LIMIT 1
    `, [id_mengajar]);

    if (terbaru.length > 0) {
        // ADA YANG SCAN! Kirim sinyal "REFRESH" ke Guru
        res.json({ ada_scan: true, siswa: terbaru[0].nama_lengkap });
    } else {
        res.json({ ada_scan: false });
    }
};

// 4. Halaman Scan Siswa
exports.halamanScanSiswa = (req, res) => {
    res.render('siswa/absensi/scan', { user: req.session.user });
};

// 5. Proses Scan (Siswa kirim data QR)
exports.prosesScan = async (req, res) => {
    const { qr_data } = req.body; // String JSON dari QR
    const siswaId = req.session.user.id; // User ID login (User table)

    try {
        const data = JSON.parse(qr_data); // { t: 'TOKEN', m: 'ID_MENGAJAR' }
        const tokenKirim = data.t;
        const idMengajar = data.m;

        // Validasi 1: Token Valid gak?
        const serverToken = activeTokens[idMengajar];
        if (!serverToken || serverToken.token !== tokenKirim) {
            return res.json({ success: false, message: 'QR Code Kadaluarsa / Tidak Valid!' });
        }

        // Validasi 2: Siswa beneran murid kelas itu gak?
        // (Query cek kelas siswa vs kelas mengajar) ... kita skip dulu biar cepet, asumsi bener.

        // Ambil ID Siswa Asli (dari tabel siswa)
        const [s] = await db.query('SELECT id FROM siswa WHERE user_id = ?', [siswaId]);
        const idSiswaAsli = s[0].id;

        // Cek udah absen belum hari ini?
        const [cek] = await db.query('SELECT id FROM absensi WHERE siswa_id = ? AND mengajar_id = ? AND tanggal = CURDATE()', [idSiswaAsli, idMengajar]);
        
        if (cek.length > 0) {
            return res.json({ success: false, message: 'Kamu sudah absen hari ini!' });
        }

        // SIMPAN ABSENSI
        await db.query(`
            INSERT INTO absensi (mengajar_id, siswa_id, tanggal, status, waktu_scan)
            VALUES (?, ?, CURDATE(), 'H', CURTIME())
        `, [idMengajar, idSiswaAsli]);

        // 🔥 MUSNAHKAN TOKEN (Biar gak bisa dipake lagi)
        delete activeTokens[idMengajar]; 

        res.json({ success: true, message: 'Berhasil Absen! Selamat Belajar.' });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'QR Code Rusak.' });
    }
};