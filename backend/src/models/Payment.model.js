const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },   // e.g. ORD/2026/000001
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },

  // Amounts — locked at time of order creation
  originalAmount: Number,
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  gatewayCharges: { type: Number, default: 0 },
  finalAmount: Number,

  couponCode: String,
  paymentMethod: String,
  gatewayOrderId: String,   // Razorpay order ID

  status: {
    type: String,
    enum: ['created', 'pending', 'successful', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'chargeback', 'manually_verified'],
    default: 'created',
  },
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },

  gatewayTransactionId: String,
  paymentMethod: String,
  paidAmount: Number,
  discountAmount: { type: Number, default: 0 },  // SRS §24.4
  taxAmount: { type: Number, default: 0 },
  gatewayCharges: { type: Number, default: 0 },
  refundAmount: { type: Number, default: 0 },

  // Fee share snapshot — locked at payment time
  doctorFeeShare: Number,
  platformShare: Number,
  feeSharePercentage: Number,
  feeShareBasis: String,

  status: {
    type: String,
    enum: ['created', 'pending', 'successful', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'chargeback', 'manually_verified'],
    default: 'pending',
  },
  failureReason: String,
  isDuplicate: { type: Boolean, default: false },
  invoiceNumber: String,
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Order, Payment };
