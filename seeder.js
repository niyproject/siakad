const db = require('./config/database');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        console.log('🌱 Mulai menanam data dummy...');

        // 1. DATA ADMIN
        // Username: admin01, Pass: admin123
        const passAdmin = await bcrypt.hash('admin123', 10);
        const [adminUser] = await db.query(
            `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
            ['admin01', passAdmin, 'admin']
        );
        await db.query(
            `INSERT INTO admin (user_id, nama_lengkap) VALUES (?, ?)`,
            [adminUser.insertId, 'Admin Utama']
        );
        console.log('✅ Admin dibuat (User: admin01 / Pass: admin123)');

        // 2. DATA KELAS & TAHUN AJARAN
        const [thn] = await db.query(`INSERT INTO tahun_ajaran (tahun, semester, status) VALUES ('2024/2025', 'Ganjil', 1)`);
        const [kls] = await db.query(`INSERT INTO kelas (nama_kelas, tingkat) VALUES ('X-RPL-1', 10)`);
        
        // 3. DATA GURU
        // NIP: 19850101, Tgl Lahir: 1985-01-01 -> Pass: 19850101
        const passGuru = await bcrypt.hash('19850101', 10); 
        const [guruUser] = await db.query(
            `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
            ['19850101', passGuru, 'guru']
        );
        await db.query(
            `INSERT INTO guru (user_id, nip, nama_lengkap, tanggal_lahir, jenis_kelamin) VALUES (?, ?, ?, ?, ?)`,
            [guruUser.insertId, '19850101', 'Budi Santoso, S.Kom', '1985-01-01', 'L']
        );
        console.log('✅ Guru dibuat (NIP: 19850101 / Pass: 19850101)');

        // 4. DATA SISWA
        // NIS: 12345, Tgl Lahir: 2009-05-20 -> Pass: 20090520
        const passSiswa = await bcrypt.hash('20090520', 10);
        const [siswaUser] = await db.query(
            `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
            ['12345', passSiswa, 'siswa']
        );
        await db.query(
            `INSERT INTO siswa (user_id, kelas_id, nis, nama_lengkap, tanggal_lahir, jenis_kelamin) VALUES (?, ?, ?, ?, ?, ?)`,
            [siswaUser.insertId, kls.insertId, '12345', 'Ahmad Jago Coding', '2009-05-20', 'L']
        );
        console.log('✅ Siswa dibuat (NIS: 12345 / Pass: 20090520)');

        console.log('🎉 SELESAI! Tekan Ctrl + C untuk keluar.');
        process.exit();

    } catch (error) {
        console.error('❌ Gagal:', error);
        process.exit(1);
    }
};

seedData();