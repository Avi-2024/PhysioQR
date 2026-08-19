const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { Order, Payment } = require('../models/Payment.model');
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const PatientProgram = require('../models/PatientProgram.model');
const Program = require('../models/Program.model');
const Coupon = require('../models/Coupon.model');
const QrScan = require('../models/QrScan.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const { FeeShare } = require('../models/FeeShare.model');
const { calculateFeeShare } = require('../utils/feeCalculator');
const { generateInvoiceNumber } = require('../utils/idGenerator');
const { writeAuditLog } = require('../utils/auditLogger');
const { getNextSequence } = require('../services/sequence.service');
const fraudService = require('../services/fraud.service');
const asyncHandler = require('../utils/asyncHandler');

let razorpayClient;

// Creates an HTTP-aware payment error.
const paymentError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Returns true when payment gateway is mocked for local/integration testing.
const isMockGateway = () => process.env.PAYMENT_GATEWAY_MODE === 'mock' && process.env.NODE_ENV !== 'production';

// Gets a configured Razorpay client for production gateway calls.
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

// Safely compares Razorpay signatures without timing leaks.
const safeCompare = (actual, expected) => {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

// Verifies Razorpay checkout signature.
const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!process.env.RAZORPAY_KEY_SECRET) throw paymentError('Razorpay credentials are not configured', 503);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (!safeCompare(signature, expectedSignature)) throw paymentError('Payment verification failed - invalid signature');
};

// Verifies Razorpay webhook signature.
const verifyWebhookSignature = ({ rawBody, signature }) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw paymentError('Razorpay webhook secret is not configured', 503);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  if (!safeCompare(signature, expectedSignature)) throw paymentError('Webhook verification failed - invalid signature');
};

// Resolves the patient order amount from the locked doctor pricing model.
const resolveOrderPricing = async ({ doctor, programId, couponCode }) => {
  let originalAmount = doctor.approvedPatientFee || 0;
  let discountAmount = 0;
  let appliedCoupon = null;

  if (doctor.revenueModel === 'platform_fee' && doctor.approvedPatientFee) {
    originalAmount = doctor.approvedPatientFee;
  }

  if (couponCode) {
    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase(), isActive: true });
    if (coupon && (!coupon.expiryDate || coupon.expiryDate > new Date()) && coupon.usedCount < (coupon.usageLimit || Infinity)) {
      if (coupon.discountType === 'fixed') discountAmount = Math.min(coupon.discountValue, originalAmount);
      else discountAmount = Math.min((originalAmount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);
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
      program: programId,
      doctor: doctor._id,
      revenueModel: doctor.revenueModel || 'split',
      approvedPatientFee: doctor.approvedPatientFee,
      feeShareType: doctor.feeShareType || 'percentage',
      feeSharePercentage: doctor.feeSharePercentage || 0,
      fixedFeeShareAmount: doctor.fixedFeeShareAmount || 0,
      feeShareSlabs: doctor.feeShareSlabs || [],
      feeShareCalculationBasis: doctor.feeShareCalculationBasis || 'gross',
      feeShareHoldingDays: doctor.feeShareHoldingDays || 15,
      couponCode: appliedCoupon?.couponCode || null,
    },
  };
};

// Creates a gateway order or mock order for integration tests.
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

// Ensures one patient cannot buy the same active program twice.
const assertNoActiveProgramPurchase = async ({ patientId, programId }) => {
  const existingProgram = await PatientProgram.findOne({
    patient: patientId,
    program: programId,
    status: { $in: ['active', 'paused', 'completed'] },
  });
  if (existingProgram) throw paymentError('Program is already active for this patient', 409);

  const existingPayment = await Payment.findOne({
    patient: patientId,
    program: programId,
    status: 'successful',
  });
  if (existingPayment) throw paymentError('Payment already completed for this patient program', 409);
};

// Creates fee share, wallet balance, and ledger entries for split model payments.
const createFeeShareAndWalletEntries = async ({ order, payment, doctor, session }) => {
  const totalPaidPatients = await Payment.countDocuments({ doctor: doctor._id, status: 'successful' }).session(session);
  const { doctorShare, platformShare } = calculateFeeShare({
    paidAmount: order.finalAmount,
    discountAmount: order.discountAmount,
    gatewayCharges: order.gatewayCharges || 0,
    feeShareType: doctor.feeShareType || 'percentage',
    percentage: doctor.feeSharePercentage || 0,
    fixedAmount: doctor.fixedFeeShareAmount || 0,
    slabs: doctor.feeShareSlabs || [],
    totalPaidPatients,
    basis: doctor.feeShareCalculationBasis || 'gross',
    revenueModel: doctor.revenueModel || 'split',
  });

  payment.doctorFeeShare = doctorShare;
  payment.platformShare = platformShare;
  payment.feeSharePercentage = doctor.feeSharePercentage;
  payment.feeShareBasis = doctor.feeShareCalculationBasis;

  if (doctor.revenueModel !== 'split' || doctorShare <= 0) return;

  const holdingDays = doctor.feeShareHoldingDays || 15;
  const availableDate = new Date(Date.now() + holdingDays * 24 * 60 * 60 * 1000);
  await FeeShare.create([{
    doctor: doctor._id,
    payment: payment._id,
    patient: order.patient,
    amount: doctorShare,
    percentage: doctor.feeSharePercentage,
    calculationBasis: doctor.feeShareCalculationBasis,
    holdingDays,
    availableDate,
    status: 'pending',
  }], { session });

  let wallet = await DoctorWallet.findOne({ doctor: doctor._id }).session(session);
  if (!wallet) {
    [wallet] = await DoctorWallet.create([{ doctor: doctor._id }], { session });
  }

  const previousBalance = wallet.pendingBalance;
  wallet.pendingBalance += doctorShare;
  wallet.lifetimeEarnings += doctorShare;
  await wallet.save({ session });

  await WalletTransaction.create([{
    doctor: doctor._id,
    wallet: wallet._id,
    relatedPayment: payment._id,
    type: 'fee_share_pending',
    amount: doctorShare,
    previousBalance,
    newBalance: wallet.pendingBalance,
    reason: 'Fee share from patient payment',
  }], { session });
};

