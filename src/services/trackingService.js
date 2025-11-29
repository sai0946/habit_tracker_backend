const pool = require('../config/database');
const dayjs = require('dayjs');

class TrackingService {
  async trackHabit(habitId, userId) {
    try {
      // Check if habit exists and belongs to user
      const habitCheck = await pool.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [habitId, userId]);
      if (habitCheck.rows.length === 0) {
        throw new Error('Habit not found');
      }

      const today = dayjs().format('YYYY-MM-DD');

      // Check if already tracked today
      const existingTrack = await pool.query(
        'SELECT id FROM tracking_logs WHERE habit_id = $1 AND completed_date = $2',
        [habitId, today]
      );
      if (existingTrack.rows.length > 0) {
        throw new Error('Habit already tracked for today');
      }

      // Create tracking log
      const result = await pool.query(
        'INSERT INTO tracking_logs (habit_id, user_id, completed_date) VALUES ($1, $2, $3) RETURNING *',
        [habitId, userId, today]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getHabitHistory(habitId, userId, days = 7) {
    try {
      // Check if habit exists and belongs to user
      const habitCheck = await pool.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [habitId, userId]);
      if (habitCheck.rows.length === 0) {
        throw new Error('Habit not found');
      }

      const startDate = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
      const endDate = dayjs().format('YYYY-MM-DD');

      const result = await pool.query(
        'SELECT * FROM tracking_logs WHERE habit_id = $1 AND completed_date BETWEEN $2 AND $3 ORDER BY completed_date DESC',
        [habitId, startDate, endDate]
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async calculateStreak(habitId, userId) {
    try {
      // Get all tracking logs sorted by date (newest first)
      const result = await pool.query(
        'SELECT completed_date FROM tracking_logs WHERE habit_id = $1 AND user_id = $2 ORDER BY completed_date DESC',
        [habitId, userId]
      );

      if (result.rows.length === 0) {
        return 0;
      }

      let streak = 0;
      let currentDate = dayjs();

      for (const log of result.rows) {
        const logDate = dayjs(log.completed_date);

        // Check if log is from today or yesterday
        if (currentDate.diff(logDate, 'day') === streak) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      throw error;
    }
  }

  async getStreakForAllUserHabits(userId) {
    try {
      const habits = await pool.query('SELECT id FROM habits WHERE user_id = $1', [userId]);

      const streaks = {};
      for (const habit of habits.rows) {
        streaks[habit.id] = await this.calculateStreak(habit.id, userId);
      }

      return streaks;
    } catch (error) {
      throw error;
    }
  }

  async removeTrackingLog(habitId, userId, date) {
    try {
      const result = await pool.query(
        'DELETE FROM tracking_logs WHERE habit_id = $1 AND user_id = $2 AND completed_date = $3 RETURNING id',
        [habitId, userId, date]
      );

      if (result.rows.length === 0) {
        throw new Error('Tracking log not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TrackingService();
