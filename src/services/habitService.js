const pool = require('../config/database');
const dayjs = require('dayjs');

class HabitService {
  async createHabit(userId, title, description, frequency, tags = null, reminderTime = null, goal = null) {
    try {
      const result = await pool.query(
        'INSERT INTO habits (user_id, title, description, frequency, tags, reminder_time, goal) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [userId, title, description, frequency, tags, reminderTime, goal]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getHabitsByUserId(userId, limit = 10, offset = 0, tag = null) {
    try {
      let query = 'SELECT * FROM habits WHERE user_id = $1';
      let params = [userId];

      if (tag) {
        query += ` AND tags LIKE $${params.length + 1}`;
        params.push(`%${tag}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getHabitById(habitId, userId) {
    try {
      const result = await pool.query('SELECT * FROM habits WHERE id = $1 AND user_id = $2', [habitId, userId]);
      if (result.rows.length === 0) {
        throw new Error('Habit not found');
      }
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async updateHabit(habitId, userId, updateData) {
    try {
      const { title, description, frequency, tags, reminder_time, goal } = updateData;
      const result = await pool.query(
        'UPDATE habits SET title = COALESCE($1, title), description = COALESCE($2, description), frequency = COALESCE($3, frequency), tags = COALESCE($4, tags), reminder_time = COALESCE($5, reminder_time), goal = COALESCE($6, goal), updated_at = CURRENT_TIMESTAMP WHERE id = $7 AND user_id = $8 RETURNING *',
        [title, description, frequency, tags, reminder_time, goal, habitId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Habit not found');
      }
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async deleteHabit(habitId, userId) {
    try {
      const result = await pool.query('DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id', [habitId, userId]);
      if (result.rows.length === 0) {
        throw new Error('Habit not found');
      }
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getHabitCountByUserId(userId) {
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM habits WHERE user_id = $1', [userId]);
      return result.rows[0].count;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new HabitService();
