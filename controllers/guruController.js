const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// --- HELPER: Ambil Kelas Guru ---
const getKelasGuru = async (guruId) => {
    return await db.query(`
        SELECT 
            mengajar.id as mengajar_id,
            kelas.nama_kelas, 
            mapel.nama_mapel,
            tahun_ajaran.semester,
            COUNT(nilai.id) as jumlah_nilai_masuk,
            (SELECT COUNT(*) FROM tugas WHERE mengajar_id = mengajar.id) as jumlah_tugas
        FROM mengajar
        JOIN kelas ON mengajar.kelas_id = kelas.id
        JOIN mapel ON mengajar.mapel_id = mapel.id
        JOIN tahun_ajaran ON mengajar.tahun_ajaran_id = tahun_ajaran.id
        LEFT JOIN nilai ON mengajar.id = nilai.mengajar_id
        WHERE mengajar.guru_id = ? AND tahun_ajaran.status = 1
        GROUP BY mengajar.id
        ORDER BY kelas.nama_kelas ASC
    `, [guruId]);
};

// ==========================================
// 1. DASHBOARD & PROFIL (YANG HILANG)
// ==========================================

exports.dashboard = async (req, res) => {
    const guruId = req.session.user.id;
    try {
        // 1. CARI TAU HARI INI HARI APA
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const d = new Date();
        const namaHari = days[d.getDay()]; 

        const [g] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        const profil = g[0];
        
        // 2. AMBIL SEMUA KELAS AJAR + FORMAT JAM
        // Kita pakai TIME_FORMAT di SQL biar jamnya rapi (07:00)
        const sql = `
            SELECT mengajar.id as mengajar_id, mengajar.hari, 
                   TIME_FORMAT(mengajar.jam_mulai, '%H:%i') as jam_mulai_fmt,
                   TIME_FORMAT(mengajar.jam_selesai, '%H:%i') as jam_selesai_fmt,
                   kelas.nama_kelas, mapel.nama_mapel
            FROM mengajar 
            JOIN kelas ON mengajar.kelas_id = kelas.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            WHERE mengajar.guru_id = ?
            ORDER BY mengajar.jam_mulai ASC`;

        const [semuaJadwal] = await db.query(sql, [profil.id]);

        // 3. FILTER JADWAL HARI INI
        // Ini yang ditunggu-tunggu sama variabel 'jadwalList' di view
        const jadwalHariIni = semuaJadwal.filter(item => item.hari === namaHari);

        // 4. KIRIM KE VIEW
        res.render('dashboard/guru', { 
            title: 'Dashboard Guru',
            user: req.session.user,
            profil: profil,
            
            jadwalList: jadwalHariIni,   // <-- Data untuk tabel "Kelas Hari Ini"
            hariIni: namaHari,           // <-- Data untuk judul "Jadwal Hari Ini: ..."
            
            // Tambahan opsional kalau view butuh list lengkap
            mengajarList: semuaJadwal    
        });

    } catch (e) { 
        console.error(e);
        res.send(e.message); 
    }
};

// exports.profil = async (req, res) => {
//     const guruId = req.session.user.id;
//     try {
//         const [g] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
//         res.render('guru/profil', {
//             title: 'Profil Saya',
//             user: req.session.user,
//             profil: g[0]
//         });
//     } catch (e) { res.send(e.message); }
// };
// ==========================================
// PENGAMAN RUTE PROFIL (KARENA PAKAI MODAL)
// ==========================================
exports.profil = async (req, res) => {
    // Karena tampilan profil sudah pindah ke Sidebar (Modal Pop-up),
    // halaman 'guru/profil.ejs' sudah tidak ada.
    // Jadi, kita redirect paksa ke Dashboard biar server gak error "View Not Found".
    res.redirect('/guru/dashboard');
};

