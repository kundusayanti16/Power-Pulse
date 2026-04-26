import express from 'express';
const router = express.Router();
import { submitFeedback } from '../controllers/feedbackController.js';

// Public route to submit feedback
router.post('/', submitFeedback);

export default router;
