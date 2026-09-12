const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { Order, Payment } = require('../models/Payment.model');
const Patient = require('../models/Patient.model');
const PatientProgram = require('../models/PatientProgram.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const Program = require('../models/Program.model');
const Coupon = require('../models/Coupon.model');
const { generateInvoiceNumber } = require('../utils/idGenerator');
const { writeAuditLog } = require('../utils/auditLogger');
const { getNextSequence } = require('../services/sequence.service');
const fraudService = require('../services/fraud.service');
const asyncHandler = require('../utils/asyncHandler');

let razorpayClient;
const VERIFIED_STATUSES = ['successful', 'manually_verified', 'refunded', 'partially_refunded', 'disputed', 'chargeback'];

const paymentError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const isMockGateway = () => process.env.PAYMENT_GATEWAY_MODE === 'mock' && process.env.NODE_ENV !== 'production';

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw paymentError('Razorpay credentials are not configured', 503);
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
};

const safeCompare = (actual, expected) => {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!process.env.RAZORPAY_KEY_SECRET) throw paymentError('Razorpay credentials are not configured', 503);
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (!safeCompare(signature, expected)) throw paymentError('Payment verification failed - invalid signature');
};

const verifyWebhookSignature = ({ rawBody, signature }) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw paymentError('Razorpay webhook secret is not configured', 503);
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  if (!safeCompare(signature, expected)) throw paymentError('Webhook verification failed - invalid signature');
};

const resolveDirectPricing = async ({ program, couponCode }) => {
  const originalAmount = Number(program.defaultPrice || 0);
  let discountAmount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase(), isActive: true });
    if (coupon && (!coupon.expiryDate || coupon.expiryDate > new Date()) && coupon.usedCount < (coupon.usageLimit || Infinity)) {
      discountAmount = coupon.discountType === 'fixed'
        ? Math.min(coupon.discountValue, originalAmount)
        : Math.min((originalAmount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);
      appliedCoupon = coupon;
    }
  }

  const finalAmount = Math.max(originalAmount - discountAmount, 0);
  return {
    originalAmount,
    discountAmount,
    finalAmount,
    appliedCoupon,
    pricingSnapshot: {
      program: program._id,
      purchaseMode: 'direct',
      revenueModel: 'platform_direct',
      defaultPrice: originalAmount,
      doctorFeeShare: 0,
      platformShare: finalAmount,
      couponCode: appliedCoupon?.couponCode || null,
    },
  };
};