exports.updateProfil = async (req, res) => {
    const guruId = req.session.user.id;
    const fs = require('fs');
    const path = require('path');

    try {
        let queryFoto = "";
        let params = [];

        if (req.file) {
            // 1. Hapus Foto Lama (Kecuali default)
            const [old] = await db.query('SELECT foto_profil FROM guru WHERE user_id = ?', [guruId]);
            
            // Cek apakah ada foto lama dan bukan default
            if (old[0].foto_profil && old[0].foto_profil !== 'default.png' && !old[0].foto_profil.startsWith('default-')) {
                const oldPath = path.join(__dirname, '../public/uploads/profil/', old[0].foto_profil);
                // Hapus fisik file jika ada
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            // 2. Set Query Update Foto
            queryFoto = "foto_profil = ?, ";
            params.push(req.file.filename);
            
            // 3. Update Session Guru (Biar langsung berubah di layar)
            if (req.session.profil) req.session.profil.foto_profil = req.file.filename;
        }

        // 4. Eksekusi Update ke Database
        params.push(guruId);
        await db.query(`UPDATE guru SET ${queryFoto} updated_at = NOW() WHERE user_id = ?`, params);

        // --- 🔥 PERBAIKAN REDIRECT (ANTI 404) 🔥 ---
        // Ambil alamat halaman sebelumnya secara manual
        // Kalau gagal baca, lempar ke '/dashboard' biar aman
        const halamanAsal = req.get('Referer') || '/dashboard';
        res.redirect(halamanAsal);

    } catch (error) {
        console.error("Error update profil guru:", error);
        res.send('<script>alert("Gagal update profil guru."); window.history.back();</script>');
    }
};

// ==========================================
// 2. ABSENSI (YANG HILANG)
// ==========================================

exports.halamanAbsen = async (req, res) => {
    const { id_mengajar } = req.params;
    // Logic standar render halaman absen
    res.send("Halaman Absen (Implementasi Standar)"); 
};

exports.prosesAbsen = async (req, res) => {
    res.redirect('back');
};

exports.bukaAbsen = async (req, res) => {
    res.redirect('back');
};

exports.tutupAbsen = async (req, res) => {
    res.redirect('back');
};

// ==========================================
// 3. FITUR MENU & NAVIGASI NILAI
// ==========================================

exports.halamanMenuNilai = async (req, res) => {
    const guruId = req.session.user.id;
    try {
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        const [kelasList] = await getKelasGuru(guruRows[0].id);

        res.render('guru/menu_nilai', { 
            kelasList: kelasList, user: req.session.user, profil: guruRows[0], title: 'Input Nilai Rapor'
        });
    } catch (error) { res.send('Error server menu nilai'); }
};

exports.halamanMenuTugas = async (req, res) => {
    const guruId = req.session.user.id;
    try {
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        const [kelasList] = await getKelasGuru(guruRows[0].id);

        res.render('guru/menu_tugas', { 
            kelasList: kelasList, user: req.session.user, profil: guruRows[0], title: 'Kelola Tugas & PR'
        });
    } catch (error) { res.send('Error server menu tugas'); }
};

// ==========================================
// 4. FITUR INPUT NILAI RAPOR
// ==========================================

exports.halamanInputNilai = async (req, res) => {
    const { id_mengajar } = req.params;
    const guruId = req.session.user.id;

    try {
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        
        const [info] = await db.query(`
            SELECT mengajar.*, kelas.nama_kelas, mapel.nama_mapel 
            FROM mengajar JOIN kelas ON mengajar.kelas_id = kelas.id JOIN mapel ON mengajar.mapel_id = mapel.id JOIN guru ON mengajar.guru_id = guru.id
            WHERE mengajar.id = ? AND guru.user_id = ?
        `, [id_mengajar, guruId]);

        if (info.length === 0) return res.send('Akses ditolak.');

        const sqlSiswa = `
            SELECT siswa.id as siswa_id, siswa.nis, siswa.nama_lengkap, nilai.uh1, nilai.uh2, nilai.uts, nilai.uas, nilai.nilai_akhir
            FROM siswa LEFT JOIN nilai ON siswa.id = nilai.siswa_id AND nilai.mengajar_id = ?
            WHERE siswa.kelas_id = ? ORDER BY siswa.nama_lengkap ASC
        `;
        const [siswaList] = await db.query(sqlSiswa, [id_mengajar, info[0].kelas_id]);

        res.render('guru/input_nilai', {
            mengajar: info[0], siswaList: siswaList, user: req.session.user, profil: guruRows[0], title: 'Input Nilai'
        });
    } catch (error) { res.send('Error server.'); }
};

exports.prosesSimpanNilai = async (req, res) => {
    const { id_mengajar } = req.params;
    let { siswa_id, uh1, uh2, uts, uas } = req.body;

    if (!Array.isArray(siswa_id)) {
        siswa_id = [siswa_id]; uh1 = [uh1]; uh2 = [uh2]; uts = [uts]; uas = [uas];
    }

    try {
        for (let i = 0; i < siswa_id.length; i++) {
            const s_id = siswa_id[i];
            const v_uh1 = parseFloat(uh1[i]) || 0;
            const v_uh2 = parseFloat(uh2[i]) || 0;
            const v_uts = parseFloat(uts[i]) || 0;
            const v_uas = parseFloat(uas[i]) || 0;
            const rataUH = (v_uh1 + v_uh2) / 2;
            const nilaiAkhir = (rataUH * 0.3) + (v_uts * 0.3) + (v_uas * 0.4);

            const [cek] = await db.query('SELECT id FROM nilai WHERE mengajar_id = ? AND siswa_id = ?', [id_mengajar, s_id]);

            if (cek.length > 0) {
                await db.query(`UPDATE nilai SET uh1=?, uh2=?, uts=?, uas=?, nilai_akhir=? WHERE id=?`, [v_uh1, v_uh2, v_uts, v_uas, nilaiAkhir, cek[0].id]);
            } else {
                await db.query(`INSERT INTO nilai (mengajar_id, siswa_id, uh1, uh2, uts, uas, nilai_akhir) VALUES (?, ?, ?, ?, ?, ?, ?)`, [id_mengajar, s_id, v_uh1, v_uh2, v_uts, v_uas, nilaiAkhir]);
            }
        }
        res.redirect(`/guru/nilai/${id_mengajar}`);
    } catch (error) { res.send('Gagal simpan nilai.'); }
};

// ==========================================
// 5. FITUR KELOLA TUGAS (LMS)
// ==========================================

exports.halamanTugas = async (req, res) => {
    const { id_mengajar } = req.params;
    const guruId = req.session.user.id;

    try {
        const [info] = await db.query(`SELECT mengajar.*, kelas.nama_kelas, mapel.nama_mapel FROM mengajar JOIN kelas ON mengajar.kelas_id = kelas.id JOIN mapel ON mengajar.mapel_id = mapel.id WHERE mengajar.id = ?`, [id_mengajar]);
        if (info.length === 0) return res.send('Akses ditolak.');
        
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        const [tugasList] = await db.query(`
            SELECT *, DATE_FORMAT(deadline, '%d %M %Y %H:%i') as deadline_fmt, (SELECT COUNT(*) FROM pengumpulan WHERE tugas_id = tugas.id) as total_kumpul
            FROM tugas WHERE mengajar_id = ? ORDER BY created_at DESC
        `, [id_mengajar]);

        res.render('guru/tugas/index', {
            mengajar: info[0], tugasList: tugasList, user: req.session.user, profil: guruRows[0], title: 'Kelola Tugas'
        });
    } catch (error) { res.send('Error memuat tugas.'); }
};

exports.prosesBuatTugas = async (req, res) => {
    const { id_mengajar } = req.params;
    const { judul, deskripsi, tipe_tugas, deadline } = req.body;
    const fileGuru = req.file ? req.file.filename : null;

    let { soal_teks, jenis_soal, kunci_jawaban, kunci_pg, soal_id } = req.body;
    let soalJson = null;

    try {
        if (soal_teks) {
            if (!Array.isArray(soal_teks)) {
                soal_teks = [soal_teks]; jenis_soal = [jenis_soal]; kunci_jawaban = [kunci_jawaban || '']; kunci_pg = [kunci_pg || '']; soal_id = [soal_id];
            }

            const listSoal = soal_teks.map((tanya, index) => {
                const tipe = jenis_soal[index];
                const uid = soal_id[index];
                let objSoal = { id: index + 1, tipe: tipe, pertanyaan: tanya };

                if (tipe === 'pg') {
                    const opsiRaw = req.body[`opsi_${uid}`];
                    let opsiRapih = {};
                    if (opsiRaw && Array.isArray(opsiRaw)) {
                        opsiRaw.forEach((val, i) => { opsiRapih[String.fromCharCode(65 + i)] = val; });
                    } else if (typeof opsiRaw === 'string') { opsiRapih['A'] = opsiRaw; }
                    
                    objSoal.opsi = opsiRapih;
                    const kunciBenar = kunci_pg[index];
                    if (!kunciBenar || kunciBenar.trim() === '') throw new Error(`Soal No. ${index + 1} (PG) wajib ada Kunci Jawaban!`);
                    objSoal.kunci = kunciBenar;
                } else {
                    objSoal.kunci = kunci_jawaban[index];
                }
                return objSoal;
            });
            soalJson = JSON.stringify(listSoal);
        }

        let statusApp = 'Direct';
        let finalDeadline = deadline;

        if (tipe_tugas === 'UTS' || tipe_tugas === 'UAS') {
            statusApp = 'Pending';
            finalDeadline = null;
        } else if (!finalDeadline) {
            return res.send('<script>alert("Deadline wajib diisi!"); window.history.back();</script>');
        }

        await db.query(
            `INSERT INTO tugas (mengajar_id, judul, deskripsi, tipe_tugas, deadline, file_guru, soal_json, status_approval) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [id_mengajar, judul, deskripsi, tipe_tugas, finalDeadline, fileGuru, soalJson, statusApp]
        );

        if (statusApp === 'Pending') {
            res.send(`<script>alert("Berhasil! Tugas menunggu verifikasi Admin."); window.location.href = "/guru/tugas/${id_mengajar}";</script>`);
        } else {
            res.redirect(`/guru/tugas/${id_mengajar}`);
        }

    } catch (error) {
        console.error(error);
        res.send(`<script>alert("Gagal membuat tugas: ${error.message}"); window.history.back();</script>`);
    }
};

exports.hapusTugas = async (req, res) => {
    const { id } = req.params;
    try {
        const [t] = await db.query('SELECT file_guru FROM tugas WHERE id = ?', [id]);
        if (t.length > 0 && t[0].file_guru) {
            const p = path.join(__dirname, '../public/uploads/tugas/', t[0].file_guru);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        await db.query('DELETE FROM tugas WHERE id = ?', [id]);
        res.redirect('back');
    } catch(e) { res.send('Gagal hapus'); }
};

exports.lihatDetailTugas = async (req, res) => {
    res.redirect('back'); // Placeholder
};

exports.halamanEditTugas = async (req, res) => {
    const { id_tugas } = req.params;
    const guruId = req.session.user.id;
    try {
        const [tugas] = await db.query('SELECT * FROM tugas WHERE id = ?', [id_tugas]);
        if (tugas.length === 0) return res.send('Tugas tidak ditemukan');
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        const soalList = JSON.parse(tugas[0].soal_json || '[]');

        res.render('guru/tugas/edit', {
            tugas: tugas[0], soalList: soalList, user: req.session.user, profil: guruRows[0], title: 'Edit Tugas'
        });
    } catch (error) { res.send('Error server edit tugas'); }
};

exports.prosesEditTugas = async (req, res) => {
    const { id_tugas } = req.params;
    const { judul, deskripsi, tipe_tugas, deadline } = req.body;
    let { soal_teks, jenis_soal, kunci_jawaban, kunci_pg, soal_id } = req.body;
    let soalJson = null;

    try {
        let fileUpdateQuery = "";
        let params = [judul, deskripsi, tipe_tugas];
        let finalDeadline = deadline || null;

        if (req.file) {
            const [old] = await db.query('SELECT file_guru FROM tugas WHERE id = ?', [id_tugas]);
            if (old[0].file_guru) {
                const p = path.join(__dirname, '../public/uploads/tugas/', old[0].file_guru);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
            fileUpdateQuery = ", file_guru = ?";
        }

        if (soal_teks) {
            if (!Array.isArray(soal_teks)) {
                soal_teks = [soal_teks]; jenis_soal = [jenis_soal]; kunci_jawaban = [kunci_jawaban || '']; kunci_pg = [kunci_pg || '']; soal_id = [soal_id];
            }
            const listSoal = soal_teks.map((tanya, index) => {
                const tipe = jenis_soal[index];
                const uid = soal_id[index];
                let objSoal = { id: index + 1, tipe: tipe, pertanyaan: tanya };
                if (tipe === 'pg') {
                    const opsiRaw = req.body[`opsi_${uid}`];
                    let opsiRapih = {};
                    if (opsiRaw && Array.isArray(opsiRaw)) { opsiRaw.forEach((val, i) => { opsiRapih[String.fromCharCode(65 + i)] = val; }); } 
                    else if (typeof opsiRaw === 'string') { opsiRapih['A'] = opsiRaw; }
                    objSoal.opsi = opsiRapih;
                    objSoal.kunci = kunci_pg[index];
                } else {
                    objSoal.kunci = kunci_jawaban[index];
                }
                return objSoal;
            });
            soalJson = JSON.stringify(listSoal);
        }

        const [cek] = await db.query('SELECT status_approval, deadline, mengajar_id FROM tugas WHERE id = ?', [id_tugas]);
        let statusNow = cek[0].status_approval;
        if (statusNow === 'Revisi') statusNow = 'Pending';
        if (tipe_tugas === 'UTS' || tipe_tugas === 'UAS') finalDeadline = cek[0].deadline;

        params.push(finalDeadline);
        if (req.file) params.push(req.file.filename);
        params.push(soalJson);
        params.push(statusNow);
        params.push(id_tugas);

        await db.query(
            `UPDATE tugas SET judul=?, deskripsi=?, tipe_tugas=?, deadline=? ${fileUpdateQuery}, soal_json=?, status_approval=? WHERE id=?`, 
            params
        );
        
        if (statusNow === 'Pending' && (tipe_tugas === 'UTS' || tipe_tugas === 'UAS')) {
             res.send(`<script>alert("Perubahan disimpan! Dikirim ke Admin."); window.location.href = "/guru/tugas/${cek[0].mengajar_id}";</script>`);
        } else {
            res.redirect(`/guru/tugas/${cek[0].mengajar_id}`);
        }

    } catch (error) { res.send('Gagal update: ' + error.message); }
};

// --- PENILAIAN / PENGUMPULAN ---
// (Disamakan dengan Routes: halamanPenilaian)
exports.halamanPenilaian = async (req, res) => {
    const { id_tugas } = req.params; // Sesuai routes :id_tugas
    const guruId = req.session.user.id;

    try {
        const [tugas] = await db.query('SELECT * FROM tugas WHERE id = ?', [id_tugas]);
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);

        const sql = `
            SELECT pengumpulan.*, siswa.nama_lengkap, siswa.nis,
                   DATE_FORMAT(pengumpulan.tanggal_kumpul, '%d %b %H:%i') as tgl_fmt
            FROM pengumpulan
            JOIN siswa ON pengumpulan.siswa_id = siswa.id
            WHERE pengumpulan.tugas_id = ?
            ORDER BY pengumpulan.tanggal_kumpul DESC
        `;
        const [listKumpul] = await db.query(sql, [id_tugas]);

        // Note: Render ke view 'lihat_pengumpulan' atau 'nilai' terserah kamu
        // Tapi sesuaikan nama file view-nya. Asumsi 'lihat_pengumpulan'
        res.render('guru/tugas/lihat_pengumpulan', {
            tugas: tugas[0], listKumpul: listKumpul, user: req.session.user, profil: guruRows[0], title: 'Penilaian Tugas'
        });
    } catch (error) { res.send('Error memuat pengumpulan.'); }
};

// (Disamakan dengan Routes: simpanNilai)
exports.simpanNilai = async (req, res) => {
    const { id_pengumpulan, nilai, komentar, id_tugas } = req.body; // Sesuaikan form
    try {
        await db.query(`
            UPDATE pengumpulan SET nilai = ?, komentar_guru = ?, status_koreksi = 'Sudah', tanggal_dinilai=NOW() 
            WHERE id = ?
        `, [nilai, komentar, id_pengumpulan]);

        // Redirect balik ke list pengumpulan
        // Karena routes pakai :id_tugas di URL sebelumnya, kita butuh ID tugas buat balik
        if(id_tugas) res.redirect(`/guru/tugas/nilai/${id_tugas}`);
        else res.redirect('back');
        
    } catch (error) { res.send('Gagal menyimpan nilai.'); }
};

// ==========================================
// 6. FITUR JADWAL
// ==========================================
exports.lihatJadwalFull = async (req, res) => {
    const guruId = req.session.user.id;
    try {
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);
        const profil = guruRows[0];

        const sql = `
            SELECT mengajar.id, mengajar.hari, 
                TIME_FORMAT(mengajar.jam_mulai, '%H:%i') as jam_mulai, 
                TIME_FORMAT(mengajar.jam_selesai, '%H:%i') as jam_selesai,
                kelas.nama_kelas, mapel.nama_mapel
            FROM mengajar
            JOIN kelas ON mengajar.kelas_id = kelas.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN tahun_ajaran ON mengajar.tahun_ajaran_id = tahun_ajaran.id
            WHERE mengajar.guru_id = ? AND tahun_ajaran.status = 1
            ORDER BY FIELD(mengajar.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), mengajar.jam_mulai
        `;
        const [jadwal] = await db.query(sql, [profil.id]);
        res.render('guru/jadwal', { jadwalList: jadwal, user: req.session.user, profil: profil, title: 'Jadwal Mengajar' });
    } catch (error) { res.send('Error server'); }
};

// ==========================================
// 7. FITUR E-BOOK & MATERI
// ==========================================

// 1. MENU UTAMA: List Kelas (REVISI GHOST COUNT)
exports.listKelasMateri = async (req, res) => {
    const guruId = req.session.user.id; 
    
    try {
        // Ambil profil guru untuk sidebar
        const [p] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);

        // Query daftar kelas yang diajar + Hitung jumlah file materi per kelas (DENGAN FILTER KELAS_ID)
        const sql = `
            SELECT 
                mengajar.id as mengajar_id, 
                mapel.nama_mapel, 
                kelas.nama_kelas,
                (SELECT COUNT(*) FROM materi 
                 WHERE materi.guru_id = guru.id 
                 AND materi.mapel_id = mapel.id
                 AND materi.kelas_id = mengajar.kelas_id) as total_file 
            FROM mengajar
            JOIN guru ON mengajar.guru_id = guru.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN kelas ON mengajar.kelas_id = kelas.id
            WHERE guru.user_id = ?
            ORDER BY kelas.nama_kelas ASC
        `;
        
        // Perhatikan tambahan: "AND materi.kelas_id = mengajar.kelas_id" di subquery COUNT.
        // Ini memastikan hitungannya spesifik per kelas.

        const [rows] = await db.query(sql, [guruId]);

        res.render('guru/materi/list_kelas', {
            title: 'Pilih Kelas Materi',
            user: req.session.user,
            profil: p[0],
            list: rows
        });

    } catch (error) {
        console.error("Error listKelasMateri:", error);
        res.send('Gagal memuat daftar kelas materi.');
    }
};

// A. UPDATE HALAMAN LIST MATERI (Biar yang tampil cuma materi kelas itu aja)
exports.halamanMateri = async (req, res) => {
    const { id_mengajar } = req.params;
    const guruId = req.session.user.id;

    try {
        // Ambil data mengajar + KELAS_ID
        const [cek] = await db.query(`
            SELECT mengajar.*, mapel.nama_mapel, kelas.nama_kelas, guru.id as real_guru_id
            FROM mengajar
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN kelas ON mengajar.kelas_id = kelas.id
            JOIN guru ON mengajar.guru_id = guru.id
            WHERE mengajar.id = ? AND guru.user_id = ?`, 
            [id_mengajar, guruId]
        );

        if (cek.length === 0) return res.redirect('/guru/materi-saya');
        
        const info = cek[0];
        const [p] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);

        // 🔥 FILTER BERDASARKAN KELAS_ID JUGA
        const [materiList] = await db.query(
            `SELECT * FROM materi 
             WHERE guru_id = ? AND mapel_id = ? AND kelas_id = ? 
             ORDER BY created_at DESC`,
            [info.real_guru_id, info.mapel_id, info.kelas_id] // <--- Tambahan info.kelas_id
        );

        res.render('guru/materi/index', {
            title: 'Kelola Materi',
            user: req.session.user,
            profil: p[0],
            info: info,
            materiList: materiList
        });

    } catch (error) {
        console.error("Error halamanMateri:", error);
        res.send('Gagal memuat halaman materi.');
    }
};

// B. UPDATE PROSES UPLOAD (Simpan ID Kelas ke Database)
exports.prosesUploadMateri = async (req, res) => {
    const { id_mengajar } = req.params;
    const { judul, deskripsi } = req.body;

    try {
        // Ambil ID Kelas dari tabel mengajar
        const [guruData] = await db.query(
            `SELECT mengajar.mapel_id, mengajar.kelas_id, guru.id as real_guru_id 
             FROM mengajar JOIN guru ON mengajar.guru_id = guru.id 
             WHERE mengajar.id = ?`, 
            [id_mengajar]
        );

        if (guruData.length === 0) throw new Error("Data mengajar tidak valid.");
        
        const { real_guru_id, mapel_id, kelas_id } = guruData[0]; // <--- Ambil kelas_id
        
        if (!req.file) return res.send('<script>alert("Wajib upload PDF."); window.history.back();</script>');

        // INSERT DENGAN KELAS_ID
        await db.query(
            `INSERT INTO materi (guru_id, mapel_id, kelas_id, judul, deskripsi, file_path) VALUES (?, ?, ?, ?, ?, ?)`,
            [real_guru_id, mapel_id, kelas_id, judul, deskripsi, req.file.filename]
        );

        res.redirect(`/guru/materi/${id_mengajar}`);

    } catch (error) {
        console.error("Error upload:", error);
        res.send(`<script>alert("Gagal upload: ${error.message}"); window.history.back();</script>`);
    }
};
exports.hapusMateri = async (req, res) => {
    // 1. Tangkap dua parameter: ID file dan ID Mengajar (buat jalan pulang)
    const { id, id_mengajar } = req.params;
    
    const fs = require('fs');
    const path = require('path');

    try {
        const [rows] = await db.query('SELECT * FROM materi WHERE id = ?', [id]);
        
        if (rows.length > 0) {
            const fileName = rows[0].file_path;
            const filePath = path.join(__dirname, '../public/uploads/materi/', fileName);
            
            // Hapus file fisik
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Hapus data di DB
            await db.query('DELETE FROM materi WHERE id = ?', [id]);
        }
        
        // 2. SOLUSI ANTI ERROR: Redirect spesifik ke halaman list materi kelas tsb
        res.redirect(`/guru/materi/${id_mengajar}`);

    } catch (error) {
        console.error("Error hapus materi:", error);
        res.send(`<script>alert("Gagal menghapus materi."); window.location.href = "/guru/materi/${id_mengajar}";</script>`);
    }
};
