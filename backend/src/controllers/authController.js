import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import LoginLog from '../models/LoginLog.js';
import { sendOtpEmail } from '../utils/emailService.js';

const getSessionExpiryDate = () => {
  const raw = (process.env.JWT_EXPIRES_IN || '7d').trim();
  const match = raw.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return new Date(Date.now() + value * unitMs[unit]);
};

// ── REGISTER ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, phone, consumerId, password } = req.body;
    if (!name || !email || !phone || !consumerId || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already registered.' });

    const existingConsumer = await User.findOne({ consumerId: consumerId.toUpperCase() });
    if (existingConsumer) return res.status(400).json({ success: false, message: 'Consumer ID already registered.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      consumerId: consumerId.toUpperCase().trim(),
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
      userId: user._id,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ── LOGIN ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      await LoginLog.create({ email, status: 'failed', ipAddress: req.ip, userAgent: req.get('user-agent') });
      return res.status(401).json({ 
        success: false, 
        message: 'User does not exist. Please register first.',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await LoginLog.create({ userId: user._id, email, status: 'failed', ipAddress: req.ip, userAgent: req.get('user-agent') });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Block concurrent sessions unless the old session has already expired.
    if (user.activeSession) {
      if (!user.activeSessionExpiresAt || user.activeSessionExpiresAt <= new Date()) {
        user.activeSession = null;
        user.activeSessionExpiresAt = null;
      } else {
        return res.status(403).json({
          success: false,
          message: 'A session is already active on another device. Please log out there first.',
        });
      }
    }

    const sessionId = crypto.randomUUID();
    user.activeSession = sessionId;
    user.activeSessionExpiresAt = getSessionExpiryDate();
    await user.save();

    await LoginLog.create({ userId: user._id, email, status: 'success', ipAddress: req.ip, userAgent: req.get('user-agent') });

    const token = jwt.sign(
      { id: user._id, role: user.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, consumerId: user.consumerId },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ── ADMIN LOGIN (no OTP) ──────────────────────────────────────────────────────
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    if (user.activeSession) {
      if (!user.activeSessionExpiresAt || user.activeSessionExpiresAt <= new Date()) {
        user.activeSession = null;
        user.activeSessionExpiresAt = null;
      } else {
        return res.status(403).json({
          success: false,
          message: 'An admin session is already active. Please log out there first.',
        });
      }
    }

    const sessionId = crypto.randomUUID();
    user.activeSession = sessionId;
    user.activeSessionExpiresAt = getSessionExpiryDate();
    await user.save();

    await LoginLog.create({ userId: user._id, email, status: 'success', ipAddress: req.ip, userAgent: req.get('user-agent') });

    const token = jwt.sign(
      { id: user._id, role: user.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Admin login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error during admin login.' });
  }
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    req.user.activeSession = null;
    req.user.activeSessionExpiresAt = null;
    await req.user.save();
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    await sendOtpEmail(user.email, user.name, otp);

    res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error in forgot password.' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error resetting password.' });
  }
};

export { register, login, adminLogin, logout, forgotPassword, resetPassword };
