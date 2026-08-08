const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Order, Payment } = require('../models/Payment.model');
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const PatientProgram = require('../models/PatientProgram.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const { FeeShare } = require('../models/FeeShare.model');
const { calculateFeeShare } = require('../utils/feeCalculator');
const { generateInvoiceNumber } = require('../utils/idGenerator');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
// SRS §24.2 — System creates an order, gateway checkout opens
const createOrder = asyncHandler(async (req, res) => {
  const { patientId, programId, doctorId, couponCode } = req.body;

  if (!patientId || !programId || !doctorId) {
    return res.status(400).json({ message: 'patientId, programId, and doctorId are required' });
  }

  // SRS §47 — Patient must verify mobile before payment
  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!patient.mobileVerified) return res.status(400).json({ message: 'Mobile number must be verified before payment' });
  if (!patient.consentAccepted) return res.status(400).json({ message: 'Patient must accept consent before payment' });

  const doctor = await Doctor.findById(doctorId);
  if (!doctor || doctor.status !== 'approved') return res.status(400).json({ message: 'Invalid or unapproved doctor' });

  // SRS §22 — Amount depends on revenue model
  let amount = doctor.approvedPatientFee || 0;
  let discountAmount = 0;

  // Apply coupon if provided (SRS §23)
  if (couponCode) {
    const Coupon = require('../models/Coupon.model');
    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase(), isActive: true });
    if (coupon && coupon.expiryDate > new Date() && coupon.usedCount < (coupon.usageLimit || Infinity)) {
      if (coupon.discountType === 'fixed') {
        discountAmount = Math.min(coupon.discountValue, amount);
      } else {
        discountAmount = Math.min((amount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity);
      }
    }
  }

  const finalAmount = Math.max(amount - discountAmount, 0);

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(finalAmount * 100), // paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
  });

  const order = await Order.create({
    orderId: razorpayOrder.id,
    patient: patientId,
    doctor: doctorId,
    program: programId,
    originalAmount: amount,
    discountAmount,
    finalAmount,
    couponCode: couponCode || null,
    gatewayOrderId: razorpayOrder.id,
    status: 'created',
  });

  res.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    originalAmount: amount,
    discountAmount,
    finalAmount,
  });
});

// POST /api/payments/verify
// SRS §24.2 — Backend verifies payment, activates program, creates fee share
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Verify Razorpay signature (SRS §43 — Secure payment verification)
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification failed — invalid signature' });
  }

  const order = await Order.findOne({ gatewayOrderId: razorpay_order_id });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  // SRS §25.2 — Detect duplicate payment
  const duplicate = await Payment.findOne({ gatewayTransactionId: razorpay_payment_id });
  if (duplicate) {
    // Flag it but don't activate program again
    await Payment.findByIdAndUpdate(duplicate._id, { isDuplicate: true });
    return res.status(400).json({ message: 'Duplicate payment detected. Admin has been notified.' });
  }

  const doctor = await Doctor.findById(order.doctor);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  // SRS §27 — Calculate fee share based on doctor's configured model
  const totalPaidPatients = await Payment.countDocuments({ doctor: doctor._id, status: 'successful' });
  const { doctorShare, platformShare } = calculateFeeShare({
    paidAmount: order.finalAmount,
    discountAmount: order.discountAmount,
    gatewayCharges: 0,
    feeShareType: doctor.feeShareType || 'percentage',
    percentage: doctor.feeSharePercentage || 0,
    fixedAmount: doctor.fixedFeeShareAmount || 0,
    slabs: doctor.feeShareSlabs || [],
    totalPaidPatients: totalPaidPatients + 1,
    basis: doctor.feeShareCalculationBasis || 'gross',
    revenueModel: doctor.revenueModel || 'split',
  });

  // Generate invoice number (SRS §26)
  const invoiceSeq = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const payment = await Payment.create({
    order: order._id,
    patient: order.patient,
    doctor: order.doctor,
    agent: doctor.agent || null,
    program: order.program,
    gatewayTransactionId: razorpay_payment_id,
    paidAmount: order.finalAmount,
    doctorFeeShare: doctorShare,
    platformShare,
    feeSharePercentage: doctor.feeSharePercentage,
    feeShareBasis: doctor.feeShareCalculationBasis,
    status: 'successful',
    invoiceNumber: generateInvoiceNumber(invoiceSeq),
  });

  // Update order status
  order.status = 'successful';
  await order.save();

  // SRS §47 — Lock patient referral after payment
  await Patient.findByIdAndUpdate(order.patient, { referralLocked: true });

  // SRS §21 — Activate patient program and set expiry date
  const holdingDays = doctor.feeShareHoldingDays || 15;
  const availableDate = new Date(Date.now() + holdingDays * 24 * 60 * 60 * 1000);

  // Fetch program duration to calculate expiry (SRS §21.2)
  const Program = require('../models/Program.model');
  const program = await Program.findById(order.program);
  const durationDays = program?.durationDays || 30;
  const gracePeriodDays = 3; // default grace period
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + (durationDays + gracePeriodDays) * 24 * 60 * 60 * 1000);

  await PatientProgram.findOneAndUpdate(
    { patient: order.patient, program: order.program },
    { status: 'active', startDate, expiryDate, gracePeriodDays, payment: payment._id, doctor: doctor._id },
    { upsert: true, new: true }
  );

  // Increment coupon usedCount if coupon was applied (SRS §23)
  if (order.couponCode) {
    const Coupon = require('../models/Coupon.model');
    await Coupon.findOneAndUpdate(
      { couponCode: order.couponCode },
      { $inc: { usedCount: 1 } }
    );
  }

  // SRS §22.1 — Only create fee share for split model
  if (doctor.revenueModel === 'split' && doctorShare > 0) {
    await FeeShare.create({
      doctor: doctor._id,
      payment: payment._id,
      patient: order.patient,
      amount: doctorShare,
      percentage: doctor.feeSharePercentage,
      calculationBasis: doctor.feeShareCalculationBasis,
      holdingDays,
      availableDate,
      status: 'pending',
    });

    // SRS §31.1 — Every wallet change creates a ledger entry
    let wallet = await DoctorWallet.findOne({ doctor: doctor._id });
    if (!wallet) wallet = await DoctorWallet.create({ doctor: doctor._id });

    const prev = wallet.pendingBalance;
    wallet.pendingBalance += doctorShare;
    wallet.lifetimeEarnings += doctorShare;
    await wallet.save();

    await WalletTransaction.create({
      doctor: doctor._id,
      wallet: wallet._id,
      relatedPayment: payment._id,
      type: 'fee_share_pending',
      amount: doctorShare,
      previousBalance: prev,
      newBalance: wallet.pendingBalance,
      reason: 'Fee share from patient payment',
    });
  }

  // SRS §41 — Audit log
  await writeAuditLog({ req, action: 'payment_verified', module: 'Payment', recordId: payment._id, newValue: { amount: order.finalAmount, invoiceNumber: payment.invoiceNumber } });

  res.json({
    message: 'Payment verified and program activated',
    invoiceNumber: payment.invoiceNumber,
    paymentId: payment._id,
  });
});

// GET /api/payments/:id
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('patient', 'fullName mobile').populate('doctor', 'fullName').populate('program', 'name');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json(payment);
});

module.exports = { createOrder, verifyPayment, getPaymentById };
