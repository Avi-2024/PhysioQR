const mongoose = require('mongoose');

// Records every important admin/system action — read-only, never editable
const auditLogSchema = new mongoose.Schema({
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRole: String,
  action: { type: String, required: true },
  module: String,
  recordId: String,
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  reason: String,
  ipAddress: String,
  deviceInfo: String,
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
