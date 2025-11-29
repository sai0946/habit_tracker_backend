const express = require('express');
const habitController = require('../controllers/habitController');
const trackingController = require('../controllers/trackingController');
const userStatsController = require('../controllers/userStatsController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// All habit routes are protected
router.use(verifyToken);

// Habit management routes
router.post('/', habitController.createHabit.bind(habitController));
router.get('/', habitController.getHabits.bind(habitController));
router.get('/:id', habitController.getHabitById.bind(habitController));
router.put('/:id', habitController.updateHabit.bind(habitController));
router.delete('/:id', habitController.deleteHabit.bind(habitController));

// Tracking routes
router.post('/:id/track', trackingController.trackHabit.bind(trackingController));
router.get('/:id/history', trackingController.getHabitHistory.bind(trackingController));
router.delete('/:id/track', trackingController.removeTracking.bind(trackingController));

// User stats routes
router.get('/:id/progress', userStatsController.getHabitProgress.bind(userStatsController));

module.exports = router;
