const db = require('../config/database');
const nodemailer = require('nodemailer');

// Konfigurasi Transporter Email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
}); 

// ==========================================
// 1. LIHAT INBOX (KOTAK MASUK)
// ==========================================
exports.inbox = async (req, res) => {
    try {
        // Ambil semua laporan, urutkan dari yang terbaru
        const sql = `SELECT * FROM laporan ORDER BY created_at DESC`;
        const [msgs] = await db.query(sql);
        
        res.render('admin/laporan/inbox', {
            title: 'Kotak Masuk & Pengaduan',
            user: req.session.user,
            pesanList: msgs
        });
    } catch (error) {
        console.error(error);
        res.send('Terjadi kesalahan saat memuat inbox.');
    }
};

// ==========================================
// 2. PROSES BALAS PESAN (SYSTEM RELAY)
// ==========================================
exports.balasPesan = async (req, res) => {
    const { id_laporan, email_tujuan, isi_balasan } = req.body;

    try {
        // A. Kirim Email Balasan ke User (Atas Nama Sistem)
        // Cek validitas email dulu
        if (email_tujuan && email_tujuan.includes('@') && email_tujuan !== 'undefined') {
            
            await transporter.sendMail({
                from: `"Layanan Sekolah" <${process.env.MAIL_USER}>`, 
                to: email_tujuan,
                
                // 🔥 JEBAKAN BATMAN: Kunci Siswa biar gak reply via Email
                // Alamat ini sengaja dibuat ngaco biar email mental (bounce)
                replyTo: 'noreply-system@sekolah.id', 
                
                subject: `Balasan: Laporan #${id_laporan}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h3 style="color: #2a5298;">Halo,</h3>
                        <p>Admin telah menanggapi laporan Anda:</p>
                        
                        <div style="background:#f0f8ff; padding:15px; border-left:4px solid #007bff; margin: 15px 0; font-style: italic;">
                            "${isi_balasan}"
                        </div>
                        
                        <br>
                        <hr style="border: 0; border-top: 1px solid #eee;">
                        
                        <p style="font-size: 12px; color: #dc3545; font-weight: bold;">
                            ⛔ PERHATIAN: Email ini dikirim otomatis oleh sistem.
                        </p>
                        <p style="font-size: 12px; color: #666;">
                            Mohon <strong>JANGAN MEMBALAS</strong> email ini secara langsung karena alamat ini tidak dipantau dan balasan Anda tidak akan terkirim.
                        </p>
                        <p style="font-size: 12px; color: #666;">
                            Jika Anda ingin menanggapi kembali, silakan buat laporan baru melalui menu <strong>Kontak Admin</strong> di Website Sekolah.
                        </p>
                    </div>
                `
            });
            console.log(`Email balasan terkirim ke: ${email_tujuan}`);
        } else {
            console.log("Email tujuan tidak valid atau kosong, hanya update database.");
        }

        // B. Update Database (Tandai sudah dibalas)
        // Simpan isi balasan dan waktu balas di database biar ada arsipnya
        await db.query(
            `UPDATE laporan SET status='Dibaca', balasan_admin=?, tanggal_balas=NOW() WHERE id=?`,
            [isi_balasan, id_laporan]
        );

        // C. Redirect Balik ke Inbox
        res.redirect('/admin/laporan');

    } catch (error) {
        console.error("Gagal membalas pesan:", error);
        res.send(`
            <script>
                alert("Gagal mengirim balasan. Error: ${error.message}");
                window.history.back();
            </script>
        `);
    }
};