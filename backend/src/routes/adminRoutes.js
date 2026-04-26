import express from 'express';
const router = express.Router();
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getAllComplaints,
  getResolvedComplaints,
  updateComplaintStatus,
  getAllUsers,
  getLoginLogs,
  getContactMessages,
  escalateStale,
  forceLogoutUser,
} from '../controllers/adminController.js';

router.use(protect, adminOnly);

router.get('/complaints', getAllComplaints);
router.get('/complaints/resolved', getResolvedComplaints);
router.patch('/complaints/:id/status', updateComplaintStatus);
router.get('/users', getAllUsers);
router.post('/users/:id/force-logout', forceLogoutUser);
router.get('/logs', getLoginLogs);
router.get('/messages', getContactMessages);
router.post('/escalate', escalateStale);

export default router;