const createGatewayOrder = async ({ amount, receipt }) => {
  if (isMockGateway()) {
    return {
      id: `order_mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
    };
  }
  return getRazorpayClient().orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
  });
};

const assertDirectPurchaseAllowed = async ({ patient, program }) => {
  if (patient.referringDoctor) {
    throw paymentError('This patient is linked to a referring doctor. Use the doctor-linked payment flow.', 409);
  }
  const assessment = await PatientAssessment.findOne({ patient: patient._id }).sort({ createdAt: -1 }).lean();
  if (!assessment || assessment.status !== 'cleared') {
    throw paymentError('Assessment must be clinically cleared before payment', 409);
  }
  if (assessment.requiresPhysioReview && String(assessment.approvedProgram || '') !== String(program._id)) {
    throw paymentError('Only the clinically approved rehabilitation programme can be purchased', 409);
  }
  if (!assessment.requiresPhysioReview && String(program.painCategory || '') !== String(assessment.painCategory || '')) {
    throw paymentError('Programme does not match the latest cleared assessment', 409);
  }

  const existingProgram = await PatientProgram.findOne({
    patient: patient._id,
    program: program._id,
    status: { $in: ['active', 'paused', 'completed'] },
  });
  if (existingProgram) throw paymentError('Program is already active for this patient', 409);

  const existingPayment = await Payment.findOne({
    patient: patient._id,
    program: program._id,
    verifiedAt: { $ne: null },
  });
  if (existingPayment) throw paymentError('Payment already completed for this patient program', 409);
};

const activateDirectProgram = async ({ order, payment, session }) => {
  const program = await Program.findById(order.program).session(session);
  if (!program || !program.isActive) throw paymentError('Program is no longer available for activation', 409);

  const durationDays = Number(program.durationDays || 30);
  const gracePeriodDays = 3;
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + (durationDays + gracePeriodDays) * 24 * 60 * 60 * 1000);

  await PatientProgram.findOneAndUpdate(
    { patient: order.patient, program: order.program },
    {
      $set: {
        status: 'active',
        startDate,
        expiryDate,
        gracePeriodDays,
        payment: payment._id,
      },
      $unset: { doctor: '' },
    },
    { upsert: true, new: true, session, setDefaultsOnInsert: true },
  );
};

const createDuplicateCaptured = async ({ order, primaryPayment, gatewayTransactionId, signature, rawGatewayPayload, session }) => {
  const existing = await Payment.findOne({ gatewayTransactionId }).session(session);
  if (existing) return existing.status === 'duplicate_captured' ? existing : null;

  const [duplicate] = await Payment.create([{
    order: order._id,
    patient: order.patient,
    program: order.program,
    gatewayProvider: order.gatewayProvider,
    gatewayOrderId: order.gatewayOrderId,
    gatewayTransactionId,
    gatewaySignature: signature,
    rawGatewayPayload,
    paidAmount: order.finalAmount,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    gatewayCharges: order.gatewayCharges,
    doctorFeeShare: 0,
    platformShare: order.finalAmount,
    feeSharePercentage: 0,
    feeShareBasis: 'gross',
    status: 'duplicate_captured',
    isDuplicate: true,
    duplicateOf: primaryPayment._id,
    failureReason: 'Second captured gateway transaction for an already verified direct order',
  }], { session });
  return duplicate;
};

const processDirectPayment = async ({ order, gatewayTransactionId, signature, rawGatewayPayload, req }) => {
  const session = await mongoose.startSession();
  let payment;
  let newlyProcessed = false;
  let duplicatePayment = null;

  try {
    await session.withTransaction(async () => {
      const lockedOrder = await Order.findById(order._id).session(session);
      if (!lockedOrder) throw paymentError('Order not found', 404);
      if (lockedOrder.doctor) throw paymentError('Doctor-linked orders must use the existing payment flow', 409);

      const existingTransaction = await Payment.findOne({ gatewayTransactionId }).session(session);
      if (existingTransaction) {
        if (String(existingTransaction.order) !== String(lockedOrder._id)) {
          throw paymentError('Gateway transaction is already linked to another payment', 409);
        }
        if (existingTransaction.status === 'duplicate_captured') {
          duplicatePayment = existingTransaction;
          payment = await Payment.findById(existingTransaction.duplicateOf).session(session);
          return;
        }
        if (existingTransaction.verifiedAt) {
          payment = existingTransaction;
          return;
        }
        throw paymentError('Gateway transaction is already linked to an unresolved payment record', 409);
      }

      const primaryPayment = await Payment.findOne({
        order: lockedOrder._id,
        status: { $in: VERIFIED_STATUSES },
      }).sort({ verifiedAt: 1, createdAt: 1 }).session(session);

      if (primaryPayment) {
        payment = primaryPayment;
        if (primaryPayment.gatewayTransactionId !== gatewayTransactionId) {
          duplicatePayment = await createDuplicateCaptured({
            order: lockedOrder,
            primaryPayment,
            gatewayTransactionId,
            signature,
            rawGatewayPayload,
            session,
          });
        }
        return;
      }

      const invoiceSequence = await getNextSequence(`invoice:${new Date().getFullYear()}`, { session });
      [payment] = await Payment.create([{
        order: lockedOrder._id,
        patient: lockedOrder.patient,
        program: lockedOrder.program,
        gatewayProvider: lockedOrder.gatewayProvider,
        gatewayOrderId: lockedOrder.gatewayOrderId,
        gatewayTransactionId,
        gatewaySignature: signature,
        rawGatewayPayload,
        paidAmount: lockedOrder.finalAmount,
        discountAmount: lockedOrder.discountAmount,
        taxAmount: lockedOrder.taxAmount,
        gatewayCharges: lockedOrder.gatewayCharges,
        doctorFeeShare: 0,
        platformShare: lockedOrder.finalAmount,
        feeSharePercentage: 0,
        feeShareBasis: 'gross',
        status: 'successful',
        invoiceNumber: generateInvoiceNumber(invoiceSequence),
        verifiedAt: new Date(),
      }], { session });

      lockedOrder.status = 'successful';
      lockedOrder.paidAt = new Date();
      await lockedOrder.save({ session });

      // Locks the commercial attribution as "direct" after the first verified payment.
      await Patient.findByIdAndUpdate(
        lockedOrder.patient,
        { $set: { referralLocked: true } },
        { session },
      );
      await activateDirectProgram({ order: lockedOrder, payment, session });

      if (lockedOrder.couponCode) {
        await Coupon.findOneAndUpdate(
          { couponCode: lockedOrder.couponCode },
          { $inc: { usedCount: 1 } },
          { session },
        );
      }
      newlyProcessed = true;
    });
  } finally {
    await session.endSession();
  }

  if (!payment) throw paymentError('Payment processing did not produce a verified payment', 409);

  if (duplicatePayment) {
    await fraudService.createFraudCase({
      rule: 'duplicate_captured_payment_same_order',
      severity: 'critical',
      patient: order.patient,
      payment: payment._id,
      relatedRecord: gatewayTransactionId,
      summary: `A second captured direct payment was detected for order ${order.gatewayOrderId}`,
      evidence: {
        order: order._id,
        primaryPayment: payment._id,
        duplicatePayment: duplicatePayment._id,
        duplicateTransactionId: gatewayTransactionId,
        amount: duplicatePayment.paidAmount,
        purchaseMode: 'direct',
      },
    });
    return { payment, idempotent: false, duplicateCharge: true, duplicatePayment };
  }

  if (newlyProcessed) {
    await writeAuditLog({
      req,
      action: 'direct_payment_verified',
      module: 'Payment',
      recordId: payment._id,
      newValue: {
        amount: payment.paidAmount,
        invoiceNumber: payment.invoiceNumber,
        gatewayTransactionId,
        doctorFeeShare: 0,
        platformShare: payment.platformShare,
      },
    });
  }

  return { payment, idempotent: !newlyProcessed, duplicateCharge: false };
};

const createDirectOrder = asyncHandler(async (req, res) => {
  const { patientId, programId, couponCode, idempotencyKey } = req.body;
  if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can create payment orders' });
  if (!patientId || !programId) return res.status(400).json({ message: 'patientId and programId are required' });
  if (String(req.user._id) !== String(patientId)) return res.status(403).json({ message: 'Cannot create an order for another patient' });

  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey, patient: patientId, doctor: null });
    if (existing) {
      return res.json({
        orderId: existing.gatewayOrderId,
        amount: Math.round(existing.finalAmount * 100),
        currency: existing.currency,
        key: process.env.RAZORPAY_KEY_ID,
        originalAmount: existing.originalAmount,
        discountAmount: existing.discountAmount,
        finalAmount: existing.finalAmount,
        purchaseMode: 'direct',
        idempotent: true,
      });
    }
  }

  const [patient, program] = await Promise.all([
    Patient.findById(patientId),
    Program.findById(programId),
  ]);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!patient.mobileVerified) return res.status(400).json({ message: 'Mobile number must be verified before payment' });
  if (!patient.consentAccepted) return res.status(400).json({ message: 'Patient must accept consent before payment' });
  if (!program || !program.isActive) return res.status(400).json({ message: 'Invalid or inactive program' });

  await assertDirectPurchaseAllowed({ patient, program });
  const pricing = await resolveDirectPricing({ program, couponCode });
  if (pricing.finalAmount <= 0) return res.status(400).json({ message: 'Final amount must be greater than zero' });

  const receipt = `direct_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const gatewayOrder = await createGatewayOrder({ amount: pricing.finalAmount, receipt });
  const order = await Order.create({
    orderId: gatewayOrder.id,
    patient: patientId,
    program: programId,
    originalAmount: pricing.originalAmount,
    discountAmount: pricing.discountAmount,
    finalAmount: pricing.finalAmount,
    couponCode: pricing.appliedCoupon?.couponCode || null,
    gatewayProvider: isMockGateway() ? 'mock' : 'razorpay',
    gatewayOrderId: gatewayOrder.id,
    gatewayReceipt: receipt,
    idempotencyKey,
    pricingSnapshot: pricing.pricingSnapshot,
    status: 'created',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  res.json({
    orderId: gatewayOrder.id,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    originalAmount: order.originalAmount,
    discountAmount: order.discountAmount,
    finalAmount: order.finalAmount,
    purchaseMode: 'direct',
  });
});

const verifyDirectPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!isMockGateway()) {
    verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
  } else if (!razorpay_payment_id) {
    return res.status(400).json({ message: 'razorpay_payment_id is required' });
  }

  const order = await Order.findOne({ gatewayOrderId: razorpay_order_id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.doctor) return res.status(409).json({ message: 'Doctor-linked orders must use the existing payment verification flow' });
  if (req.user.role !== 'patient' || String(req.user._id) !== String(order.patient)) {
    return res.status(403).json({ message: 'Cannot verify payment for another patient order' });
  }

  const result = await processDirectPayment({
    order,
    gatewayTransactionId: razorpay_payment_id,
    signature: razorpay_signature,
    rawGatewayPayload: req.body,
    req,
  });

  res.json({
    message: result.idempotent ? 'Payment already verified' : 'Payment verified and program activated',
    invoiceNumber: result.payment.invoiceNumber,
    paymentId: result.payment._id,
    duplicateCharge: result.duplicateCharge,
    duplicatePaymentId: result.duplicatePayment?._id,
    idempotent: result.idempotent,
    purchaseMode: 'direct',
  });
});

const directRazorpayWebhook = asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  verifyWebhookSignature({ rawBody, signature: req.headers['x-razorpay-signature'] });
  const payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
  if (payload.event !== 'payment.captured') return res.json({ received: true, ignored: true });

  const entity = payload.payload?.payment?.entity;
  if (!entity?.order_id || !entity?.id) return res.status(400).json({ message: 'Invalid Razorpay webhook payload' });
  const order = await Order.findOne({ gatewayOrderId: entity.order_id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.doctor) return res.status(409).json({ message: 'Not a direct payment order' });

  const result = await processDirectPayment({
    order,
    gatewayTransactionId: entity.id,
    rawGatewayPayload: payload,
    req,
  });
  res.json({
    received: true,
    idempotent: result.idempotent,
    duplicateCharge: result.duplicateCharge,
    duplicatePaymentId: result.duplicatePayment?._id,
    purchaseMode: 'direct',
  });
});

module.exports = {
  createDirectOrder,
  verifyDirectPayment,
  directRazorpayWebhook,
};
