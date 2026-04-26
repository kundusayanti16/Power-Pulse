import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const complaintSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    unique: true,
    default: () => 'TRK-' + uuidv4().slice(0, 8).toUpperCase(),
  },
  consumerId: {
    type: String,
    required: [true, 'Consumer ID is required'],
    uppercase: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  areaName: {
    type: String,
    required: [true, 'Area / Place name is required'],
    trim: true,
  },
  problemType: {
    type: String,
    required: [true, 'Problem type is required'],
    enum: ['power outage', 'voltage fluctuation', 'transformer issue', 'meter issue'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending',
  },
  escalated: {
    type: Boolean,
    default: false,
  },
  adminNote: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Complaint', complaintSchema);
