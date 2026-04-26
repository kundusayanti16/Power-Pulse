import mongoose from 'mongoose';

// Mirror of Complaint schema — stored separately when resolved
const resolvedComplaintSchema = new mongoose.Schema({
  trackingId:   { type: String, unique: true },
  consumerId:   { type: String },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  areaName:     { type: String },
  problemType:  { type: String },
  description:  { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  escalated:    { type: Boolean, default: false },
  adminNote:    { type: String, default: '' },
  createdAt:    { type: Date },
  resolvedAt:   { type: Date, default: Date.now },
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model('ResolvedComplaint', resolvedComplaintSchema);
