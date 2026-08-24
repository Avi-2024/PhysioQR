const Refund = require('../../models/Refund.model');
const asyncHandler = require('../../utils/asyncHandler');
const { writeAuditLog } = require('../../utils/auditLogger');
const { initiateDuplicateRefund } = require('../../services/refundGateway.service');

const processDuplicateRefund = asyncHandler(async (req, res) => {
  const existing = await Refund.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ message: 'Refund not found' });
  if (existing.refundType !== 'duplicate_payment') {
    return res.status(400).json({ message: 'Only duplicate-payment refund requests use this gateway processor' });
  }

  const before = { status: existing.status, gatewayRefundId: existing.gatewayRefundId || null };
  const result = await initiateDuplicateRefund({ refundId: existing._id, adminUserId: req.user._id });

  await writeAuditLog({
    req,
    action: result.idempotent ? 'duplicate_refund_process_replayed' : 'duplicate_refund_sent_to_razorpay',
    module: 'Refund',
    recordId: existing._id,
    previousValue: before,
    newValue: {
      status: result.refund.status,
      gatewayRefundId: result.refund.gatewayRefundId || null,
      gatewayStatus: result.gatewayRefund?.status || null,
    },
    reason: existing.reason,
  });

  res.status(result.idempotent ? 200 : 202).json({
    message: result.refund.status === 'completed'
      ? 'Razorpay refund completed'
      : result.idempotent
        ? 'Refund is already being processed'
        : 'Refund submitted to Razorpay; final state will reconcile from webhook',
    refund: result.refund,
    idempotent: result.idempotent,
  });
});

module.exports = { processDuplicateRefund };
