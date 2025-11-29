const pool = require('../config/database');

class UserStatsService {
  async getUserStats(userId) {
    try {
      // Get total habits count
      const habitsResult = await pool.query('SELECT COUNT(*) as count FROM habits WHERE user_id = $1', [
        userId,
      ]);
      const totalHabits = parseInt(habitsResult.rows[0].count);

      // Get total unique days tracked
      const daysResult = await pool.query(
        'SELECT COUNT(DISTINCT completed_date) as count FROM tracking_logs WHERE user_id = $1',
        [userId]
      );
      const totalDaysTracked = parseInt(daysResult.rows[0].count);

      // Get longest streak across all habits
      const streaksResult = await pool.query('SELECT id FROM habits WHERE user_id = $1', [userId]);
      let longestStreak = 0;

      for (const habit of streaksResult.rows) {
        const trackingService = require('./trackingService');
        const streak = await trackingService.calculateStreak(habit.id, userId);
        if (streak > longestStreak) {
          longestStreak = streak;
        }
      }

      // Get habits by frequency
      const frequencyResult = await pool.query(
        'SELECT frequency, COUNT(*) as count FROM habits WHERE user_id = $1 GROUP BY frequency',
        [userId]
      );
      const habitsByFrequency = {};
      frequencyResult.rows.forEach((row) => {
        habitsByFrequency[row.frequency] = parseInt(row.count);
      });

      return {
        totalHabits,
        totalDaysTracked,
        longestStreak,
        habitsByFrequency,
      };
    } catch (error) {
      throw error;
    }
  }

  async getHabitProgress(habitId, userId) {
    try {
      // Get habit with goal
      const habitResult = await pool.query(
        'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
        [habitId, userId]
      );

      if (habitResult.rows.length === 0) {
        throw new Error('Habit not found');
      }

      const habit = habitResult.rows[0];

      // Get this week's completion count (Monday to today)
      const today = new Date();
      const currentDay = today.getDay();
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const mondayDate = new Date(today.setDate(diff));
      const monday = mondayDate.toISOString().split('T')[0];

      const weekResult = await pool.query(
        'SELECT COUNT(*) as count FROM tracking_logs WHERE habit_id = $1 AND completed_date >= $2',
        [habitId, monday]
      );
      const weekCompleted = parseInt(weekResult.rows[0].count);

      // Get monthly completion count
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const monthResult = await pool.query(
        `SELECT COUNT(*) as count FROM tracking_logs WHERE habit_id = $1 
         AND EXTRACT(YEAR FROM completed_date) = $2 
         AND EXTRACT(MONTH FROM completed_date) = $3`,
        [habitId, currentYear, currentMonth]
      );
      const monthCompleted = parseInt(monthResult.rows[0].count);

      // Get current streak
      const trackingService = require('./trackingService');
      const currentStreak = await trackingService.calculateStreak(habitId, userId);

      // Calculate completion percentage
      const totalDaysTrackedResult = await pool.query(
        'SELECT COUNT(*) as count FROM tracking_logs WHERE habit_id = $1',
        [habitId]
      );
      const totalTracked = parseInt(totalDaysTrackedResult.rows[0].count);

      return {
        habitId,
        title: habit.title,
        frequency: habit.frequency,
        goal: habit.goal || null,
        weeklyCompleted: weekCompleted,
        monthlyCompleted: monthCompleted,
        currentStreak,
        totalCompleted: totalTracked,
        completionPercentage: 0, // Will be calculated if goal is set
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserStatsService();
