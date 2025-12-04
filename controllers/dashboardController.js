const db = require('../config/database');

exports.index = async (req, res) => {
    // 1. Cek Login (Security)
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { id, role, username } = req.session.user;

    try {
        let dataUser = null;

        // 2. Ambil Data Profil Sesuai Role
        // ... import db di atas ...

        if (role === 'siswa') {
            // 1. Ambil Data Profil Siswa & Kelas
            const [rows] = await db.query(`
                SELECT siswa.*, kelas.nama_kelas, kelas.tingkat 
                FROM siswa 
                JOIN kelas ON siswa.kelas_id = kelas.id 
                WHERE siswa.user_id = ?`, [id]);
            
            dataUser = rows[0];
            const siswaId = dataUser.id;
            const kelasId = dataUser.kelas_id;

            // 2. Ambil Daftar Nilai Siswa Ini (Buat Tabel Laporan)
            const sqlNilai = `
                SELECT mapel.nama_mapel, guru.nama_lengkap as nama_guru, nilai.*
                FROM nilai
                JOIN mengajar ON nilai.mengajar_id = mengajar.id
                JOIN mapel ON mengajar.mapel_id = mapel.id
                JOIN guru ON mengajar.guru_id = guru.id
                WHERE nilai.siswa_id = ?
            `;
            const [nilaiList] = await db.query(sqlNilai, [siswaId]);

            // 3. Hitung Rata-Rata Nilai Diri Sendiri
            let totalNilaiSendiri = 0;
            nilaiList.forEach(n => totalNilaiSendiri += n.nilai_akhir);
            const rataRata = nilaiList.length > 0 ? (totalNilaiSendiri / nilaiList.length).toFixed(2) : 0;

            // 4. LOGIC RANKING KELAS (Simple Version)
            // Ambil total nilai semua siswa di kelas ini, urutkan dari yang terbesar
            const sqlRanking = `
                SELECT siswa_id, SUM(nilai_akhir) as total_score
                FROM nilai
                JOIN siswa ON nilai.siswa_id = siswa.id
                WHERE siswa.kelas_id = ?
                GROUP BY siswa_id
                ORDER BY total_score DESC
            `;
            const [rankingList] = await db.query(sqlRanking, [kelasId]);

            // Cari posisi (Ranking) siswa ini di dalam list
            // Kita tambah 1 karena array mulai dari 0 (Ranking 1 = index 0 + 1)
            let rankingKelas = '-';
            const posisi = rankingList.findIndex(item => item.siswa_id === siswaId);
            if (posisi !== -1) {
                rankingKelas = posisi + 1;
            }

            // 5. LOGIC JADWAL HARI INI
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const todayIndex = new Date().getDay(); // 0 = Minggu, 1 = Senin, dst.
            const hariIni = days[todayIndex]; 

            // Query Jadwal Khusus Hari Ini
            // Kita pake TIME_FORMAT biar jamnya cantik (07:00), gak ada detiknya
            const sqlJadwalHarian = `
                SELECT mapel.nama_mapel, guru.nama_lengkap, 
                       TIME_FORMAT(mengajar.jam_mulai, '%H:%i') as jam_mulai_fmt, 
                       TIME_FORMAT(mengajar.jam_selesai, '%H:%i') as jam_selesai_fmt
                FROM mengajar
                JOIN mapel ON mengajar.mapel_id = mapel.id
                JOIN guru ON mengajar.guru_id = guru.id
                JOIN tahun_ajaran ON mengajar.tahun_ajaran_id = tahun_ajaran.id
                WHERE mengajar.kelas_id = ? 
                  AND tahun_ajaran.status = 1 
                  AND mengajar.hari = ?
                ORDER BY mengajar.jam_mulai ASC
            `;
            const [jadwalHariIni] = await db.query(sqlJadwalHarian, [kelasId, hariIni]);

            // Render Dashboard Siswa (Jangan lupa kirim jadwalHariIni & hariIni)
            return res.render('dashboard/siswa', { 
                user: req.session.user, 
                profil: dataUser,
                nilaiList: nilaiList,
                statistik: {
                    rataRata: rataRata,
                    rankingKelas: rankingKelas,
                    totalSiswa: rankingList.length
                },
                jadwalHariIni: jadwalHariIni, 
                namaHari: hariIni             
            });

            } else if (role === 'guru') {
            // 1. Ambil Profil Guru
            const [guruRows] = await db.query('SELECT * FROM guru WHERE user_id = ?', [id]);
            if (guruRows.length === 0) return res.send('Error: Profil guru belum ada.');
            dataUser = guruRows[0];
            const guruId = dataUser.id;

            // 2. LOGIC HARI INI
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const todayIndex = new Date().getDay();
            const hariIni = days[todayIndex];

            // 3. Ambil Jadwal HANYA HARI INI
            const sqlJadwalToday = `
                SELECT 
                    mengajar.id as mengajar_id, 
                    kelas.nama_kelas, 
                    mapel.nama_mapel, 
                    mengajar.jam_mulai, 
                    mengajar.jam_selesai,
                    TIME_FORMAT(mengajar.jam_mulai, '%H:%i') as jam_mulai_fmt, 
                    TIME_FORMAT(mengajar.jam_selesai, '%H:%i') as jam_selesai_fmt
                FROM mengajar
                JOIN kelas ON mengajar.kelas_id = kelas.id
                JOIN mapel ON mengajar.mapel_id = mapel.id
                JOIN tahun_ajaran ON mengajar.tahun_ajaran_id = tahun_ajaran.id
                WHERE mengajar.guru_id = ? 
                  AND tahun_ajaran.status = 1 
                  AND mengajar.hari = ?
                ORDER BY mengajar.jam_mulai ASC
            `;
            const [jadwalToday] = await db.query(sqlJadwalToday, [guruId, hariIni]);

            // Render Dashboard Guru
            return res.render('dashboard/guru', { 
                user: req.session.user, 
                profil: dataUser,
                jadwalList: jadwalToday, // List sekarang isinya cuma jadwal hari ini
                hariIni: hariIni
            });

        } else if (role === 'admin') {

            const [rows] = await db.query('SELECT * FROM admin WHERE user_id = ?', [id]);
            dataUser = rows[0];

            // --- TAMBAHAN: HITUNG STATISTIK ---
            // Kita pakai Promise.all biar query jalan barengan (biar cepet)
            const [
                [siswaCount],
                [guruCount],
                [kelasCount],
                [mapelCount]
            ] = await Promise.all([
                db.query('SELECT COUNT(*) as total FROM siswa'),
                db.query('SELECT COUNT(*) as total FROM guru'),
                db.query('SELECT COUNT(*) as total FROM kelas'),
                db.query('SELECT COUNT(*) as total FROM mapel')
            ]);

            // Bungkus datanya
            const stats = {
                siswa: siswaCount[0].total,
                guru: guruCount[0].total,
                kelas: kelasCount[0].total,
                mapel: mapelCount[0].total
            };

            // Render Dashboard Admin dengan data stats
            return res.render('dashboard/admin', { 
                user: req.session.user, 
                profil: dataUser,
                stats: stats 
            });
        }

// ... kode bawah sama ...

    } catch (error) {
        console.error(error);
        res.send('Terjadi kesalahan mengambil data dashboard.');
    }
};