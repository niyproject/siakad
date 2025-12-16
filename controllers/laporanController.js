const db = require('../config/database');
const nodemailer = require('nodemailer');

// Konfigurasi Email Sistem
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});
 
// --- HELPER: Notifikasi ke Admin (JALUR BUNTU) ---
const notifAdmin = async (subjek, nama) => {
    try {
        // Ganti URL ini dengan alamat server nanti pas production
        const dashboardLink = "http://localhost:3000/admin/laporan";

        await transporter.sendMail({
            from: `"Sistem Notifikasi" <${process.env.MAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            
            // 🔥 JEBAKAN: Alamat palsu biar Admin gak reply disini
            replyTo: 'noreply-system@sekolah.id', 
            
            subject: `[Laporan Baru] ${subjek}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h3 style="color: #2a5298;">🔔 Laporan Baru Masuk</h3>
                    <p>Halo Admin, ada pesan baru dari user <strong>${nama}</strong>.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0;">
                        <strong>Subjek:</strong> ${subjek}
                    </div>

                    <p style="color: red; font-weight: bold;">
                        ⚠️ PENTING: JANGAN BALAS EMAIL INI LANGSUNG!
                    </p>
                    <p>Balasan via email tidak akan terkirim. Gunakan tombol di bawah untuk membalas:</p>

                    <br>
                    <a href="${dashboardLink}" style="background-color: #2a5298; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        👉 BALAS VIA DASHBOARD
                    </a>
                </div>
            `
        });
        console.log("Notifikasi terkirim ke Admin.");
    } catch (e) { 
        console.log("Gagal notif admin:", e.message); 
    }
};

// =======================
// FITUR TAMU (PUBLIC)
// =======================
exports.halamanKontakPublik = (req, res) => {
    res.render('laporan/public_kontak', {
        title: 'Hubungi Admin (Tamu)',
        user: null // Tidak ada user login
    });
};

exports.kirimLaporanPublik = async (req, res) => {
    // Ambil data manual dari form tamu
    const { nama, email, subjek, pesan } = req.body;

    try {
        // 1. Simpan ke Database (user_id NULL karena tamu)
        await db.query(
            `INSERT INTO laporan (user_id, nama_pengirim, email_pengirim, subjek, kategori, pesan) 
             VALUES (NULL, ?, ?, ?, 'Lainnya', ?)`,
            [nama, email, subjek, pesan]
        );
        
        // 2. Kirim Notif ke Admin
        notifAdmin(subjek, nama);

        res.send(`
            <script>
                alert("Pesan terkirim! Admin akan membalas ke email Anda (${email}).");
                window.location.href = "/";
            </script>
        `);

    } catch (error) {
        console.error("Error Public:", error);
        res.send(`<script>alert("Gagal mengirim pesan."); window.history.back();</script>`);
    }
};

// =======================
// FITUR MEMBER (LOGIN)
// =======================
exports.halamanKontak = async (req, res) => {
    let user = req.session.user;
    let profil = null;

    // Ambil profil buat sidebar
    if (user.role === 'siswa') {
        const [rows] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [user.id]);
        profil = rows[0];
    } else if (user.role === 'guru') {
        const [rows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [user.id]);
        profil = rows[0];
    } 

    res.render('laporan/kontak', {
        title: 'Hubungi Admin',
        user: user,
        profil: profil
    });
};

exports.kirimLaporan = async (req, res) => {
    const { subjek, kategori, pesan } = req.body;
    const user = req.session.user;
    
    try {
        // Simpan User ID dan Nama (Email dikosongin dulu gpp, nanti admin balas via notif sistem)
        await db.query(
            `INSERT INTO laporan (user_id, nama_pengirim, email_pengirim, subjek, kategori, pesan) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user.id, user.username, '', subjek, kategori, pesan]
        );

        // Notif Admin
        notifAdmin(subjek, user.username);

        res.send(`
            <script>
                alert("Laporan berhasil dikirim ke Admin!");
                window.location.href = "/dashboard";
            </script>
        `);

    } catch (error) {
        console.error("Error Member:", error);
        res.send(`<script>alert("Gagal kirim laporan."); window.history.back();</script>`);
    }
};