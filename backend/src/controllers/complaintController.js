import Complaint from '../models/Complaint.js';
import ResolvedComplaint from '../models/ResolvedComplaint.js';
import { sendTrackingIdEmail } from '../utils/emailService.js';

// ── File new complaint ────────────────────────────────────────────────────────
const createComplaint = async (req, res) => {
  try {
    const { consumerId, areaName, problemType, description, location } = req.body;
    if (!consumerId || !areaName || !problemType || !description) {
      return res.status(400).json({ success: false, message: 'All complaint fields are required.' });
    }
    if (req.user.consumerId !== consumerId.toUpperCase()) {
      return res.status(403).json({ success: false, message: 'Consumer ID does not match your registered account.' });
    }
    const complaint = await Complaint.create({
      consumerId: consumerId.toUpperCase(),
      userId: req.user._id,
      areaName: areaName.trim(),
      problemType,
      description: description.trim(),
      location: location || {},
    });
    // Send automated email with tracking ID and consumer ID
    sendTrackingIdEmail(req.user.email, req.user.name, complaint.trackingId, req.user.consumerId);

    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully.',
      complaint: { trackingId: complaint.trackingId, status: complaint.status, createdAt: complaint.createdAt },
    });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ success: false, message: 'Error filing complaint.' });
  }
};

// ── Get user's own complaints ─────────────────────────────────────────────────
const getUserComplaints = async (req, res) => {
  try {
    const active = await Complaint.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const resolved = await ResolvedComplaint.find({ userId: req.user._id }).sort({ resolvedAt: -1 });
    res.json({ success: true, complaints: active, resolved });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching your complaints.' });
  }
};

// ── Track complaint by ID (public) ────────────────────────────────────────────
const trackComplaint = async (req, res) => {
  try {
    const id = (req.params.trackingId || '').toUpperCase();
    // Search by trackingId OR consumerId (latest first)
    let complaint = await Complaint.findOne({ $or: [{ trackingId: id }, { consumerId: id }] }).sort({ createdAt: -1 });
    
    if (!complaint) {
      const resolved = await ResolvedComplaint.findOne({ $or: [{ trackingId: id }, { consumerId: id }] }).sort({ resolvedAt: -1 });
      if (resolved) return res.json({ success: true, complaint: { ...resolved.toObject(), status: 'resolved' } });
      return res.status(404).json({ success: false, message: 'No complaint found with that Tracking or Consumer ID.' });
    }
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error tracking complaint.' });
  }
};

export { createComplaint, getUserComplaints, trackComplaint };
