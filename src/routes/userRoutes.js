const express = require('express');
const userStatsController = require('../controllers/userStatsController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// All user routes are protected
router.use(verifyToken);

// User stats routes
router.get('/stats', userStatsController.getUserStats.bind(userStatsController));

module.exports = router;
