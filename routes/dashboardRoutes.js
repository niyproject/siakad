const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Satu rute, logic-nya di controller
router.get('/', dashboardController.index);

module.exports = router;