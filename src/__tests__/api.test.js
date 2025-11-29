const request = require('supertest');
const express = require('express');
const path = require('path');
require('dotenv').config({ override: true, path: path.resolve(__dirname, '../../.env') });

const rateLimiter = require('../middleware/rateLimiter');
const authRoutes = require('../routes/authRoutes');
const habitRoutes = require('../routes/habitRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(rateLimiter);
app.use('/auth', authRoutes);
app.use('/habits', habitRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Test variables
let authToken = null;
let testUserId = null;
let habitId = null;

describe('Habit Tracker API Tests', () => {
  // Health check
  describe('GET /health', () => {
    it('should return server status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Server is running');
    });
  });

  // Authentication Tests
  describe('Authentication Endpoints', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/auth/register').send({
        name: 'Test User',
        email: `testuser-${Date.now()}@example.com`,
        password: 'password123',
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.user).toHaveProperty('id');
    });

    it('should not register user with duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      await request(app).post('/auth/register').send({
        name: 'User 1',
        email,
        password: 'password123',
      });

      const res = await request(app).post('/auth/register').send({
        name: 'User 2',
        email,
        password: 'password123',
      });
      expect(res.status).toBe(409);
    });

    it('should reject registration with short password', async () => {
      const res = await request(app).post('/auth/register').send({
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'pass',
      });
      expect(res.status).toBe(400);
    });

    it('should login with valid credentials', async () => {
      const email = `login-test-${Date.now()}@example.com`;
      await request(app).post('/auth/register').send({
        name: 'Login Test',
        email,
        password: 'password123',
      });

      const res = await request(app).post('/auth/login').send({
        email,
        password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      authToken = res.body.token;
      testUserId = res.body.user.id;
    });

    it('should reject login with invalid email', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });
      expect(res.status).toBe(401);
    });

    it('should reject login with wrong password', async () => {
      const email = `wrong-pass-${Date.now()}@example.com`;
      await request(app).post('/auth/register').send({
        name: 'User',
        email,
        password: 'password123',
      });

      const res = await request(app).post('/auth/login').send({
        email,
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    });
  });

  // Habit Management Tests
  describe('Habit Management Endpoints', () => {
    beforeAll(async () => {
      if (!authToken) {
        const email = `setup-${Date.now()}@example.com`;
        const registerRes = await request(app).post('/auth/register').send({
          name: 'Setup User',
          email,
          password: 'password123',
        });
        testUserId = registerRes.body.user.id;

        const loginRes = await request(app).post('/auth/login').send({
          email,
          password: 'password123',
        });
        authToken = loginRes.body.token;
      }
    });

    it('should create a new habit', async () => {
      const res = await request(app)
        .post('/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Morning Exercise',
          description: '30 minutes workout',
          frequency: 'daily',
          tags: 'fitness,health',
          reminder_time: '06:00:00',
        });
      expect(res.status).toBe(201);
      expect(res.body.habit).toHaveProperty('id');
      habitId = res.body.habit.id;
    });

    it('should not create habit without authentication', async () => {
      const res = await request(app).post('/habits').send({
        title: 'Test Habit',
        frequency: 'daily',
      });
      expect(res.status).toBe(401);
    });

    it('should get all habits for authenticated user', async () => {
      const res = await request(app).get('/habits').set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('habits');
      expect(Array.isArray(res.body.habits)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should get habit with pagination', async () => {
      const res = await request(app)
        .get('/habits?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should get specific habit by ID', async () => {
      const res = await request(app)
        .get(`/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.habit.id).toBe(habitId);
      expect(res.body.habit).toHaveProperty('streak');
    });

    it('should update a habit', async () => {
      const res = await request(app)
        .put(`/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Evening Exercise',
          reminder_time: '18:00:00',
        });
      expect(res.status).toBe(200);
      expect(res.body.habit.title).toBe('Evening Exercise');
    });

    it('should filter habits by tag', async () => {
      const res = await request(app)
        .get('/habits?tag=fitness')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.habits)).toBe(true);
    });
  });

  // Tracking Tests
  describe('Habit Tracking Endpoints', () => {
    beforeAll(async () => {
      if (!habitId) {
        const createRes = await request(app)
          .post('/habits')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Track Test Habit',
            frequency: 'daily',
          });
        habitId = createRes.body.habit.id;
      }
    });

    it('should track a habit for today', async () => {
      const res = await request(app)
        .post(`/habits/${habitId}/track`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(201);
      expect(res.body.trackingLog).toHaveProperty('completed_date');
    });

    it('should not allow tracking same habit twice in one day', async () => {
      const res = await request(app)
        .post(`/habits/${habitId}/track`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(409);
    });

    it('should get habit history', async () => {
      const res = await request(app)
        .get(`/habits/${habitId}/history`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('history');
      expect(res.body).toHaveProperty('streak');
      expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('should get history with custom days', async () => {
      const res = await request(app)
        .get(`/habits/${habitId}/history?days=30`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.days).toBe(30);
    });
  });

  // Rate Limiting Tests
  describe('Rate Limiting', () => {
    it('should include rate limit headers in response', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should allow 100 requests per hour', async () => {
      const email = `ratelimit-${Date.now()}@example.com`;
      const res = await request(app).post('/auth/register').send({
        name: 'Rate Limit Test',
        email,
        password: 'password123',
      });
      expect(res.status).toBe(201);
    });
  });

  // Delete habit test
  describe('Habit Deletion', () => {
    it('should delete a habit', async () => {
      // Create habit to delete
      const createRes = await request(app)
        .post('/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Delete Test Habit',
          frequency: 'daily',
        });
      const habitToDelete = createRes.body.habit.id;

      const res = await request(app)
        .delete(`/habits/${habitToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not delete non-existent habit', async () => {
      const res = await request(app)
        .delete('/habits/99999')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });
  });

  // Error handling tests
  describe('Error Handling', () => {
    it('should return 401 for missing token', async () => {
      const res = await request(app).get('/habits');
      expect(res.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/habits')
        .set('Authorization', 'Bearer invalid-token-here');
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent habit', async () => {
      const res = await request(app)
        .get('/habits/99999')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid frequency', async () => {
      const res = await request(app)
        .post('/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Invalid Habit',
          frequency: 'monthly', // invalid
        });
      expect(res.status).toBe(400);
    });
  });
});
