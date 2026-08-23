const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },

  originalAmount: Number,
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  gatewayCharges: { type: Number, default: 0 },
  finalAmount: Number,
  currency: { type: String, default: 'INR' },

  couponCode: String,
  paymentMethod: String,
  gatewayProvider: { type: String, default: 'razorpay' },
  gatewayOrderId: String,
  gatewayReceipt: String,
  idempotencyKey: String,

  pricingSnapshot: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['created', 'pending', 'successful', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'chargeback', 'manually_verified'],
    default: 'created',
  },
  failureReason: String,
  paidAt: Date,
  expiresAt: Date,
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },

  gatewayProvider: { type: String, default: 'razorpay' },
  gatewayOrderId: String,
  gatewayTransactionId: String,
  gatewaySignature: String,
  rawGatewayPayload: mongoose.Schema.Types.Mixed,
  paymentMethod: String,
  paidAmount: Number,
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  gatewayCharges: { type: Number, default: 0 },
  refundAmount: { type: Number, default: 0 },

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
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  invoiceNumber: String,
  verifiedAt: Date,
}, { timestamps: true });

orderSchema.index({ patient: 1, program: 1, status: 1, createdAt: -1 });
orderSchema.index({ gatewayOrderId: 1 }, { unique: true, sparse: true });
orderSchema.index({ patient: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
paymentSchema.index({ gatewayTransactionId: 1 }, { unique: true, sparse: true });
// One checkout order can produce only one financially verified payment. Statuses
// after refund/dispute remain inside the same uniqueness set.
paymentSchema.index(
  { order: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['successful', 'manually_verified', 'refunded', 'partially_refunded', 'disputed', 'chargeback'] },
    },
  },
);
paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ patient: 1, createdAt: -1 });
paymentSchema.index({ doctor: 1, createdAt: -1 });
paymentSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });

const Order = mongoose.model('Order', orderSchema);
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Order, Payment };
