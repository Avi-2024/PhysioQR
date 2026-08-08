const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, sparse: true },
  userType: { type: String, enum: ['patient', 'doctor', 'agent'], required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  category: {
    type: String,
    enum: ['payment', 'video_access', 'program', 'refund', 'fee_share', 'withdrawal', 'qr_code', 'profile', 'technical'],
  },
  subject: String,
  description: String,
  attachment: String,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed', 'reopened'],
    default: 'open',
  },
  adminResponse: String,
  resolutionNotes: String,
}, { timestamps: true });

// Auto-generate ticketId like TK00001 before saving
supportTicketSchema.pre('save', async function (next) {
  if (this.ticketId) return next();
  const count = await mongoose.model('SupportTicket').countDocuments();
  this.ticketId = `TK${String(count + 1).padStart(5, '0')}`;
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
