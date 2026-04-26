import express from 'express';
const router = express.Router();
import { getStats } from '../controllers/statsController.js';

// Public: footer live stats
router.get('/', getStats);

export default router;
