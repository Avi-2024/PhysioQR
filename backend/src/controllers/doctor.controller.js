const QRCode = require('qrcode');
const Doctor = require('../models/Doctor.model');
const User = require('../models/User.model');
const Patient = require('../models/Patient.model');
const PatientProgram = require('../models/PatientProgram.model');
const { Payment } = require('../models/Payment.model');
const { FeeShare, WithdrawalRequest } = require('../models/FeeShare.model');
const { DoctorWallet } = require('../models/Wallet.model');
const { writeAuditLog } = require('../utils/auditLogger');
const { uploadDoctorKycDocument, createSignedDocumentUrl } = require('../services/storage.service');
const fraudService = require('../services/fraud.service');
const asyncHandler = require('../utils/asyncHandler');

const DOCTOR_REGISTRATION_FIELDS = [
  'fullName','mobile','whatsapp','email','gender','dateOfBirth','profilePhoto',
  'qualification','specialization','medicalRegNumber','registrationCouncil','yearsOfExperience','languagesSpoken','consultationFee',
  'clinicName','clinicAddress','city','state','postalCode','clinicContact','clinicEmail','clinicWorkingHours','googleMapsLink','clinicBranches',
  'requestedPatientFee',
];

function pickRegistrationPayload(body = {}) {
  return DOCTOR_REGISTRATION_FIELDS.reduce((payload, field) => {
    if (body[field] !== undefined) payload[field] = body[field];
    return payload;
  }, {});
}

// POST /api/doctors — Register a new doctor (agent/admin/self-registration).
// Registration accepts onboarding fields only. Approval, QR, pricing approval,
// fee-share, KYC/bank and payout fields can never be injected through this route.
const registerDoctor = asyncHandler(async (req, res) => {
  const payload = { ...pickRegistrationPayload(req.body), status: 'submitted', registrationDate: new Date() };
  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.mobile) payload.mobile = String(payload.mobile).trim();
  if (payload.medicalRegNumber) payload.medicalRegNumber = String(payload.medicalRegNumber).trim();

  const duplicateClauses = [];
  if (payload.mobile) duplicateClauses.push({ mobile: payload.mobile });
  if (payload.email) duplicateClauses.push({ email: payload.email });
  if (payload.medicalRegNumber) duplicateClauses.push({ medicalRegNumber: payload.medicalRegNumber });
  if (duplicateClauses.length) {
    const existing = await Doctor.findOne({ $or: duplicateClauses }).select('_id doctorId fullName mobile email medicalRegNumber').lean();
    if (existing) return res.status(409).json({ message: 'A doctor with the same mobile, email, or medical registration number already exists' });
  }

  if (req.user?.role === 'agent') {
    const Agent = require('../models/Agent.model');
    const agent = await Agent.findOne({ user: req.user._id }).select('_id status');
    if (!agent) return res.status(404).json({ message: 'Agent profile not found' });
    if (agent.status !== 'active') return res.status(403).json({ message: 'Inactive agent cannot register doctors' });
    payload.agent = agent._id;
  } else if (req.user?.role === 'admin' && req.body.agent) {
    payload.agent = req.body.agent;
  }

  const doctor = await Doctor.create(payload);
  await writeAuditLog({ req, action: 'doctor_registered', module: 'Doctor', recordId: doctor._id, newValue: { fullName: doctor.fullName, status: doctor.status, agent: doctor.agent } });
  res.status(201).json(doctor);
});

// GET /api/doctors
const getAllDoctors = asyncHandler(async (req, res) => {
  const { status, agent } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (agent) filter.agent = agent;
  const doctors = await Doctor.find(filter).populate('agent', 'fullName').sort({ createdAt: -1 });
  res.json(doctors);
});

// GET /api/doctors/:id
const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('agent').lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (doctor.bankAccountNumber) doctor.bankAccountNumber = 'XXXXXX' + doctor.bankAccountNumber.slice(-4);
  res.json(doctor);
});

const uploadKycDocument = asyncHandler(async (req, res) => {
  const { documentType } = req.body;
  if (!documentType) return res.status(400).json({ message: 'documentType is required' });
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  const metadata = await uploadDoctorKycDocument({ doctor, documentType, file: req.file });
  metadata.uploadedBy = req.user._id;
  doctor.kycDocuments.push(metadata);
  doctor.kycStatus = doctor.kycStatus === 'approved' ? 'approved' : 'submitted';
  if (documentType === 'identity_proof') doctor.identityProof = metadata.key;
  if (documentType === 'address_proof') doctor.addressProof = metadata.key;
  if (documentType === 'medical_registration') doctor.medicalRegDoc = metadata.key;
  if (documentType === 'cancelled_cheque') doctor.cancelledCheque = metadata.key;
  if (documentType === 'profile_photo') doctor.profilePhoto = metadata.key;
  await doctor.save();
  await writeAuditLog({ req, action: 'doctor_kyc_document_uploaded', module: 'Doctor', recordId: doctor._id, newValue: { documentType, key: metadata.key, storageProvider: metadata.storageProvider } });
  res.status(201).json({ message: 'KYC document uploaded', document: metadata });
});

