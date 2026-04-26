import rateLimit from 'express-rate-limit';

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please try again after 2 minutes.' },
});

// Moderate limiter for complaint submission
const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, message: 'Too many complaint submissions. Please try again later.' },
});

export { authLimiter, complaintLimiter };
