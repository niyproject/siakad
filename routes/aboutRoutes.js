const express = require('express');
const router = express.Router();
const aboutController = require('../controllers/aboutController');

// Rute Publik (Bisa diakses siapa saja)
router.get('/', aboutController.index);

module.exports = router;