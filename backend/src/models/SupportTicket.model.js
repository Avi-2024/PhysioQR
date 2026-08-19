const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  senderRole: { type: String, enum: ['patient', 'doctor', 'agent', 'admin'], required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  attachment: String,
  isInternal: { type: Boolean, default: false },
}, { timestamps: true });

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, sparse: true },
  userType: { type: String, enum: ['patient', 'doctor', 'agent'], required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: {
    type: String,
    enum: ['payment', 'video_access', 'program', 'refund', 'fee_share', 'withdrawal', 'qr_code', 'profile', 'technical'],
    required: true,
  },
  subject: { type: String, required: true },
  description: String,
  attachment: String,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed', 'reopened'],
    default: 'open',
  },
  messages: [ticketMessageSchema],
  adminResponse: String,
  resolutionNotes: String,
  lastResponseAt: Date,
  closedAt: Date,
}, { timestamps: true });

// Auto-generates a collision-resistant readable ticket ID.
supportTicketSchema.pre('save', function (next) {
  if (this.ticketId) return next();
  const suffix = this._id.toString().slice(-8).toUpperCase();
  this.ticketId = `TK${suffix}`;
  next();
});

supportTicketSchema.index({ userType: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ patient: 1, createdAt: -1 });
supportTicketSchema.index({ doctor: 1, createdAt: -1 });
supportTicketSchema.index({ agent: 1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
