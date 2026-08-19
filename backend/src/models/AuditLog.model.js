const mongoose = require('mongoose');

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
  requestId: String,
  method: String,
  path: String,
  statusCode: Number,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ recordId: 1, createdAt: -1 });
auditLogSchema.index({ userRole: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
