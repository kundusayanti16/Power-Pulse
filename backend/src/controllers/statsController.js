import Complaint from '../models/Complaint.js';
import ResolvedComplaint from '../models/ResolvedComplaint.js';

// ── Live stats for the footer ─────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [pending, inProgress, resolvedCount, typeStats] = await Promise.all([
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'in-progress' }),
      ResolvedComplaint.countDocuments(),
      Complaint.aggregate([
        { $group: { _id: '$problemType', count: { $sum: 1 } } }
      ])
    ]);

    const activeCount = pending + inProgress;
    const totalFiled = activeCount + resolvedCount;
    const resolutionRate = totalFiled > 0 ? Math.round((resolvedCount / totalFiled) * 100) : 0;

    // Convert typeStats array to a dynamic object
    const typeCounts = {};
    typeStats.forEach(stat => {
      typeCounts[stat._id] = stat.count;
    });

    res.json({
      success: true,
      stats: {
        totalFiled,
        pending,
        inProgress,
        resolved: resolvedCount,
        resolutionRate,
        typeCounts
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Error fetching stats.' });
  }
};

export { getStats };
