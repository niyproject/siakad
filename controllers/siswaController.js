const db = require('../config/database');

exports.lihatJadwal = async (req, res) => {
    const siswaId = req.session.user.id;
    try {
        const [siswaRows] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        if (siswaRows.length === 0) return res.redirect('/dashboard');
        
        const profil = siswaRows[0];
        const sql = `
            SELECT mapel.nama_mapel, guru.nama_lengkap, mengajar.hari, mengajar.jam_mulai, mengajar.jam_selesai
            FROM mengajar
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN guru ON mengajar.guru_id = guru.id
            JOIN tahun_ajaran ON mengajar.tahun_ajaran_id = tahun_ajaran.id
            WHERE mengajar.kelas_id = ? AND tahun_ajaran.status = 1
            ORDER BY FIELD(mengajar.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), mengajar.jam_mulai
        `;
        const [jadwal] = await db.query(sql, [profil.kelas_id]);
        res.render('siswa/jadwal', { jadwalList: jadwal, user: req.session.user, profil: profil, title: 'Jadwal Pelajaran' });
    } catch (error) { res.send('Error memuat jadwal'); }
};

// Lihat Daftar Tugas
// controllers/siswaController.js

exports.lihatTugas = async (req, res) => {
    const siswaId = req.session.user.id;

    try {
        // 1. Ambil Profil Siswa
        const [siswaRows] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [siswaId]);
        const profil = siswaRows[0];

        // 2. Query Daftar Tugas (Modified)
        const sql = `
            SELECT 
                tugas.*, 
                mapel.nama_mapel, 
                guru.nama_lengkap as nama_guru,
                DATE_FORMAT(tugas.deadline, '%d %b %Y %H:%i') as deadline_fmt,
                
                -- Data Pengumpulan Siswa
                pengumpulan.id as pengumpulan_id,
                pengumpulan.tanggal_kumpul,
                pengumpulan.nilai,
                pengumpulan.komentar_guru,
                pengumpulan.catatan_siswa,
                pengumpulan.status_koreksi,

                -- Data Saklar Rilis Nilai (Dari Tahun Ajaran)
                tahun_ajaran.tampilkan_uts,
                tahun_ajaran.tampilkan_uas

            FROM tugas
            JOIN mengajar ON tugas.mengajar_id = mengajar.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN guru ON mengajar.guru_id = guru.id
            JOIN tahun_ajaran ON mengajar.tahun_ajaran_id = tahun_ajaran.id
            
            LEFT JOIN pengumpulan ON tugas.id = pengumpulan.tugas_id AND pengumpulan.siswa_id = ?
            
            WHERE mengajar.kelas_id = ?
            
            -- FILTER PENTING: Hanya tampilkan PR biasa (Direct) atau Ujian Online
            -- Tugas 'Pending' (blm di-acc) dan 'Offline' (ujian kertas) TIDAK MUNCUL
            AND (tugas.status_approval = 'Direct' OR tugas.status_approval = 'Online')

            ORDER BY tugas.deadline DESC
        `;

        const [tugasList] = await db.query(sql, [profil.id, profil.kelas_id]);

        // 3. Render View
        res.render('siswa/tugas', { 
            tugasList: tugasList, 
            user: req.session.user, 
            profil: profil, 
            title: 'Tugas & PR' 
        });

    } catch (error) {
        console.error(error);
        res.send('Error memuat tugas siswa.');
    }
};

// Proses Upload Tugas (File)
exports.kumpulTugas = async (req, res) => {
    const { id_tugas } = req.params;
    const { catatan } = req.body;
    const userId = req.session.user.id;
    
    try {
        const [tugas] = await db.query('SELECT deadline FROM tugas WHERE id = ?', [id_tugas]);
        if (new Date() > new Date(tugas[0].deadline)) return res.send('<script>alert("Waktu habis!"); window.history.back();</script>');
        if (!req.file) return res.send('<script>alert("File wajib!"); window.history.back();</script>');
        
        const fileSiswa = req.file.filename;
        const [s] = await db.query('SELECT id FROM siswa WHERE user_id = ?', [userId]);
        const siswaId = s[0].id;

        const [cek] = await db.query('SELECT id FROM pengumpulan WHERE tugas_id = ? AND siswa_id = ?', [id_tugas, siswaId]);

        if (cek.length > 0) {
            // UPDATE: Reset status_koreksi jadi 'Belum'
            await db.query(`UPDATE pengumpulan SET file_siswa=?, catatan_siswa=?, tanggal_kumpul=NOW(), is_edited=1, status_koreksi='Belum' WHERE id=?`, 
                [fileSiswa, catatan, cek[0].id]);
        } else {
            await db.query(`INSERT INTO pengumpulan (tugas_id, siswa_id, file_siswa, catatan_siswa, status_koreksi) VALUES (?, ?, ?, ?, 'Belum')`, 
                [id_tugas, siswaId, fileSiswa, catatan]);
        }
        res.redirect('/siswa/tugas');
    } catch (error) { res.send('Gagal upload.'); }
};

