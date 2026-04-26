import express from 'express';
const router = express.Router();
import { createComplaint, getUserComplaints, trackComplaint } from '../controllers/complaintController.js';
import { protect } from '../middleware/auth.js';
import { complaintLimiter } from '../middleware/rateLimiter.js';

// Public: track by tracking ID
router.get('/track/:trackingId', trackComplaint);

// Protected: user routes
router.use(protect);
router.post('/', complaintLimiter, createComplaint);
router.get('/my', getUserComplaints);

export default router;
