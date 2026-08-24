const { Order, Payment } = require('../../models/Payment.model');
const Refund = require('../../models/Refund.model');
const { FeeShare, WithdrawalRequest } = require('../../models/FeeShare.model');
const { DoctorWallet } = require('../../models/Wallet.model');
const Payout = require('../../models/Payout.model');
const asyncHandler = require('../../utils/asyncHandler');

const getReconciliation = asyncHandler(async (req, res) => {
  const [successfulOrders, verifiedPayments, duplicatePayments, refunds, feeShares, wallets, withdrawals, payouts] = await Promise.all([
    Order.find({ status: { $in: ['successful', 'manually_verified', 'refunded', 'partially_refunded'] } }).select('_id orderId finalAmount status').lean(),
    Payment.find({ status: { $in: ['successful', 'manually_verified', 'refunded', 'partially_refunded'] } }).select('_id order paidAmount refundAmount doctorFeeShare platformShare status invoiceNumber doctor').lean(),
    Payment.find({ status: 'duplicate_captured' }).select('_id order paidAmount gatewayTransactionId duplicateOf doctor patient createdAt').lean(),
    Refund.find({}).select('_id payment refundType refundAmount feeShareReversal status gatewayRefundId').lean(),
    FeeShare.find({}).select('_id payment doctor amount status').lean(),
    DoctorWallet.find({}).select('_id doctor pendingBalance availableBalance withdrawalRequestedAmount paidBalance reversedBalance lifetimeEarnings').lean(),
    WithdrawalRequest.find({}).select('_id doctor wallet requestedAmount status').lean(),
    Payout.find({}).select('_id withdrawalRequest doctor amount status').lean(),
  ]);

  const paymentByOrder = new Map(verifiedPayments.map((p) => [String(p.order), p]));
  const feeByPayment = new Map(feeShares.map((f) => [String(f.payment), f]));
  const refundsByPayment = new Map();
  refunds.forEach((refund) => {
    const key = String(refund.payment);
    if (!refundsByPayment.has(key)) refundsByPayment.set(key, []);
    refundsByPayment.get(key).push(refund);
  });
  const completedRefundAmountByPayment = new Map();
  refunds.forEach((refund) => {
    if (refund.status !== 'completed') return;
    const key = String(refund.payment);
    completedRefundAmountByPayment.set(key, (completedRefundAmountByPayment.get(key) || 0) + Number(refund.refundAmount || 0));
  });
  const payoutByWithdrawal = new Map(payouts.map((p) => [String(p.withdrawalRequest), p]));
  const walletByDoctor = new Map(wallets.map((w) => [String(w.doctor), w]));
  const issues = [];

  successfulOrders.forEach((order) => {
    if (!paymentByOrder.has(String(order._id))) {
      issues.push({ type: 'order_without_payment', severity: 'critical', reference: order.orderId || String(order._id), message: 'Successful/refunded order has no verified payment record.' });
    }
  });

  verifiedPayments.forEach((payment) => {
    const order = successfulOrders.find((item) => String(item._id) === String(payment.order));
    if (order && Math.abs(Number(order.finalAmount || 0) - Number(payment.paidAmount || 0)) > 0.01) {
      issues.push({ type: 'order_payment_amount_mismatch', severity: 'high', reference: payment.invoiceNumber || String(payment._id), message: 'Order final amount and payment paid amount differ.', expected: order.finalAmount, actual: payment.paidAmount });
    }
    const feeShare = feeByPayment.get(String(payment._id));
    if (Number(payment.doctorFeeShare || 0) > 0 && !feeShare) {
      issues.push({ type: 'payment_without_fee_share', severity: 'high', reference: payment.invoiceNumber || String(payment._id), message: 'Verified payment has doctor fee share amount but no FeeShare ledger record.' });
    }
    const completedRefundAmount = completedRefundAmountByPayment.get(String(payment._id)) || 0;
    if (Math.abs(completedRefundAmount - Number(payment.refundAmount || 0)) > 0.01) {
      issues.push({ type: 'refund_amount_mismatch', severity: 'high', reference: payment.invoiceNumber || String(payment._id), message: 'Completed refund total differs from Payment.refundAmount.', expected: payment.refundAmount || 0, actual: completedRefundAmount });
    }
  });

  duplicatePayments.forEach((payment) => {
    const duplicateRefunds = (refundsByPayment.get(String(payment._id)) || []).filter((refund) => refund.refundType === 'duplicate_payment');
    const completed = duplicateRefunds.find((refund) => refund.status === 'completed');
    const active = duplicateRefunds.find((refund) => ['requested', 'approved', 'processing'].includes(refund.status));
    const failed = duplicateRefunds.find((refund) => ['rejected', 'failed'].includes(refund.status));

    if (completed) return;
    if (active) {
      issues.push({
        type: 'duplicate_charge_refund_pending',
        severity: 'high',
        reference: payment.gatewayTransactionId || String(payment._id),
        paymentId: payment._id,
        refundId: active._id,
        message: `Duplicate captured charge has a refund request in ${active.status} state.`,
        expected: payment.paidAmount,
        actual: active.refundAmount,
      });
      return;
    }
    if (failed) {
      issues.push({
        type: 'duplicate_charge_refund_failed',
        severity: 'critical',
        reference: payment.gatewayTransactionId || String(payment._id),
        paymentId: payment._id,
        refundId: failed._id,
        message: `Duplicate captured charge refund is ${failed.status} and requires intervention.`,
        expected: payment.paidAmount,
        actual: failed.refundAmount,
      });
      return;
    }
    issues.push({
      type: 'duplicate_charge_unresolved',
      severity: 'critical',
      reference: payment.gatewayTransactionId || String(payment._id),
      paymentId: payment._id,
      message: 'Duplicate captured charge has no refund request.',
      expected: payment.paidAmount,
      actual: 0,
    });
  });

  withdrawals.forEach((withdrawal) => {
    const wallet = walletByDoctor.get(String(withdrawal.doctor));
    if (!wallet) issues.push({ type: 'withdrawal_without_wallet', severity: 'critical', reference: String(withdrawal._id), message: 'Withdrawal request has no doctor wallet.' });
    const payout = payoutByWithdrawal.get(String(withdrawal._id));
    if (['processing', 'paid'].includes(withdrawal.status) && !payout) issues.push({ type: 'withdrawal_without_payout', severity: 'critical', reference: String(withdrawal._id), message: 'Processing/paid withdrawal has no payout record.' });
    if (payout && Math.abs(Number(payout.amount || 0) - Number(withdrawal.requestedAmount || 0)) > 0.01) {
      issues.push({ type: 'withdrawal_payout_amount_mismatch', severity: 'high', reference: String(withdrawal._id), message: 'Withdrawal requested amount and payout amount differ.', expected: withdrawal.requestedAmount, actual: payout.amount });
    }
  });

  payouts.forEach((payout) => {
    const withdrawal = withdrawals.find((item) => String(item._id) === String(payout.withdrawalRequest));
    if (!withdrawal) issues.push({ type: 'orphan_payout', severity: 'critical', reference: String(payout._id), message: 'Payout has no matching withdrawal request.' });
  });

  const duplicateCapturedAmount = duplicatePayments.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
  const duplicateRefundedAmount = duplicatePayments.reduce((sum, item) => {
    const completed = (refundsByPayment.get(String(item._id)) || []).filter((refund) => refund.refundType === 'duplicate_payment' && refund.status === 'completed');
    return sum + completed.reduce((refundSum, refund) => refundSum + Number(refund.refundAmount || 0), 0);
  }, 0);

  const totals = {
    orders: successfulOrders.reduce((sum, item) => sum + Number(item.finalAmount || 0), 0),
    payments: verifiedPayments.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
    refunds: refunds.filter((item) => item.status === 'completed').reduce((sum, item) => sum + Number(item.refundAmount || 0), 0),
    feeShares: feeShares.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    payouts: payouts.filter((item) => item.status === 'completed').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    duplicateCapturedAmount,
    duplicateRefundedAmount,
  };

  res.json({
    summary: {
      issues: issues.length,
      critical: issues.filter((item) => item.severity === 'critical').length,
      high: issues.filter((item) => item.severity === 'high').length,
      orders: successfulOrders.length,
      payments: verifiedPayments.length,
      duplicateCaptured: duplicatePayments.length,
      duplicateRefundPending: duplicatePayments.filter((payment) => (refundsByPayment.get(String(payment._id)) || []).some((refund) => refund.refundType === 'duplicate_payment' && ['requested', 'approved', 'processing'].includes(refund.status))).length,
      refunds: refunds.length,
      feeShares: feeShares.length,
      withdrawals: withdrawals.length,
      payouts: payouts.length,
    },
    totals,
    issues,
  });
});

module.exports = { getReconciliation };