// Halaman Kuis Manual
exports.halamanKerjakan = async (req, res) => {
    const { id_tugas } = req.params;
    const userId = req.session.user.id;

    try {
        const [siswa] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [userId]);
        const [tugas] = await db.query('SELECT * FROM tugas WHERE id = ?', [id_tugas]);
        if (tugas.length === 0) return res.redirect('/siswa/tugas');

        const soalList = JSON.parse(tugas[0].soal_json || '[]');
        const isLate = new Date() > new Date(tugas[0].deadline);

        // Ambil Jawaban Lama
        const [submit] = await db.query('SELECT jawaban_json FROM pengumpulan WHERE tugas_id=? AND siswa_id=?', [id_tugas, siswa[0].id]);
        let jawabanLama = {};
        if (submit.length > 0 && submit[0].jawaban_json) {
            const raw = JSON.parse(submit[0].jawaban_json);
            raw.forEach(j => { jawabanLama[j.id] = j.jawab; });
        }

        res.render('siswa/kerjakan_tugas', {
            tugas: tugas[0], soalList: soalList, user: req.session.user, profil: siswa[0], title: 'Mengerjakan Tugas', isLate: isLate, jawabanLama: jawabanLama
        });
    } catch (error) { res.send('Error membuka soal.'); }
};

// Proses Simpan Jawaban Kuis
exports.prosesKerjakan = async (req, res) => {
    const { id_tugas } = req.params;
    const userId = req.session.user.id;
    
    try {
        const [tugas] = await db.query('SELECT * FROM tugas WHERE id = ?', [id_tugas]);
        if (new Date() > new Date(tugas[0].deadline)) return res.send('<script>alert("Waktu habis!"); window.location.href="/siswa/tugas";</script>');

        const soalList = JSON.parse(tugas[0].soal_json || '[]');
        let skor = 0;
        let totalSoal = soalList.length;
        let jawabanSiswaArr = [];

        soalList.forEach(soal => {
            const jawab = req.body[`jawaban_${soal.id}`] || '';
            jawabanSiswaArr.push({ id: soal.id, jawab: jawab });
            if (soal.tipe === 'pg' && jawab.trim().toUpperCase() === soal.kunci.trim().toUpperCase()) {
                skor += (100 / totalSoal);
            }
        });
        skor = Math.round(skor);

        const [s] = await db.query('SELECT id FROM siswa WHERE user_id = ?', [userId]);
        const siswaId = s[0].id;
        const jawabanJson = JSON.stringify(jawabanSiswaArr);

        const [cek] = await db.query('SELECT id FROM pengumpulan WHERE tugas_id = ? AND siswa_id = ?', [id_tugas, siswaId]);

        if (cek.length > 0) {
            // UPDATE: Reset status_koreksi jadi 'Belum'
            await db.query(`UPDATE pengumpulan SET jawaban_json=?, nilai=?, tanggal_kumpul=NOW(), is_edited=1, status_koreksi='Belum' WHERE id=?`, 
                [jawabanJson, skor, cek[0].id]);
        } else {
            await db.query(`INSERT INTO pengumpulan (tugas_id, siswa_id, jawaban_json, nilai, tanggal_kumpul, status_koreksi) VALUES (?, ?, ?, ?, NOW(), 'Belum')`, 
                [id_tugas, siswaId, jawabanJson, skor]);
        }
        res.redirect('/siswa/tugas');
    } catch (error) { res.send('Gagal kirim jawaban.'); }
};