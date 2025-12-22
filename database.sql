/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.1.2-MariaDB, for Android (aarch64)
--
-- Host: localhost    Database: db_siakad
-- ------------------------------------------------------
-- Server version	12.1.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `absensi`
--

DROP TABLE IF EXISTS `absensi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `absensi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mengajar_id` int(11) NOT NULL,
  `siswa_id` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `waktu_scan` time DEFAULT NULL,
  `status` enum('H','I','S','A') DEFAULT 'A',
  `keterangan` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `mengajar_id` (`mengajar_id`),
  KEY `siswa_id` (`siswa_id`),
  CONSTRAINT `1` FOREIGN KEY (`mengajar_id`) REFERENCES `mengajar` (`id`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `absensi`
--

LOCK TABLES `absensi` WRITE;
/*!40000 ALTER TABLE `absensi` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `absensi` VALUES
(3,11,7,'2025-12-01','13:08:54','H',NULL,'2025-12-01 06:08:54'),
(4,11,7,'2025-12-02','03:06:52','H',NULL,'2025-12-01 20:06:52'),
(5,11,7,'2025-12-07','17:31:54','H',NULL,'2025-12-07 10:31:54'),
(6,13,7,'2025-12-07','17:32:40','H',NULL,'2025-12-07 10:32:40');
/*!40000 ALTER TABLE `absensi` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `foto_profil` varchar(255) DEFAULT 'default.png',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin`
--