// Activates patient program after successful payment.
const activatePatientProgram = async ({ order, payment, doctor, session }) => {
  const program = await Program.findById(order.program).session(session);
  const durationDays = program?.durationDays || 30;
  const gracePeriodDays = 3;
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + (durationDays + gracePeriodDays) * 24 * 60 * 60 * 1000);

  await PatientProgram.findOneAndUpdate(
    { patient: order.patient, program: order.program },
    { status: 'active', startDate, expiryDate, gracePeriodDays, payment: payment._id, doctor: doctor._id },
    { upsert: true, new: true, session }
  );
};

// Applies all side effects for a verified successful payment exactly once.
const processSuccessfulPayment = async ({ order, doctor, gatewayTransactionId, signature, rawGatewayPayload, req }) => {
  const session = await mongoose.startSession();
  let payment;

  try {
    await session.withTransaction(async () => {
      const lockedOrder = await Order.findById(order._id).session(session);
      if (!lockedOrder) throw paymentError('Order not found', 404);

      const existingPayment = await Payment.findOne({ gatewayTransactionId }).session(session);
      if (existingPayment) {
        if (existingPayment.order.toString() === lockedOrder._id.toString() && existingPayment.status === 'successful') {
          payment = existingPayment;
          return;
        }
        await fraudService.createFraudCase({
          rule: 'duplicate_gateway_transaction',
          severity: 'critical',
          doctor: lockedOrder.doctor,
          patient: lockedOrder.patient,
          payment: existingPayment._id,
          relatedRecord: gatewayTransactionId,
          summary: `Duplicate gateway transaction detected: ${gatewayTransactionId}`,
          evidence: { existingPayment: existingPayment._id, attemptedOrder: lockedOrder._id },
        });
        throw paymentError('Duplicate payment detected. Admin has been notified.', 409);
      }

      const alreadySuccessful = await Payment.findOne({
        order: lockedOrder._id,
        status: 'successful',
      }).session(session);
      if (alreadySuccessful) {
        payment = alreadySuccessful;
        return;
      }

      const invoiceSequence = await getNextSequence(`invoice:${new Date().getFullYear()}`, { session });
      [payment] = await Payment.create([{
        order: lockedOrder._id,
        patient: lockedOrder.patient,
        doctor: lockedOrder.doctor,
        agent: doctor.agent || null,
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
        status: 'successful',
        invoiceNumber: generateInvoiceNumber(invoiceSequence),
        verifiedAt: new Date(),
      }], { session });

      await createFeeShareAndWalletEntries({ order: lockedOrder, payment, doctor, session });
      await payment.save({ session });

      lockedOrder.status = 'successful';
      lockedOrder.paidAt = new Date();
      await lockedOrder.save({ session });

      await Patient.findByIdAndUpdate(lockedOrder.patient, { referralLocked: true }, { session });
      await QrScan.findOneAndUpdate(
        { doctor: doctor._id, patient: lockedOrder.patient },
        { paymentStatus: 'paid' },
        { sort: { createdAt: -1 }, session }
      );
      await activatePatientProgram({ order: lockedOrder, payment, doctor, session });

      if (lockedOrder.couponCode) {
        await Coupon.findOneAndUpdate({ couponCode: lockedOrder.couponCode }, { $inc: { usedCount: 1 } }, { session });
      }
    });
  } finally {
    await session.endSession();
  }

  await writeAuditLog({
    req,
    action: 'payment_verified',
    module: 'Payment',
    recordId: payment._id,
    newValue: { amount: payment.paidAmount, invoiceNumber: payment.invoiceNumber, gatewayTransactionId },
  });

  await fraudService.evaluatePaymentRisk({ payment });

  return payment;
};