const getKycDocumentAccess = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).select('kycDocuments');
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  const document = doctor.kycDocuments.id(req.params.documentId);
  if (!document) return res.status(404).json({ message: 'KYC document not found' });
  const access = await createSignedDocumentUrl({ document });
  await writeAuditLog({ req, action: 'doctor_kyc_document_accessed', module: 'Doctor', recordId: doctor._id, newValue: { documentId: document._id, storageProvider: document.storageProvider } });
  res.json(access);
});

const uploadMyKycDocument = asyncHandler(async (req, res) => {
  const { documentType } = req.body;
  if (!documentType) return res.status(400).json({ message: 'documentType is required' });
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  const metadata = await uploadDoctorKycDocument({ doctor, documentType, file: req.file });
  metadata.uploadedBy = req.user._id;
  doctor.kycDocuments.push(metadata);
  doctor.kycStatus = doctor.kycStatus === 'approved' ? 'approved' : 'submitted';
  if (documentType === 'identity_proof') doctor.identityProof = metadata.key;
  if (documentType === 'address_proof') doctor.addressProof = metadata.key;
  if (documentType === 'medical_registration') doctor.medicalRegDoc = metadata.key;
  if (documentType === 'cancelled_cheque') doctor.cancelledCheque = metadata.key;
  if (documentType === 'profile_photo') doctor.profilePhoto = metadata.key;
  await doctor.save();
  await writeAuditLog({ req, action: 'doctor_kyc_document_uploaded', module: 'Doctor', recordId: doctor._id, newValue: { documentType, key: metadata.key, storageProvider: metadata.storageProvider, uploadedBy: 'doctor' } });
  res.status(201).json({ message: 'KYC document uploaded', document: metadata });
});

const getMyKycDocumentAccess = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id }).select('kycDocuments');
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  const document = doctor.kycDocuments.id(req.params.documentId);
  if (!document) return res.status(404).json({ message: 'KYC document not found' });
  const access = await createSignedDocumentUrl({ document });
  res.json(access);
});

