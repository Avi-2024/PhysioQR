const Refund = require('../../models/Refund.model');
const asyncHandler = require('../../utils/asyncHandler');
const { writeAuditLog } = require('../../utils/auditLogger');
const { initiateRefund } = require('../../services/refundGateway.service');

const processRefund = asyncHandler(async (req, res) => {
  const existing = await Refund.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ message: 'Refund not found' });

  const before = {
    status: existing.status,
    gatewayRefundId: existing.gatewayRefundId || null,
    gatewayStatus: existing.gatewayStatus || null,
  };

  const result = await initiateRefund({ refundId: existing._id, adminUserId: req.user._id });

  await writeAuditLog({
    req,
    action: result.idempotent ? 'refund_process_replayed' : 'refund_sent_to_razorpay',
    module: 'Refund',
    recordId: existing._id,
    previousValue: before,
    newValue: {
      status: result.refund.status,
      gatewayRefundId: result.refund.gatewayRefundId || null,
      gatewayStatus: result.refund.gatewayStatus || result.gatewayRefund?.status || null,
      refundType: existing.refundType,
      refundAmount: existing.refundAmount,
    },
    reason: existing.reason,
  });

  res.status(result.idempotent ? 200 : 202).json({
    message: result.refund.status === 'completed'
      ? 'Razorpay refund completed and confirmed financial effects were applied'
      : result.idempotent
        ? 'Refund is already being processed'
        : 'Refund submitted to Razorpay; financial effects wait for confirmed completion',
    refund: result.refund,
    idempotent: result.idempotent,
  });
});

module.exports = { processRefund };
