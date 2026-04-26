import Complaint from '../models/Complaint.js';
import ResolvedComplaint from '../models/ResolvedComplaint.js';

// ── Live stats for the footer ─────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [pending, inProgress, resolvedCount] = await Promise.all([
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'in-progress' }),
      ResolvedComplaint.countDocuments(),
    ]);

    const activeCount = pending + inProgress;
    const totalFiled = activeCount + resolvedCount;
    const resolutionRate = totalFiled > 0 ? Math.round((resolvedCount / totalFiled) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalFiled,
        pending,
        inProgress,
        resolved: resolvedCount,
        resolutionRate,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Error fetching stats.' });
  }
};

export { getStats };
