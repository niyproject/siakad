const db = require('../config/database');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

// ==========================================
// 1. HALAMAN UTAMA (APPROVAL & HISTORY)
// ==========================================
exports.halamanApproval = async (req, res) => {
    try {
        // A. Ambil List Pending (Belum diapa-apain)
        const sqlPending = `
            SELECT tugas.*, guru.nama_lengkap as nama_guru, mapel.nama_mapel, kelas.nama_kelas
            FROM tugas
            JOIN mengajar ON tugas.mengajar_id = mengajar.id
            JOIN guru ON mengajar.guru_id = guru.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN kelas ON mengajar.kelas_id = kelas.id
            WHERE tugas.status_approval = 'Pending'
            ORDER BY tugas.created_at DESC
        `;
        const [pendingList] = await db.query(sqlPending);

        // B. Ambil List History (Sudah Online / Offline / Revisi)
        const sqlHistory = `
            SELECT tugas.*, guru.nama_lengkap as nama_guru, mapel.nama_mapel, kelas.nama_kelas
            FROM tugas
            JOIN mengajar ON tugas.mengajar_id = mengajar.id
            JOIN guru ON mengajar.guru_id = guru.id
            JOIN mapel ON mengajar.mapel_id = mapel.id
            JOIN kelas ON mengajar.kelas_id = kelas.id
            WHERE tugas.status_approval IN ('Online', 'Offline', 'Revisi')
            ORDER BY tugas.created_at DESC
        `;
        const [historyList] = await db.query(sqlHistory);

        res.render('admin/ujian/approval', {
            title: 'Validasi & Riwayat Ujian',
            user: req.session.user,
            pending: pendingList,
            history: historyList
        });
    } catch (error) {
        console.error(error);
        res.send('Error server approval.');
    }
};

// ==========================================
// 2. API GET DETAIL TUGAS (UNTUK MODAL PREVIEW)
// ==========================================
exports.getDetailTugas = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM tugas WHERE id = ?', [id]);
        if (rows.length === 0) return res.json({ error: 'Tugas tidak ditemukan' });
        
        const tugas = rows[0];
        // Parse soal JSON biar frontend tinggal render
        tugas.soal_list = JSON.parse(tugas.soal_json || '[]');
        
        res.json(tugas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal ambil data' });
    }
};

// ==========================================
// 3. ACTION: APPROVE ONLINE (SET DEADLINE)
// ==========================================
exports.approveOnline = async (req, res) => {
    const { id_tugas, deadline_baru } = req.body; // Ambil dari Form POST Modal
    
    try {
        await db.query(
            "UPDATE tugas SET status_approval = 'Online', deadline = ? WHERE id = ?", 
            [deadline_baru, id_tugas]
        );
        res.redirect('/admin/ujian/approval');
    } catch (error) {
        console.error(error);
        res.send('Gagal set online.');
    }
};

// ==========================================
// 4. ACTION: APPROVE OFFLINE (DOWNLOAD WORD)
// ==========================================
exports.approveOffline = async (req, res) => {
    const { id } = req.params;

    try {
        // A. Cek Status & Update ke Offline (Jika masih Pending)
        const [cek] = await db.query("SELECT status_approval FROM tugas WHERE id = ?", [id]);
        
        if (cek.length > 0 && cek[0].status_approval === 'Pending') {
            await db.query("UPDATE tugas SET status_approval = 'Offline' WHERE id = ?", [id]);
        }

        // B. Ambil Data Lengkap Soal
        const [rows] = await db.query(
            `SELECT tugas.*, mapel.nama_mapel, kelas.nama_kelas, guru.nama_lengkap 
             FROM tugas 
             JOIN mengajar ON tugas.mengajar_id = mengajar.id
             JOIN mapel ON mengajar.mapel_id = mapel.id
             JOIN kelas ON mengajar.kelas_id = kelas.id
             JOIN guru ON mengajar.guru_id = guru.id
             WHERE tugas.id = ?`, 
            [id]
        );

        if (rows.length === 0) return res.send('Data tugas tidak ditemukan.');

        const tugas = rows[0];
        const soalList = JSON.parse(tugas.soal_json || '[]');

        // C. Mulai Generate Dokumen Word
        const children = [];

        // --- Header Dokumen ---
        children.push(new Paragraph({
            children: [
                new TextRun({ 
                    text: `NASKAH SOAL ${tugas.tipe_tugas.toUpperCase()}`, 
                    bold: true, 
                    size: 32 // Ukuran font (half-points), 32 = 16pt
                })
            ],
            alignment: AlignmentType.CENTER,
        }));
        
        children.push(new Paragraph({ text: "" })); // Spasi Kosong

        // Info Sekolah / Mapel
        children.push(new Paragraph({ text: `Mata Pelajaran : ${tugas.nama_mapel}` }));
        children.push(new Paragraph({ text: `Kelas          : ${tugas.nama_kelas}` }));
        children.push(new Paragraph({ text: `Guru Pengampu  : ${tugas.nama_lengkap}` }));
        children.push(new Paragraph({ text: "__________________________________________________________________________" }));
        children.push(new Paragraph({ text: "" }));

        // --- Loop Soal ---
        soalList.forEach((soal, index) => {
            // 1. Teks Pertanyaan
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `${index + 1}. `, bold: true }),
                    new TextRun({ text: soal.pertanyaan })
                ]
            }));

            // 2. Opsi Jawaban (Jika PG)
            if (soal.tipe === 'pg' && soal.opsi) {
                Object.keys(soal.opsi).forEach(key => {
                    children.push(new Paragraph({
                        text: `    ${key}. ${soal.opsi[key]}`, // Indentasi manual pake spasi
                    }));
                });
            }
            
            // Jarak antar soal
            children.push(new Paragraph({ text: "" })); 
        });

        // D. Buat Dokumen
        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
        });

        // E. Generate Buffer & Kirim ke Browser
        const buffer = await Packer.toBuffer(doc);
        
        // Bersihkan nama file dari karakter aneh
        const safeFilename = `Soal_${tugas.nama_mapel}_${tugas.nama_kelas}`.replace(/[^a-z0-9]/gi, '_');

        res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.send('Gagal generate dokumen Word.');
    }
};

// ==========================================
// 5. ACTION: MINTA REVISI (KEMBALIKAN KE GURU)
// ==========================================
exports.mintaRevisi = async (req, res) => {
    const { id_tugas, catatan } = req.body;
    
    try {
        await db.query(
            "UPDATE tugas SET status_approval = 'Revisi', catatan_revisi = ? WHERE id = ?", 
            [catatan, id_tugas]
        );
        res.redirect('/admin/ujian/approval');
    } catch (error) {
        console.error(error);
        res.send('Gagal mengirim permintaan revisi.');
    }
};