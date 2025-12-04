const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Fungsi buat bikin folder kalau belum ada
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Cek asal upload dari mana (field name di form HTML)
        let folder = 'public/uploads/lainnya/';
        
        if (file.fieldname === 'foto') { 
            folder = 'public/uploads/profil/'; // Buat Profil
        } else if (file.fieldname === 'file_tugas') {
            folder = 'public/uploads/tugas/';  // Buat Tugas (Guru & Siswa)
        }

        ensureDir(folder); // Pastikan folder ada
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        // Format: Tipe-UserID-Timestamp.ext
        // Contoh: tugas-15-18239123.pdf
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Filter File (Boleh Gambar & PDF/Word/Excel)
const fileFilter = (req, file, cb) => {
    // Profil cuma boleh gambar
    if (file.fieldname === 'foto') {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Hanya boleh upload gambar!'), false);
        }
    }
    // Tugas boleh dokumen
    if (file.fieldname === 'file_tugas') {
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/)) {
            return cb(new Error('Format file tidak didukung!'), false);
        }
    }
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit naik jadi 5MB buat tugas
    fileFilter: fileFilter
});

module.exports = upload;