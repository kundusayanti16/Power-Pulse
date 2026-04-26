import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email:     { type: String },
  loginTime: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success',
  },
});

export default mongoose.model('LoginLog', loginLogSchema);
