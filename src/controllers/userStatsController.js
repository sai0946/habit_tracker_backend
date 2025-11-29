const userStatsService = require('../services/userStatsService');

class UserStatsController {
  async getUserStats(req, res) {
    try {
      const userId = req.userId;
      const stats = await userStatsService.getUserStats(userId);
      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  }

  async getHabitProgress(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const progress = await userStatsService.getHabitProgress(id, userId);
      res.status(200).json({
        success: true,
        progress,
      });
    } catch (error) {
      if (error.message === 'Habit not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch habit progress' });
    }
  }
}

module.exports = new UserStatsController();