const approveDoctor = asyncHandler(async (req, res) => {
  const { approvedPatientFee, feeSharePercentage, feeShareHoldingDays, revenueModel, feeShareType, fixedFeeShareAmount, password } = req.body;
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  const prev = { status: doctor.status };
  doctor.status = 'approved';
  doctor.approvalDate = new Date();
  doctor.approvedPatientFee = approvedPatientFee;
  doctor.feeSharePercentage = feeSharePercentage;
  doctor.feeShareHoldingDays = feeShareHoldingDays || 15;
  doctor.revenueModel = revenueModel || 'split';
  if (feeShareType) doctor.feeShareType = feeShareType;
  if (fixedFeeShareAmount) doctor.fixedFeeShareAmount = fixedFeeShareAmount;
  const referralUrl = `${process.env.APP_URL}/register?doctor=${doctor.doctorId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(referralUrl);
  doctor.referralCode = doctor.doctorId;
  doctor.qrCodeUrl = qrCodeDataUrl;
  doctor.qrCodeActive = true;
  let loginUser = doctor.user ? await User.findById(doctor.user) : null;
  const generatedPassword = password || `Doctor@${Math.floor(100000 + Math.random() * 900000)}`;
  if (!loginUser) {
    const existing = await User.findOne({ $or: [...(doctor.email ? [{ email: doctor.email.trim().toLowerCase() }] : []), ...(doctor.mobile ? [{ mobile: doctor.mobile.trim() }] : [])] });
    if (existing) { loginUser = existing; if (loginUser.role !== 'doctor') return res.status(409).json({ message: 'Email/mobile already belongs to another role' }); }
    else loginUser = await User.create({ role: 'doctor', email: doctor.email?.trim().toLowerCase(), mobile: doctor.mobile?.trim(), password: generatedPassword, status: 'active' });
    doctor.user = loginUser._id;
  } else loginUser.status = 'active';
  await doctor.save();
  loginUser.profileRef = doctor._id; loginUser.profileModel = 'Doctor'; await loginUser.save();
  await DoctorWallet.findOneAndUpdate({ doctor: doctor._id }, { $setOnInsert: { doctor: doctor._id } }, { upsert: true, new: true });
  await writeAuditLog({ req, action: 'doctor_approved', module: 'Doctor', recordId: doctor._id, previousValue: prev, newValue: { status: doctor.status, approvedPatientFee, feeSharePercentage } });
  res.json({ doctor, temporaryPassword: password ? undefined : generatedPassword });
});

const rejectDoctor = asyncHandler(async (req, res) => { const doctor = await Doctor.findByIdAndUpdate(req.params.id,{ status:'rejected', rejectionReason:req.body.reason },{new:true}); if(!doctor)return res.status(404).json({message:'Doctor not found'}); res.json(doctor); });
const requestDoctorDocuments = asyncHandler(async (req,res)=>{ const doctor=await Doctor.findByIdAndUpdate(req.params.id,{status:'documents_required'},{new:true}); if(!doctor)return res.status(404).json({message:'Doctor not found'}); res.json(doctor); });
const suspendDoctor = asyncHandler(async (req,res)=>{ const doctor=await Doctor.findByIdAndUpdate(req.params.id,{status:'suspended',suspensionReason:req.body.reason,qrCodeActive:false},{new:true}); if(!doctor)return res.status(404).json({message:'Doctor not found'}); res.json(doctor); });
const generateQrCode = asyncHandler(async(req,res)=>{ const doctor=await Doctor.findById(req.params.id);if(!doctor)return res.status(404).json({message:'Doctor not found'});const url=`${process.env.APP_URL}/register?doctor=${doctor.doctorId}`;doctor.referralCode=doctor.doctorId;doctor.qrCodeUrl=await QRCode.toDataURL(url);doctor.qrCodeActive=true;await doctor.save();res.json(doctor);});
const disableQrCode = asyncHandler(async(req,res)=>{const doctor=await Doctor.findByIdAndUpdate(req.params.id,{qrCodeActive:false},{new:true});if(!doctor)return res.status(404).json({message:'Doctor not found'});res.json(doctor);});
const reactivateQrCode = asyncHandler(async(req,res)=>{const doctor=await Doctor.findByIdAndUpdate(req.params.id,{qrCodeActive:true},{new:true});if(!doctor)return res.status(404).json({message:'Doctor not found'});res.json(doctor);});

const getMyProfile = asyncHandler(async(req,res)=>{const doctor=await Doctor.findOne({user:req.user._id}).select('-bankAccountNumber -ifscCode -panNumber');if(!doctor)return res.status(404).json({message:'Doctor profile not found'});res.json(doctor);});
const updateMyProfile = asyncHandler(async(req,res)=>{const doctor=await Doctor.findOne({user:req.user._id});if(!doctor)return res.status(404).json({message:'Doctor profile not found'});const allowed=['fullName','whatsapp','email','profilePhoto','clinicName','clinicAddress','city','state','postalCode','clinicContact','clinicEmail','clinicWorkingHours','googleMapsLink','languagesSpoken'];allowed.forEach(f=>{if(req.body[f]!==undefined)doctor[f]=req.body[f]});await doctor.save();res.json(doctor);});
const getMySummary = asyncHandler(async(req,res)=>{const doctor=await Doctor.findOne({user:req.user._id});if(!doctor)return res.status(404).json({message:'Doctor profile not found'});const patients=await Patient.countDocuments({referringDoctor:doctor._id});const payments=await Payment.find({doctor:doctor._id,status:{$in:['successful','manually_verified','partially_refunded','refunded']}});const revenue=payments.reduce((sum,p)=>sum+Math.max((p.paidAmount||0)-(p.refundAmount||0),0),0);const wallet=await DoctorWallet.findOne({doctor:doctor._id});res.json({patients,revenue,wallet});});
const getMyPatients = asyncHandler(async(req,res)=>{const doctor=await Doctor.findOne({user:req.user._id});if(!doctor)return res.status(404).json({message:'Doctor profile not found'});const patients=await Patient.find({referringDoctor:doctor._id}).select('patientId fullName mobile createdAt status');res.json(patients);});
const getMyQrStats = asyncHandler(async(req,res)=>{const doctor=await Doctor.findOne({user:req.user._id});if(!doctor)return res.status(404).json({message:'Doctor profile not found'});res.json({referralCode:doctor.referralCode,qrCodeUrl:doctor.qrCodeUrl,qrCodeActive:doctor.qrCodeActive});});

module.exports = { registerDoctor,getAllDoctors,getDoctorById,approveDoctor,rejectDoctor,requestDoctorDocuments,suspendDoctor,generateQrCode,disableQrCode,reactivateQrCode,uploadKycDocument,getKycDocumentAccess,uploadMyKycDocument,getMyKycDocumentAccess,getMyProfile,updateMyProfile,getMySummary,getMyPatients,getMyQrStats };
