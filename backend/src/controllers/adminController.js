import Complaint from '../models/Complaint.js';
import ResolvedComplaint from '../models/ResolvedComplaint.js';
import User from '../models/User.js';
import LoginLog from '../models/LoginLog.js';
import ContactMessage from '../models/ContactMessage.js';
import { sendStatusUpdateEmail } from '../utils/emailService.js';

// ── Get all active complaints (with filter + pagination) ──────────────────────
const getAllComplaints = async (req, res) => {
  try {
    const { status, problemType, escalated, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (problemType) filter.problemType = problemType;
    if (escalated === 'true') filter.escalated = true;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Complaint.countDocuments(filter),
    ]);

    res.json({ success: true, complaints, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching complaints.' });
  }
};

// ── Get all resolved complaints ───────────────────────────────────────────────
const getResolvedComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [resolved, total] = await Promise.all([
      ResolvedComplaint.find().sort({ resolvedAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      ResolvedComplaint.countDocuments(),
    ]);
    res.json({ success: true, resolved, total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching resolved complaints.' });
  }
};

// ── Update complaint status ───────────────────────────────────────────────────
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;
    const validStatuses = ['pending', 'in-progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const complaint = await Complaint.findById(id).populate('userId', 'email name');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    if (status === 'resolved') {
      // Move to resolvedComplaints collection
      await ResolvedComplaint.create({
        trackingId: complaint.trackingId,
        consumerId: complaint.consumerId,
        userId: complaint.userId,
        areaName: complaint.areaName,
        problemType: complaint.problemType,
        description: complaint.description,
        location: complaint.location,
        escalated: complaint.escalated,
        adminNote: adminNote || complaint.adminNote,
        createdAt: complaint.createdAt,
        resolvedBy: req.user._id,
      });
      await Complaint.findByIdAndDelete(id);

      // Send status update email for resolution
      if (complaint.userId && complaint.userId.email) {
        sendStatusUpdateEmail(complaint.userId.email, complaint.userId.name, complaint.trackingId, 'resolved', adminNote || complaint.adminNote);
      }

      return res.json({ success: true, message: 'Complaint resolved and archived.' });
    }

    // Update status in-place for pending/in-progress
    complaint.status = status;
    if (adminNote) complaint.adminNote = adminNote;
    await complaint.save();

    // Send status update email for in-progress or other status changes
    if (complaint.userId && complaint.userId.email) {
      sendStatusUpdateEmail(complaint.userId.email, complaint.userId.name, complaint.trackingId, status, adminNote || complaint.adminNote);
    }

    res.json({ success: true, message: `Status updated to "${status}".`, complaint });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Error updating complaint status.' });
  }
};

// ── Get all users ─────────────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching users.' });
  }
};

// ── Get login logs ────────────────────────────────────────────────────────────
const getLoginLogs = async (req, res) => {
  try {
    const logs = await LoginLog.find().sort({ loginTime: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching login logs.' });
  }
};

// ── Get Contact Messages ──────────────────────────────────────────────────────
const getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching contact messages.' });
  }
};

// ── Escalate stale complaints (can be called by cron or manually) ─────────────
const escalateStale = async (req, res) => {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const result = await Complaint.updateMany(
      { status: 'pending', createdAt: { $lt: twelveHoursAgo }, escalated: false },
      { $set: { escalated: true } }
    );
    res.json({ success: true, message: `${result.modifiedCount} complaints escalated.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error escalating complaints.' });
  }
};

const forceLogoutUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(id, { activeSession: null, activeSessionExpiresAt: null });
    res.json({ success: true, message: 'User has been forced to log out.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error forcing logout.' });
  }
};

export { 
  getAllComplaints, 
  updateComplaintStatus, 
  getResolvedComplaints, 
  getAllUsers, 
  getLoginLogs, 
  getContactMessages,
  escalateStale,
  forceLogoutUser
};
