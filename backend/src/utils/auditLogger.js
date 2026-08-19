const AuditLog = require('../models/AuditLog.model');

/**
 * Write an audit log entry. Call this from any controller after an important action.
 * SRS §41 — All important financial and Admin actions must be recorded.
 *
 * @param {object} params
 * @param {object} params.req - Express request (for user, IP, device)
 * @param {string} params.action - e.g. 'doctor_approved'
 * @param {string} params.module - e.g. 'Doctor'
 * @param {string} params.recordId - MongoDB _id of the affected record
 * @param {*}      params.previousValue - value before change
 * @param {*}      params.newValue - value after change
 * @param {string} params.reason - optional reason/notes
 * @param {object} params.metadata - optional searchable investigation context
 */
const writeAuditLog = async ({ req, action, module, recordId, previousValue, newValue, reason, metadata }) => {
  try {
    await AuditLog.create({
      performedBy: req?.user?._id || null,
      userRole: req?.user?.role || 'system',
      action,
      module,
      recordId: recordId?.toString(),
      previousValue,
      newValue,
      reason,
      ipAddress: req?.ip,
      deviceInfo: req?.headers?.['user-agent'],
      requestId: req?.id || req?.headers?.['x-request-id'],
      method: req?.method,
      path: req?.originalUrl || req?.url,
      statusCode: req?.res?.statusCode,
      metadata,
    });
  } catch (err) {
    // Audit log failure should never crash the main operation
    console.error('Audit log write failed:', err.message);
  }
};

module.exports = { writeAuditLog };