LOCK TABLES `admin` WRITE;
/*!40000 ALTER TABLE `admin` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `admin` VALUES
(1,1,'Admin Utama','default.png'),
(4,22,'admin tu','default.png'),
(5,23,'ketua yayasan','default.png');
/*!40000 ALTER TABLE `admin` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `guru`
--

DROP TABLE IF EXISTS `guru`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `guru` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `nip` varchar(20) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `tempat_lahir` varchar(50) DEFAULT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('L','P') DEFAULT NULL,
  `foto_profil` varchar(255) DEFAULT 'default.png',
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nip` (`nip`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guru`
--

LOCK TABLES `guru` WRITE;
/*!40000 ALTER TABLE `guru` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `guru` VALUES
(4,12,'101010','Budi Santoso S.Id','Jayapura','2000-01-01','L','GURU-1765881674864.jpg','2025-12-16 10:41:14'),
(5,13,'202020','Nana Mirdad S.Co','Malang','2002-02-02','P','default.png',NULL),
(6,14,'303030','Budi Siregar S.Od','Sumedang','2000-03-03','L','default.png',NULL);
/*!40000 ALTER TABLE `guru` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `kelas`
--

DROP TABLE IF EXISTS `kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kelas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama_kelas` varchar(20) NOT NULL,
  `tingkat` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kelas`
--

LOCK TABLES `kelas` WRITE;
/*!40000 ALTER TABLE `kelas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `kelas` VALUES
(5,'MTs I',7),
(6,'MTs II',8),
(7,'MTs III',9),
(8,'MA I',10);
/*!40000 ALTER TABLE `kelas` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `laporan`
--

DROP TABLE IF EXISTS `laporan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `laporan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `subjek` varchar(150) NOT NULL,
  `kategori` enum('Akademik','Teknis','Lainnya') DEFAULT 'Lainnya',
  `pesan` text NOT NULL,
  `status` enum('Terkirim','Dibaca') DEFAULT 'Terkirim',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `nama_pengirim` varchar(100) DEFAULT NULL,
  `email_pengirim` varchar(100) DEFAULT NULL,
  `balasan_admin` text DEFAULT NULL,
  `tanggal_balas` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `laporan`
--

LOCK TABLES `laporan` WRITE;
/*!40000 ALTER TABLE `laporan` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `laporan` VALUES
(1,NULL,'lupa password','Lainnya','yaa gitu lahh','Dibaca','2025-12-09 10:38:12','niyy','doubledotslashh@gmail.com','oke siap\r\n','2025-12-09 10:41:36'),
(2,NULL,'min gw lupa password min','Lainnya','gw lupa password min','Terkirim','2025-12-16 11:02:25','niy','niyproject.id@gmail.com',NULL,NULL);
/*!40000 ALTER TABLE `laporan` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `mapel`
--

DROP TABLE IF EXISTS `mapel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mapel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kode_mapel` varchar(20) NOT NULL,
  `nama_mapel` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kode_mapel` (`kode_mapel`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mapel`
--

LOCK TABLES `mapel` WRITE;
/*!40000 ALTER TABLE `mapel` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `mapel` VALUES
(6,'MPL','MPL'),
(7,'MPLL','MPLL'),
(8,'MPLLL','MPLLL');
/*!40000 ALTER TABLE `mapel` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `materi`
--

DROP TABLE IF EXISTS `materi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `materi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `guru_id` int(11) NOT NULL,
  `mapel_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `judul` varchar(255) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `guru_id` (`guru_id`),
  KEY `mapel_id` (`mapel_id`),
  CONSTRAINT `1` FOREIGN KEY (`guru_id`) REFERENCES `guru` (`id`),
  CONSTRAINT `2` FOREIGN KEY (`mapel_id`) REFERENCES `mapel` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materi`
--

LOCK TABLES `materi` WRITE;
/*!40000 ALTER TABLE `materi` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `materi` VALUES
(3,4,6,5,'contoh artikel','silahkan di\r\nbaca. untuk pertemuan ke 14','MATERI-1765882507818-817463075.pdf','2025-12-16 10:55:07');
/*!40000 ALTER TABLE `materi` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `mengajar`
--

DROP TABLE IF EXISTS `mengajar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mengajar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `guru_id` int(11) NOT NULL,
  `mapel_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `tahun_ajaran_id` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') DEFAULT NULL,
  `jam_mulai` time DEFAULT NULL,
  `jam_selesai` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `guru_id` (`guru_id`),
  KEY `mapel_id` (`mapel_id`),
  KEY `kelas_id` (`kelas_id`),
  KEY `tahun_ajaran_id` (`tahun_ajaran_id`),
  CONSTRAINT `1` FOREIGN KEY (`guru_id`) REFERENCES `guru` (`id`),
  CONSTRAINT `2` FOREIGN KEY (`mapel_id`) REFERENCES `mapel` (`id`),
  CONSTRAINT `3` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id`),
  CONSTRAINT `4` FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mengajar`
--

LOCK TABLES `mengajar` WRITE;
/*!40000 ALTER TABLE `mengajar` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `mengajar` VALUES
(10,6,7,5,2,'Minggu','09:30:00','10:45:00'),
(11,4,6,5,2,'Minggu','07:30:00','09:00:00'),
(12,6,7,5,2,'Minggu','10:45:00','12:00:00'),
(13,4,6,6,2,'Minggu','07:30:00','09:00:00'),
(14,5,8,7,2,'Minggu','07:30:00','09:30:00');
/*!40000 ALTER TABLE `mengajar` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `nilai`
--

DROP TABLE IF EXISTS `nilai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nilai` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mengajar_id` int(11) NOT NULL,
  `siswa_id` int(11) NOT NULL,
  `uh1` float DEFAULT 0,
  `uh2` float DEFAULT 0,
  `uh3` float DEFAULT 0,
  `uts` float DEFAULT 0,
  `uas` float DEFAULT 0,
  `nilai_akhir` float DEFAULT 0,
  `deskripsi` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mengajar_id` (`mengajar_id`),
  KEY `siswa_id` (`siswa_id`),
  CONSTRAINT `1` FOREIGN KEY (`mengajar_id`) REFERENCES `mengajar` (`id`),
  CONSTRAINT `2` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nilai`
--

LOCK TABLES `nilai` WRITE;
/*!40000 ALTER TABLE `nilai` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `nilai` VALUES
(1,11,7,0,0,0,0,0,0,NULL),
(2,11,8,0,0,0,0,0,0,NULL);
/*!40000 ALTER TABLE `nilai` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `pengumpulan`
--

DROP TABLE IF EXISTS `pengumpulan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pengumpulan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tugas_id` int(11) NOT NULL,
  `siswa_id` int(11) NOT NULL,
  `file_siswa` varchar(255) DEFAULT NULL,
  `catatan_siswa` text DEFAULT NULL,
  `nilai` float DEFAULT 0,
  `komentar_guru` text DEFAULT NULL,
  `tanggal_kumpul` timestamp NULL DEFAULT current_timestamp(),
  `jawaban_json` longtext DEFAULT NULL,
  `is_edited` tinyint(1) DEFAULT 0,
  `status_koreksi` enum('Belum','Sudah') DEFAULT 'Belum',
  PRIMARY KEY (`id`),
  KEY `tugas_id` (`tugas_id`),
  KEY `siswa_id` (`siswa_id`),
  CONSTRAINT `1` FOREIGN KEY (`tugas_id`) REFERENCES `tugas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pengumpulan`
--

LOCK TABLES `pengumpulan` WRITE;
/*!40000 ALTER TABLE `pengumpulan` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `pengumpulan` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `siswa`
--

DROP TABLE IF EXISTS `siswa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `siswa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `kelas_id` int(11) NOT NULL,
  `nis` varchar(20) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `tempat_lahir` varchar(50) DEFAULT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('L','P') DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `foto_profil` varchar(255) DEFAULT 'default.png',
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nis` (`nis`),
  KEY `user_id` (`user_id`),
  KEY `kelas_id` (`kelas_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa`
--

LOCK TABLES `siswa` WRITE;
/*!40000 ALTER TABLE `siswa` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `siswa` VALUES
(7,15,5,'010101','LK I','Jayapura','2001-01-01','L','','PROFIL-1765871690844.png','2025-12-16 07:54:50'),
(8,16,5,'011011011','PR I','Malang','2001-01-01','P','','default.png',NULL),
(9,17,6,'020202','LK II','Malang','2002-02-02','L','','default.png',NULL),
(10,18,6,'022022022','PR II','Sumedang','2002-02-02','P','','default.png',NULL),
(11,19,7,'030303','LK III','Sumedang','2003-03-03','L','','default.png',NULL),
(12,20,7,'033033033','PR III','Sumedang','2003-03-03','P','','default.png',NULL);
/*!40000 ALTER TABLE `siswa` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `tahun_ajaran`
--

DROP TABLE IF EXISTS `tahun_ajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tahun_ajaran` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tahun` varchar(20) NOT NULL,
  `semester` enum('Ganjil','Genap') NOT NULL,
  `status` tinyint(1) DEFAULT 0,
  `tampilkan_uts` tinyint(1) DEFAULT 0,
  `tampilkan_uas` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tahun_ajaran`
--

LOCK TABLES `tahun_ajaran` WRITE;
/*!40000 ALTER TABLE `tahun_ajaran` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `tahun_ajaran` VALUES
(2,'2025/2026','Genap',1,0,0);
/*!40000 ALTER TABLE `tahun_ajaran` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `tugas`
--

DROP TABLE IF EXISTS `tugas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tugas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mengajar_id` int(11) NOT NULL,
  `judul` varchar(200) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `tipe_tugas` enum('Tugas Harian','PR','UTS','UAS','Proyek') NOT NULL,
  `file_guru` varchar(255) DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `soal_json` longtext DEFAULT NULL,
  `status_approval` enum('Direct','Pending','Online','Offline','Revisi') DEFAULT 'Direct',
  `catatan_revisi` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mengajar_id` (`mengajar_id`),
  CONSTRAINT `1` FOREIGN KEY (`mengajar_id`) REFERENCES `mengajar` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tugas`
--

LOCK TABLES `tugas` WRITE;
/*!40000 ALTER TABLE `tugas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `tugas` VALUES
(25,14,'uts','','UTS',NULL,NULL,'2025-12-16 11:09:57',NULL,'Offline','pilihan kurang banyak\r\n');
/*!40000 ALTER TABLE `tugas` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','guru','siswa') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_super_admin` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,'niyproject','$2b$10$JeLulQ3DePAh6rgh0IfSvuQ/B8HPbVSINPxkxrQpHuLYDVJLOVB7y','admin','2025-11-29 07:42:52',1),
(12,'101010','$2b$10$D338kNnf3TG18quSP9GZW.eRa2g8dqj6trS5NoKhMRGEnZp9lUaSu','guru','2025-11-30 07:07:37',0),
(13,'202020','$2b$10$TrIncGYmRGgMrhCRSbL1j.7vgaKkDunxR8jUiUwV3qa/03h.dtWl.','guru','2025-11-30 07:08:56',0),
(14,'303030','$2b$10$N5L9B3sz3e1jznixna86QOvTwwalGcrzHMFRz1Bq8F9ss7LcOibtC','guru','2025-11-30 07:10:12',0),
(15,'010101','$2b$10$59RcKUpAYdYFoMJGbwleC.Y2YED3NeP9S8ehIPn14vVRuKg9cJ1QS','siswa','2025-11-30 07:12:22',0),
(16,'011011011','$2b$10$hQOhUOpBJIZpQwpow9hU4uHjmRDCCJRQMFhoOm4wRwj55QEBuiLcq','siswa','2025-11-30 07:14:43',0),
(17,'020202','$2b$10$CDPD6G9lj0tNmWzhN4pPeue4JNWc16Z01qkKriMcoeHQQwDW8yMGe','siswa','2025-11-30 07:15:36',0),
(18,'022022022','$2b$10$yHfMcTp6DOSR9A0UB8tQKeRiSlqSO1gnUFt9N.GkPxhva8zvVk.RW','siswa','2025-11-30 07:17:11',0),
(19,'030303','$2b$10$sthEImXlom6b03/U7pIQOOU6bUVcd5bjuUsrMUKVNM2Z39leqhApq','siswa','2025-11-30 07:18:21',0),
(20,'033033033','$2b$10$YceuBZuXXJpP85NO91zhKedxBmMzRYG5KgsI/5qgkkOYhra..OdCW','siswa','2025-11-30 07:19:55',0),
(22,'admintu','$2b$10$sdkEOSePKsA21W4msScbietGOz1zYTD5wKCU8VtOz20zpgRTlps8e','admin','2025-12-16 09:26:03',0),
(23,'admin_ky','$2b$10$Y5prYXXAAY9TjyQaZgkoyurPEAGtFlbNzbd1WfMc1oajicieEZiWq','admin','2025-12-16 10:13:00',0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-12-18 14:32:00