// POST /api/payments/create-order
const createOrder = asyncHandler(async (req, res) => {
  const { patientId, programId, doctorId, couponCode, idempotencyKey } = req.body;

  if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can create payment orders' });
  if (!patientId || !programId || !doctorId) return res.status(400).json({ message: 'patientId, programId, and doctorId are required' });
  if (req.user._id.toString() !== patientId) return res.status(403).json({ message: 'Cannot create an order for another patient' });

  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey, patient: patientId });
    if (existing) {
      return res.json({
        orderId: existing.gatewayOrderId,
        amount: Math.round(existing.finalAmount * 100),
        currency: existing.currency,
        key: process.env.RAZORPAY_KEY_ID,
        originalAmount: existing.originalAmount,
        discountAmount: existing.discountAmount,
        finalAmount: existing.finalAmount,
        idempotent: true,
      });
    }
  }

  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!patient.mobileVerified) return res.status(400).json({ message: 'Mobile number must be verified before payment' });
  if (!patient.consentAccepted) return res.status(400).json({ message: 'Patient must accept consent before payment' });

  const [doctor, program] = await Promise.all([
    Doctor.findById(doctorId),
    Program.findById(programId),
  ]);
  if (!doctor || doctor.status !== 'approved' || !doctor.qrCodeActive) return res.status(400).json({ message: 'Invalid or unapproved doctor' });
  if (!program || !program.isActive) return res.status(400).json({ message: 'Invalid or inactive program' });
  if (patient.referringDoctor?.toString() !== doctor._id.toString()) return res.status(400).json({ message: 'Patient referral does not match this doctor' });

  await assertNoActiveProgramPurchase({ patientId, programId });

  const pricing = await resolveOrderPricing({ doctor, programId, couponCode });
  if (pricing.finalAmount <= 0) return res.status(400).json({ message: 'Final amount must be greater than zero' });

  const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const gatewayOrder = await createGatewayOrder({ amount: pricing.finalAmount, receipt });
  const order = await Order.create({
    orderId: gatewayOrder.id,
    patient: patientId,
    doctor: doctorId,
    agent: doctor.agent || null,
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
  });
});

// POST /api/payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
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
  if (order.expiresAt && order.expiresAt < new Date()) return res.status(400).json({ message: 'Order expired. Please create a new order.' });
  if (req.user.role !== 'patient' || req.user._id.toString() !== order.patient.toString()) {
    return res.status(403).json({ message: 'Cannot verify payment for another patient order' });
  }

  const doctor = await Doctor.findById(order.doctor);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const payment = await processSuccessfulPayment({
    order,
    doctor,
    gatewayTransactionId: razorpay_payment_id,
    signature: razorpay_signature,
    rawGatewayPayload: req.body,
    req,
  });

  res.json({
    message: 'Payment verified and program activated',
    invoiceNumber: payment.invoiceNumber,
    paymentId: payment._id,
  });
});

// POST /api/payments/webhook/razorpay
const razorpayWebhook = asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  verifyWebhookSignature({ rawBody, signature: req.headers['x-razorpay-signature'] });

  const payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
  if (payload.event !== 'payment.captured') return res.json({ received: true, ignored: true });

  const entity = payload.payload?.payment?.entity;
  if (!entity?.order_id || !entity?.id) return res.status(400).json({ message: 'Invalid Razorpay webhook payload' });

  const order = await Order.findOne({ gatewayOrderId: entity.order_id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const doctor = await Doctor.findById(order.doctor);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  await processSuccessfulPayment({
    order,
    doctor,
    gatewayTransactionId: entity.id,
    rawGatewayPayload: payload,
    req,
  });

  res.json({ received: true });
});

// GET /api/payments/:id
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('patient', 'fullName mobile').populate('doctor', 'fullName').populate('program', 'name');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  if (req.user.role === 'patient' && payment.patient?._id?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Cannot access another patient payment' });
  }

  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id }).select('_id');
    if (!doctor || payment.doctor?._id?.toString() !== doctor._id.toString()) return res.status(403).json({ message: 'Cannot access payment outside your referrals' });
  }

  if (!['admin', 'doctor', 'patient'].includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
  res.json(payment);
});

// GET /api/payments/:id/receipt
const getReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('patient', 'patientId fullName mobile email')
    .populate('doctor', 'doctorId fullName clinicName')
    .populate('program', 'programCode name')
    .populate('order');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  if (req.user.role === 'patient' && payment.patient?._id?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Cannot access another patient receipt' });
  }

  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.user._id }).select('_id');
    if (!doctor || payment.doctor?._id?.toString() !== doctor._id.toString()) return res.status(403).json({ message: 'Cannot access receipt outside your referrals' });
  }

  res.json({
    invoiceNumber: payment.invoiceNumber,
    paymentStatus: payment.status,
    paymentDate: payment.createdAt,
    patient: payment.patient,
    doctor: payment.doctor,
    program: payment.program,
    amounts: {
      originalAmount: payment.order?.originalAmount,
      discountAmount: payment.discountAmount,
      taxAmount: payment.taxAmount,
      gatewayCharges: payment.gatewayCharges,
      paidAmount: payment.paidAmount,
      refundAmount: payment.refundAmount,
    },
    gatewayTransactionId: payment.gatewayTransactionId,
    paymentMethod: payment.paymentMethod,
  });
});

module.exports = { createOrder, verifyPayment, razorpayWebhook, getPaymentById, getReceipt };
