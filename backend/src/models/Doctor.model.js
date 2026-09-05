const mongoose = require('mongoose');

const kycDocumentSchema = new mongoose.Schema({
  documentType: {
    type: String,
    enum: ['identity_proof', 'address_proof', 'medical_registration', 'cancelled_cheque', 'pan', 'profile_photo', 'other'],
    required: true,
  },
  storageProvider: { type: String, enum: ['s3', 'local'], default: 'local' },
  bucket: String,
  key: String,
  originalName: String,
  mimeType: String,
  size: Number,
  uploadedAt: Date,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true });

const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, unique: true },  // e.g. DR001
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },

  // Personal Details
  fullName: { type: String, required: true },
  mobile: { type: String, required: true },
  whatsapp: String,
  email: String,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dateOfBirth: Date,
  profilePhoto: String,

  // Professional Details
  qualification: String,
  specialization: String,
  medicalRegNumber: String,
  registrationCouncil: String,
  yearsOfExperience: Number,
  languagesSpoken: [String],
  consultationFee: Number,

  // Clinic Details
  clinicName: String,
  clinicAddress: String,
  city: String,
  state: String,
  postalCode: String,
  clinicContact: String,
  clinicEmail: String,
  clinicWorkingHours: String,
  googleMapsLink: String,
  clinicBranches: Number,

  // Referral Program / commercial proposal collected by Agent
  registrationDate: Date,
  approvalDate: Date,
  preferredProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  requestedPatientFee: Number,
  requestedFeeShareType: { type: String, enum: ['percentage', 'fixed'] },
  requestedFeeSharePercentage: Number,
  requestedFixedFeeShareAmount: Number,

  // Admin-approved commercial configuration used by payment/fee-share engine
  approvedPatientFee: Number,
  revenueModel: { type: String, enum: ['split', 'platform_fee'], default: 'split' },
  feeSharePercentage: Number,
  // SRS §27 — fee share type: percentage, fixed, or slab
  feeShareType: { type: String, enum: ['percentage', 'fixed', 'slab'], default: 'percentage' },
  fixedFeeShareAmount: Number,
  feeShareSlabs: [
    {
      minPatients: Number,
      maxPatients: Number,  // null means no upper limit
      percentage: Number,
    },
  ],
  feeShareCalculationBasis: {
    type: String,
    enum: ['gross', 'after_discount', 'net_after_charges'],
    default: 'gross',
  },
  feeShareHoldingDays: { type: Number, default: 15 },
  minWithdrawal: Number,
  maxWithdrawal: Number,
  payoutCycle: String,

  // Approval Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'documents_required', 'approved', 'rejected', 'suspended', 'inactive'],
    default: 'draft',
  },
  rejectionReason: String,
  suspensionReason: String,

  // QR Code
  referralCode: { type: String, unique: true, sparse: true },
  qrCodeUrl: String,
  qrCodeActive: { type: Boolean, default: false },

  // KYC
  kycStatus: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'], default: 'pending' },
  panNumber: String,
  identityProof: String,
  addressProof: String,
  medicalRegDoc: String,
  cancelledCheque: String,
  kycDocuments: [kycDocumentSchema],

  // Bank Details (sensitive — masked on display)
  bankAccountHolder: String,
  bankAccountNumber: String,  // store encrypted in production
  bankName: String,
  branchName: String,
  ifscCode: String,
  upiId: String,
  bankVerified: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate doctorId like DR00001 before saving
doctorSchema.pre('save', async function (next) {
  if (this.doctorId) return next();
  const count = await mongoose.model('Doctor').countDocuments();
  this.doctorId = `DR${String(count + 1).padStart(5, '0')}`;
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);
