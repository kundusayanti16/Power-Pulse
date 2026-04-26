import rateLimit from 'express-rate-limit';

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please try again after 15 minutes.' },
});

// Moderate limiter for complaint submission
const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, message: 'Too many complaint submissions. Please try again later.' },
});

export { authLimiter, complaintLimiter };
