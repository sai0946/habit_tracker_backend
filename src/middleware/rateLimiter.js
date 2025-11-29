// In-memory store for rate limiting (for production, use Redis)
const requestCounts = new Map();

const rateLimiter = (req, res, next) => {
  // Use user ID if authenticated, otherwise use IP
  const identifier = req.userId || req.ip;
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1 hour in milliseconds

  // Initialize or get user's request history
  if (!requestCounts.has(identifier)) {
    requestCounts.set(identifier, []);
  }

  let timestamps = requestCounts.get(identifier);

  // Remove timestamps older than 1 hour
  timestamps = timestamps.filter((time) => time > oneHourAgo);
  requestCounts.set(identifier, timestamps);

  // Check if user exceeded limit (100 requests/hour)
  const limit = 100;
  if (timestamps.length >= limit) {
    return res.status(429).json({
      error: 'Too many requests. Rate limit: 100 requests per hour.',
      retryAfter: Math.ceil((timestamps[0] + 3600000 - now) / 1000),
    });
  }

  // Add current request timestamp
  timestamps.push(now);
  requestCounts.set(identifier, timestamps);

  // Add rate limit info to response headers
  res.set('X-RateLimit-Limit', limit);
  res.set('X-RateLimit-Remaining', limit - timestamps.length);
  res.set('X-RateLimit-Reset', new Date(timestamps[0] + 3600000).toISOString());

  next();
};

module.exports = rateLimiter;
