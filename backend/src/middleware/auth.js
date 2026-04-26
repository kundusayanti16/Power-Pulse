import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ── Protect: authenticate any logged-in user ─────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (user.activeSession && (!user.activeSessionExpiresAt || user.activeSessionExpiresAt <= new Date())) {
      user.activeSession = null;
      user.activeSessionExpiresAt = null;
      await user.save();
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    // Enforce single active session
    if (user.activeSession !== decoded.sessionId) {
      return res.status(401).json({ success: false, message: 'Session expired or signed in elsewhere. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ── Admin only ────────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
};

export { protect, adminOnly };
