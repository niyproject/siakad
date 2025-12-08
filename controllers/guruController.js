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
// 1. FITUR MENU & NAVIGASI
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
// 2. FITUR INPUT NILAI RAPOR
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
// 3. FITUR KELOLA TUGAS (LMS)
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

    // Persiapan variabel untuk Soal Manual (JSON)
    let { soal_teks, jenis_soal, kunci_jawaban, kunci_pg, soal_id } = req.body;
    let soalJson = null;

    try {
        // --- 1. LOGIC PARSING SOAL MANUAL (JSON) ---
        if (soal_teks) {
            // Pastikan format array (jika cuma 1 soal, nodejs bacanya string, jadi harus di-array-kan)
            if (!Array.isArray(soal_teks)) {
                soal_teks = [soal_teks];
                jenis_soal = [jenis_soal];
                kunci_jawaban = [kunci_jawaban || ''];
                kunci_pg = [kunci_pg || ''];
                soal_id = [soal_id];
            }

            // Loop untuk menyusun objek JSON
            const listSoal = soal_teks.map((tanya, index) => {
                const tipe = jenis_soal[index];
                const uid = soal_id[index];
                
                let objSoal = {
                    id: index + 1,
                    tipe: tipe,
                    pertanyaan: tanya
                };

                if (tipe === 'pg') {
                    // Ambil opsi jawaban (A, B, C, D) secara dinamis
                    const opsiRaw = req.body[`opsi_${uid}`];
                    let opsiRapih = {};
                    
                    if (opsiRaw && Array.isArray(opsiRaw)) {
                        opsiRaw.forEach((val, i) => {
                            opsiRapih[String.fromCharCode(65 + i)] = val; // 65 = A
                        });
                    } else if (typeof opsiRaw === 'string') {
                        opsiRapih['A'] = opsiRaw;
                    }
                    
                    objSoal.opsi = opsiRapih;
                    
                    // Pastikan kunci PG ada
                    const kunciBenar = kunci_pg[index];
                    if (!kunciBenar || kunciBenar.trim() === '') {
                        throw new Error(`Soal No. ${index + 1} (PG) wajib ada Kunci Jawaban!`);
                    }
                    objSoal.kunci = kunciBenar;

                } else {
                    // Essay
                    objSoal.kunci = kunci_jawaban[index];
                }

                return objSoal;
            });

            soalJson = JSON.stringify(listSoal);
        }

        // --- 2. LOGIC APPROVAL & DEADLINE ---
        let statusApp = 'Direct'; // Default: Langsung tayang (PR/Tugas Harian)
        let finalDeadline = deadline; // Default: Ambil dari inputan guru

        // Kalau UTS atau UAS, TAHAN DULU dan NOL-KAN DEADLINE
        if (tipe_tugas === 'UTS' || tipe_tugas === 'UAS') {
            statusApp = 'Pending';
            finalDeadline = null; // Admin yang akan set deadline nanti
        } else {
            // Validasi jika PR/Tugas Harian tapi deadline kosong
            if (!finalDeadline) {
                return res.send('<script>alert("Untuk Tugas Harian/PR, Deadline wajib diisi!"); window.history.back();</script>');
            }
        }

        // --- 3. INSERT KE DATABASE ---
        await db.query(
            `INSERT INTO tugas (mengajar_id, judul, deskripsi, tipe_tugas, deadline, file_guru, soal_json, status_approval) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [id_mengajar, judul, deskripsi, tipe_tugas, finalDeadline, fileGuru, soalJson, statusApp]
        );

        // --- 4. RESPONSE / REDIRECT ---
        if (statusApp === 'Pending') {
            // Kalau Pending, kasih alert ke Guru
            res.send(`
                <script>
                    alert("Berhasil disimpan! Karena ini ${tipe_tugas}, soal akan diverifikasi oleh Admin terlebih dahulu (Status: Pending). Deadline akan ditentukan oleh Admin.");
                    window.location.href = "/guru/tugas/${id_mengajar}";
                </script>
            `);
        } else {
            // Kalau Direct, langsung balik aja
            res.redirect(`/guru/tugas/${id_mengajar}`);
        }

    } catch (error) {
        console.error(error);
        res.send(`<script>alert("Gagal membuat tugas: ${error.message}"); window.history.back();</script>`);
    }
};

// --- BAGIAN YANG TADI HILANG (EDIT & HAPUS) ---

exports.hapusTugas = async (req, res) => {
    const { id_tugas } = req.params;
    try {
        const [t] = await db.query('SELECT file_guru, mengajar_id FROM tugas WHERE id = ?', [id_tugas]);
        if (t.length > 0 && t[0].file_guru) {
            const p = path.join(__dirname, '../public/uploads/tugas/', t[0].file_guru);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        await db.query('DELETE FROM tugas WHERE id = ?', [id_tugas]);
        res.redirect(`/guru/tugas/${t[0].mengajar_id}`);
    } catch(e) { res.send('Gagal hapus'); }
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
    
    // Persiapan variabel Soal Manual (Sama seperti Buat Tugas)
    let { soal_teks, jenis_soal, kunci_jawaban, kunci_pg, soal_id } = req.body;
    let soalJson = null;

    try {
        // --- 1. PROSES FILE BARU (Jika Ada) ---
        let fileUpdateQuery = "";
        let params = [judul, deskripsi, tipe_tugas]; // Array parameter awal

        // Logic Deadline (Hanya update deadline jika bukan UTS/UAS atau jika Admin sudah set online)
        // Tapi untuk simplifikasi di sisi Guru saat edit:
        // Jika Guru edit UTS/UAS, deadline biarkan NULL atau nilai lama (jangan diubah lewat form ini jika hidden)
        // Kita tangani deadline di bawah.
        
        let finalDeadline = deadline || null; 

        if (req.file) {
            // Hapus file lama dulu
            const [old] = await db.query('SELECT file_guru FROM tugas WHERE id = ?', [id_tugas]);
            if (old[0].file_guru) {
                const p = path.join(__dirname, '../public/uploads/tugas/', old[0].file_guru);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
            fileUpdateQuery = ", file_guru = ?";
            // Params di-push nanti urutannya harus pas
        }

        // --- 2. LOGIC PARSING SOAL MANUAL ---
        if (soal_teks) {
            if (!Array.isArray(soal_teks)) {
                soal_teks = [soal_teks];
                jenis_soal = [jenis_soal];
                kunci_jawaban = [kunci_jawaban || ''];
                kunci_pg = [kunci_pg || ''];
                soal_id = [soal_id];
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
                    objSoal.kunci = kunci_pg[index];
                } else {
                    objSoal.kunci = kunci_jawaban[index];
                }
                return objSoal;
            });
            soalJson = JSON.stringify(listSoal);
        }

        // --- 3. LOGIC STATUS REVISI -> PENDING ---
        // Cek status saat ini di database
        const [cek] = await db.query('SELECT status_approval, deadline FROM tugas WHERE id = ?', [id_tugas]);
        let statusNow = cek[0].status_approval;
        let dbDeadline = cek[0].deadline;

        // Jika Guru sedang memperbaiki tugas yang statusnya 'Revisi'
        if (statusNow === 'Revisi') {
            statusNow = 'Pending'; // Kembalikan ke Admin
        }

        // Jika UTS/UAS, Guru tidak bisa set deadline lewat form edit (karena inputnya hidden/disabled)
        // Jadi kita pakai deadline lama dari DB, atau NULL jika statusnya Pending
        if (tipe_tugas === 'UTS' || tipe_tugas === 'UAS') {
            finalDeadline = dbDeadline; 
        }

        // --- 4. SUSUN QUERY UPDATE ---
        // Urutan params: judul, deskripsi, tipe_tugas, deadline, [file_guru], soal_json, status_approval, id
        
        params.push(finalDeadline); // deadline
        
        if (req.file) {
            params.push(req.file.filename); // file_guru
        }
        
        params.push(soalJson);      // soal_json
        params.push(statusNow);     // status_approval (Update status)
        params.push(id_tugas);      // WHERE id

        await db.query(
            `UPDATE tugas SET judul=?, deskripsi=?, tipe_tugas=?, deadline=? ${fileUpdateQuery}, soal_json=?, status_approval=? WHERE id=?`, 
            params
        );
        
        // --- 5. REDIRECT ---
        const [t] = await db.query('SELECT mengajar_id FROM tugas WHERE id = ?', [id_tugas]);
        
        if (statusNow === 'Pending' && (tipe_tugas === 'UTS' || tipe_tugas === 'UAS')) {
             res.send(`
                <script>
                    alert("Perubahan disimpan! Tugas dikirim kembali ke Admin untuk verifikasi.");
                    window.location.href = "/guru/tugas/${t[0].mengajar_id}";
                </script>
            `);
        } else {
            res.redirect(`/guru/tugas/${t[0].mengajar_id}`);
        }

    } catch (error) {
        console.error(error);
        res.send('Gagal update tugas: ' + error.message);
    }
};

// Lihat Pengumpulan (Jawaban Siswa)
exports.halamanPengumpulan = async (req, res) => {
    const { id_tugas } = req.params;
    const guruId = req.session.user.id;

    try {
        const [tugas] = await db.query('SELECT * FROM tugas WHERE id = ?', [id_tugas]);
        const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [guruId]);

        const sql = `
            SELECT pengumpulan.*, siswa.nama_lengkap, siswa.nis,
                   DATE_FORMAT(pengumpulan.tanggal_kumpul, '%d %b %H:%i') as tgl_fmt,
                   pengumpulan.file_siswa,
                   pengumpulan.jawaban_json,
                   pengumpulan.is_edited,
                   pengumpulan.status_koreksi
            FROM pengumpulan
            JOIN siswa ON pengumpulan.siswa_id = siswa.id
            WHERE pengumpulan.tugas_id = ?
            ORDER BY pengumpulan.tanggal_kumpul DESC
        `;
        const [listKumpul] = await db.query(sql, [id_tugas]);

        res.render('guru/tugas/lihat_pengumpulan', {
            tugas: tugas[0], listKumpul: listKumpul, user: req.session.user, profil: guruRows[0], title: 'Penilaian Tugas'
        });
    } catch (error) { res.send('Error memuat pengumpulan.'); }
};

// Proses Nilai Tugas
exports.prosesNilaiTugas = async (req, res) => {
    const { id_pengumpulan } = req.params;
    const { nilai, komentar, id_tugas } = req.body;

    try {
        await db.query(`
            UPDATE pengumpulan SET nilai = ?, komentar_guru = ?, status_koreksi = 'Sudah' 
            WHERE id = ?
        `, [nilai, komentar, id_pengumpulan]);

        res.redirect(`/guru/tugas/lihat/${id_tugas}`);
    } catch (error) { res.send('Gagal menyimpan nilai.'); }
};

// ==========================================
// 4. FITUR JADWAL
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
