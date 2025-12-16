const db = require('../config/database');

exports.index = async (req, res) => {
    const user = req.session.user || null;
    let profil = null;

    // Kalau user sedang login, kita perlu data profil buat sidebar
    if (user) {
        try {
            if (user.role === 'siswa') {
                const [rows] = await db.query('SELECT * FROM siswa WHERE user_id = ?', [user.id]);
                profil = rows[0];
            } else if (user.role === 'guru') {
                const [rows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [user.id]);
                profil = rows[0];
            }
            // Admin tidak butuh query profil tambahan karena datanya sudah ada di session/sidebar standar
        } catch (error) {
            console.error("Gagal ambil profil about:", error);
        }
    }

    res.render('about', {
        title: 'Tentang Aplikasi',
        user: user,
        profil: profil
    });
};