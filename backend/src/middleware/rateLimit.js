const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many requests, please try again later.' } = {}) => {
  const hits = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    const entry = hits.get(ip) || [];
    const active = entry.filter((t) => t >= windowStart);

    if (active.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: message });
    }

    active.push(now);
    hits.set(ip, active);

    if (hits.size > max * 100) {
      for (const [key, list] of hits) {
        if (list.every((t) => t < windowStart)) hits.delete(key);
      }
    }

    next();
  };
};

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many auth attempts, please try again later.',
});

const authStrictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later.',
});

module.exports = { createRateLimiter, authRateLimiter, authStrictLimiter };