const trackingService = require('../services/trackingService');

class TrackingController {
  async trackHabit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const trackingLog = await trackingService.trackHabit(id, userId);
      res.status(201).json({
        success: true,
        message: 'Habit tracked successfully',
        trackingLog,
      });
    } catch (error) {
      if (error.message === 'Habit not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Habit already tracked for today') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to track habit' });
    }
  }

  async getHabitHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const days = parseInt(req.query.days) || 7;

      const history = await trackingService.getHabitHistory(id, userId, days);
      const streak = await trackingService.calculateStreak(id, userId);

      res.status(200).json({
        success: true,
        history,
        streak,
        days,
      });
    } catch (error) {
      if (error.message === 'Habit not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch habit history' });
    }
  }

  async removeTracking(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      await trackingService.removeTrackingLog(id, userId, date);
      res.status(200).json({
        success: true,
        message: 'Tracking log removed successfully',
      });
    } catch (error) {
      if (error.message === 'Tracking log not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to remove tracking log' });
    }
  }
}

module.exports = new TrackingController();
