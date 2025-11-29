const habitService = require('../services/habitService');
const trackingService = require('../services/trackingService');

class HabitController {
  async createHabit(req, res) {
    try {
      const { title, description, frequency, tags, reminder_time, goal } = req.body;
      const userId = req.userId;

      // Validation
      if (!title || !frequency) {
        return res.status(400).json({ error: 'Title and frequency are required' });
      }

      if (!['daily', 'weekly'].includes(frequency)) {
        return res.status(400).json({ error: 'Frequency must be "daily" or "weekly"' });
      }

      const habit = await habitService.createHabit(userId, title, description, frequency, tags, reminder_time, goal);
      res.status(201).json({
        success: true,
        message: 'Habit created successfully',
        habit,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create habit' });
    }
  }

  async getHabits(req, res) {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;
      const tag = req.query.tag || null;

      const habits = await habitService.getHabitsByUserId(userId, limit, offset, tag);
      const totalHabits = await habitService.getHabitCountByUserId(userId);

      res.status(200).json({
        success: true,
        habits,
        pagination: {
          total: totalHabits,
          page,
          limit,
          totalPages: Math.ceil(totalHabits / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch habits' });
    }
  }

  async getHabitById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const habit = await habitService.getHabitById(id, userId);
      const streak = await trackingService.calculateStreak(id, userId);

      // Calculate completion percentage if goal is set
      let completionPercentage = null;
      if (habit.goal) {
        const result = await require('pg').query(
          'SELECT COUNT(*) as count FROM tracking_logs WHERE habit_id = $1',
          [id]
        );
        const totalCompleted = parseInt(result.rows[0].count);
        completionPercentage = Math.round((totalCompleted / habit.goal) * 100);
      }

      res.status(200).json({
        success: true,
        habit: {
          ...habit,
          streak,
          completionPercentage,
        },
      });
    } catch (error) {
      if (error.message === 'Habit not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch habit' });
    }
  }

  async updateHabit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No data to update' });
      }

      const habit = await habitService.updateHabit(id, userId, updateData);
      res.status(200).json({
        success: true,
        message: 'Habit updated successfully',
        habit,
      });
    } catch (error) {
      if (error.message === 'Habit not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update habit' });
    }
  }

  async deleteHabit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      await habitService.deleteHabit(id, userId);
      res.status(200).json({
        success: true,
        message: 'Habit deleted successfully',
      });
    } catch (error) {
      if (error.message === 'Habit not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete habit' });
    }
  }
}

module.exports = new HabitController();
