const userService = require('../services/userService');

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const result = await userService.register(name, email, password);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Email already exists') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await userService.login(email, password);
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Invalid email or password') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: 'Login failed' });
    }
  }
}

module.exports = new AuthController();
