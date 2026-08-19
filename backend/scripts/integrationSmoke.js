require('dotenv').config();
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.OTP_PROVIDER = 'db';
process.env.NOTIFICATION_DELIVERY_MODE = 'log';
process.env.PAYMENT_GATEWAY_MODE = 'mock';
process.env.DOCUMENT_STORAGE_MODE = 'local';
process.env.FRAUD_QR_SCAN_THRESHOLD = '2';

const mongoose = require('mongoose');
const app = require('../src/app');

const User = require('../src/models/User.model');
const AuthSession = require('../src/models/AuthSession.model');
const Agent = require('../src/models/Agent.model');
const Doctor = require('../src/models/Doctor.model');
const Patient = require('../src/models/Patient.model');
const Otp = require('../src/models/Otp.model');
const PainCategory = require('../src/models/PainCategory.model');
const AssessmentQuestion = require('../src/models/AssessmentQuestion.model');
const PatientAssessment = require('../src/models/PatientAssessment.model');
const PatientConsent = require('../src/models/PatientConsent.model');
const Program = require('../src/models/Program.model');
const PatientProgram = require('../src/models/PatientProgram.model');
const ProgramProgress = require('../src/models/ProgramProgress.model');
const { Exercise, ProgramDay } = require('../src/models/Exercise.model');
const QrScan = require('../src/models/QrScan.model');
const Notification = require('../src/models/Notification.model');
const SupportTicket = require('../src/models/SupportTicket.model');
const ClinicVisit = require('../src/models/ClinicVisit.model');
const { Order, Payment } = require('../src/models/Payment.model');
const { FeeShare, WithdrawalRequest } = require('../src/models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../src/models/Wallet.model');
const AuditLog = require('../src/models/AuditLog.model');
const Payout = require('../src/models/Payout.model');
const Counter = require('../src/models/Counter.model');
const FraudCase = require('../src/models/FraudCase.model');
const Refund = require('../src/models/Refund.model');

const runId = `SMOKE_${Date.now()}`;
const created = {
  users: [],
  agents: [],
  doctors: [],
  patients: [],
  painCategories: [],
  questions: [],
  assessments: [],
  consents: [],
  programs: [],
  patientPrograms: [],
  programProgress: [],
  exercises: [],
  programDays: [],
  qrScans: [],
  wallets: [],
  notifications: [],
  supportTickets: [],
  clinicVisits: [],
  orders: [],
  payments: [],
  feeShares: [],
  withdrawals: [],
  payouts: [],
  fraudCases: [],
  refunds: [],
};

let server;
let baseUrl;

const request = async (path, { method = 'GET', token, body } = {}) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
};

const requestFailure = async (path, { method = 'GET', token, body } = {}) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (response.ok) throw new Error(`${method} ${path} unexpectedly succeeded: ${JSON.stringify(data)}`);
  return { status: response.status, data };
};

const cleanup = async () => {
  await Promise.allSettled([
    PatientAssessment.deleteMany({ _id: { $in: created.assessments } }),
    PatientConsent.deleteMany({ _id: { $in: created.consents } }),
    AssessmentQuestion.deleteMany({ _id: { $in: created.questions } }),
    PainCategory.deleteMany({ _id: { $in: created.painCategories } }),
    ProgramProgress.deleteMany({ _id: { $in: created.programProgress } }),
    PatientProgram.deleteMany({ _id: { $in: created.patientPrograms } }),
    ProgramDay.deleteMany({ _id: { $in: created.programDays } }),
    Exercise.deleteMany({ _id: { $in: created.exercises } }),
    Program.deleteMany({ _id: { $in: created.programs } }),
    QrScan.deleteMany({ _id: { $in: created.qrScans } }),
    Notification.deleteMany({ _id: { $in: created.notifications } }),
    SupportTicket.deleteMany({ _id: { $in: created.supportTickets } }),
    ClinicVisit.deleteMany({ _id: { $in: created.clinicVisits } }),
    FeeShare.deleteMany({ _id: { $in: created.feeShares } }),
    WithdrawalRequest.deleteMany({ _id: { $in: created.withdrawals } }),
    Payout.deleteMany({ _id: { $in: created.payouts } }),
    FraudCase.deleteMany({
      $or: [
        { _id: { $in: created.fraudCases } },
        { relatedRecord: { $regex: runId } },
        { summary: { $regex: runId } },
      ],
    }),
    Refund.deleteMany({ _id: { $in: created.refunds } }),
    Payment.deleteMany({ _id: { $in: created.payments } }),
    Order.deleteMany({ _id: { $in: created.orders } }),
    WalletTransaction.deleteMany({ doctor: { $in: created.doctors } }),
    DoctorWallet.deleteMany({ doctor: { $in: created.doctors } }),
    Patient.deleteMany({ _id: { $in: created.patients } }),
    AuthSession.deleteMany({
      $or: [
        { user: { $in: created.users } },
        { patient: { $in: created.patients } },
      ],
    }),
    Doctor.deleteMany({ _id: { $in: created.doctors } }),
    Agent.deleteMany({ _id: { $in: created.agents } }),
    User.deleteMany({ _id: { $in: created.users } }),
    Otp.deleteMany({ mobile: { $regex: runId } }),
    AuditLog.deleteMany({
      recordId: {
        $in: [
          ...created.users,
          ...created.agents,
          ...created.doctors,
          ...created.patients,
          ...created.painCategories,
          ...created.questions,
          ...created.assessments,
          ...created.supportTickets,
          ...created.clinicVisits,
          ...created.patientPrograms,
          ...created.programProgress,
          ...created.orders,
          ...created.payments,
        ].map(String),
      },
    }),
  ]);
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

  await mongoose.connect(process.env.MONGO_URI);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const adminEmail = `admin.${runId.toLowerCase()}@physioqr.test`;
  const adminPassword = `Admin@${runId}`;
  const admin = await User.create({
    role: 'admin',
    email: adminEmail,
    password: adminPassword,
    status: 'active',
  });
  created.users.push(admin._id);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });

  if (login.role !== 'admin' || !login.token) throw new Error('Admin login token not returned');
  let adminToken = login.token;
  const originalAdminRefreshToken = login.refreshToken;
  if (!originalAdminRefreshToken || !login.sessionId) throw new Error('Admin login did not return refresh session');

  const refreshedAdmin = await request('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: originalAdminRefreshToken },
  });
  if (!refreshedAdmin.token || !refreshedAdmin.refreshToken || refreshedAdmin.refreshToken === originalAdminRefreshToken) {
    throw new Error('Refresh token rotation failed');
  }
  adminToken = refreshedAdmin.token;

  const oldRefreshFailure = await requestFailure('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: originalAdminRefreshToken },
  });
  if (oldRefreshFailure.status !== 401) throw new Error('Old refresh token was not rejected after rotation');

  const adminSessions = await request('/api/auth/sessions', { token: adminToken });
  if (!adminSessions.sessions.length) throw new Error('Active admin sessions were not listed');

  const agentMobile = `91${String(Date.now()).slice(-8)}`;
  const agentPassword = `Agent@${runId}`;
  const agentResponse = await request('/api/agents', {
    method: 'POST',
    token: adminToken,
    body: {
      fullName: `Test Agent ${runId}`,
      mobile: agentMobile,
      email: `agent.${runId.toLowerCase()}@physioqr.test`,
      password: agentPassword,
      city: 'Smoke City',
      assignedRegion: 'Smoke Region',
    },
  });
  created.agents.push(agentResponse.agent._id);
  created.users.push(agentResponse.user.id);

  const agentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { mobile: agentMobile, password: agentPassword },
  });
  if (agentLogin.role !== 'agent') throw new Error('Agent login failed');

  const doctorMobile = `92${String(Date.now()).slice(-8)}`;
  const doctorEmail = `doctor.${runId.toLowerCase()}@physioqr.test`;
  const doctorResponse = await request('/api/doctors', {
    method: 'POST',
    token: agentLogin.token,
    body: {
      fullName: `Dr Test ${runId}`,
      mobile: doctorMobile,
      email: doctorEmail,
      clinicName: `Smoke Clinic ${runId}`,
      specialization: 'Physiotherapy',
      city: 'Smoke City',
    },
  });
  created.doctors.push(doctorResponse._id);

  const doctorPassword = `Doctor@${runId}`;
  const approvedDoctor = await request(`/api/doctors/${doctorResponse._id}/approve`, {
    method: 'POST',
    token: adminToken,
    body: {
      approvedPatientFee: 500,
      feeSharePercentage: 60,
      feeShareHoldingDays: 15,
      revenueModel: 'split',
      password: doctorPassword,
    },
  });
  if (!approvedDoctor.doctor.qrCodeActive) throw new Error('Doctor QR was not activated on approval');
  created.users.push(approvedDoctor.doctor.user);
  created.wallets.push(approvedDoctor.doctor._id);

  const doctorLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: doctorEmail, password: doctorPassword },
  });
  if (doctorLogin.role !== 'doctor') throw new Error('Doctor login failed');

  const kycForm = new FormData();
  kycForm.append('documentType', 'medical_registration');
  kycForm.append('document', new Blob([`medical registration ${runId}`], { type: 'text/plain' }), `${runId}.txt`);
  const kycUpload = await request(`/api/doctors/${doctorResponse._id}/kyc-documents`, {
    method: 'POST',
    token: adminToken,
    body: kycForm,
  });
  if (kycUpload.document.documentType !== 'medical_registration' || !kycUpload.document.key) {
    throw new Error('Doctor KYC document upload failed');
  }

  const kycDoctorRecord = await Doctor.findById(doctorResponse._id).select('kycDocuments');
  const uploadedKycDocument = kycDoctorRecord.kycDocuments.find((item) => item.key === kycUpload.document.key);
  if (!uploadedKycDocument) throw new Error('Uploaded KYC document metadata was not persisted');

  const kycAccess = await request(`/api/doctors/${doctorResponse._id}/kyc-documents/${uploadedKycDocument._id}/access`, {
    token: adminToken,
  });
  if (kycAccess.storageProvider !== 'local' || kycAccess.url !== null) {
    throw new Error('KYC document access policy did not return local-mode metadata');
  }

  const doctorKycAccessFailure = await requestFailure(`/api/doctors/${doctorResponse._id}/kyc-documents/${uploadedKycDocument._id}/access`, {
    token: doctorLogin.token,
  });
  if (doctorKycAccessFailure.status !== 403) throw new Error('Doctor could access admin-only KYC document URL');

  const kycBank = await request(`/api/doctors/${doctorResponse._id}/kyc-bank`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      kycStatus: 'approved',
      panNumber: `ABCDE${String(Date.now()).slice(-4)}F`,
      bankAccountHolder: `Dr Test ${runId}`,
      bankAccountNumber: `123456${String(Date.now()).slice(-6)}`,
      bankName: 'Smoke Bank',
      branchName: 'Smoke Branch',
      ifscCode: 'HDFC0001234',
      upiId: `doctor.${runId.toLowerCase()}@upi`,
      bankVerified: true,
    },
  });
  if (kycBank.doctor.kycStatus !== 'approved' || !kycBank.doctor.bankVerified) {
    throw new Error('Doctor KYC/bank verification failed');
  }

  const agentAdminOnlyFailure = await requestFailure('/api/agents', { token: agentLogin.token });
  if (agentAdminOnlyFailure.status !== 403) throw new Error('Agent accessed admin-only agent list');

  const patientAdminOnlyFailure = await requestFailure('/api/admin/dashboard', { token: doctorLogin.token });
  if (patientAdminOnlyFailure.status !== 403) throw new Error('Doctor accessed admin dashboard');

  const followUpDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const clinicVisit = await request('/api/agents/me/visits', {
    method: 'POST',
    token: agentLogin.token,
    body: {
      doctor: doctorResponse._id,
      clinicName: `Smoke Clinic Visit ${runId}`,
      visitDate: new Date().toISOString(),
      visitTime: '11:30',
      clinicLocation: 'Smoke City',
      discussionDetails: 'Integration clinic visit',
      doctorInterestLevel: 'interested',
      documentsCollected: ['medical_registration'],
      followUpDate,
      followUpNotes: 'Integration follow-up',
      outcome: 'follow_up_required',
    },
  });
  created.clinicVisits.push(clinicVisit._id);

  const visitReminder = await Notification.findOne({
    type: 'clinic_visit_reminder',
    message: { $regex: clinicVisit.clinicName },
  });
  if (visitReminder) created.notifications.push(visitReminder._id);

  const myVisits = await request('/api/agents/me/visits', { token: agentLogin.token });
  if (!myVisits.items.find((item) => item._id === clinicVisit._id)) {
    throw new Error('Agent clinic visit was not listed');
  }

  const visitDetail = await request(`/api/agents/me/visits/${clinicVisit._id}`, { token: agentLogin.token });
  if (visitDetail._id !== clinicVisit._id) throw new Error('Agent clinic visit detail failed');

  const secondAgentMobile = `95${String(Date.now()).slice(-8)}`;
  const secondAgentPassword = `Agent2@${runId}`;
  const secondAgentResponse = await request('/api/agents', {
    method: 'POST',
    token: adminToken,
    body: {
      fullName: `Second Agent ${runId}`,
      mobile: secondAgentMobile,
      email: `agent2.${runId.toLowerCase()}@physioqr.test`,
      password: secondAgentPassword,
      city: 'Smoke City',
      assignedRegion: 'Other Region',
    },
  });
  created.agents.push(secondAgentResponse.agent._id);
  created.users.push(secondAgentResponse.user.id);
  const secondAgentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { mobile: secondAgentMobile, password: secondAgentPassword },
  });
  const wrongAgentVisitFailure = await requestFailure(`/api/agents/me/visits/${clinicVisit._id}`, { token: secondAgentLogin.token });
  if (wrongAgentVisitFailure.status !== 404) throw new Error('Another agent accessed this agent clinic visit');

  const updatedVisit = await request(`/api/agents/me/visits/${clinicVisit._id}`, {
    method: 'PATCH',
    token: agentLogin.token,
    body: { followUpNotes: `Updated follow-up ${runId}`, nextAction: 'Collect pending documents' },
  });
  if (updatedVisit.followUpNotes !== `Updated follow-up ${runId}`) throw new Error('Agent clinic visit update failed');

  const followUps = await request('/api/agents/me/follow-ups?due=true', { token: agentLogin.token });
  if (!followUps.items.find((item) => item._id === clinicVisit._id)) {
    throw new Error('Agent due follow-up was not listed');
  }

  const completedFollowUp = await request(`/api/agents/me/visits/${clinicVisit._id}/follow-up`, {
    method: 'PATCH',
    token: agentLogin.token,
    body: { followUpStatus: 'completed', note: `Completed ${runId}` },
  });
  if (completedFollowUp.followUpStatus !== 'completed') throw new Error('Agent follow-up completion failed');

  const adminVisits = await request('/api/agents/visits', { token: adminToken });
  if (!adminVisits.items.find((item) => item._id === clinicVisit._id)) {
    throw new Error('Admin clinic visit list failed');
  }

  const category = await request('/api/assessments/categories', {
    method: 'POST',
    token: adminToken,
    body: { name: `Smoke Knee ${runId}`, description: 'Integration smoke category' },
  });
  created.painCategories.push(category._id);

  const question = await request('/api/assessments/questions', {
    method: 'POST',
    token: adminToken,
    body: {
      questionText: `Smoke red flag ${runId}?`,
      questionType: 'yes_no',
      painCategory: category._id,
      isRedFlag: true,
      displayOrder: 1,
    },
  });
  created.questions.push(question._id);

  const program = await request('/api/programs', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Smoke Program ${runId}`,
      programCode: runId,
      painCategory: category._id,
      durationDays: 7,
      defaultPrice: 500,
    },
  });
  created.programs.push(program._id);

  const invalidProgramFailure = await requestFailure('/api/programs', {
    method: 'POST',
    token: adminToken,
    body: { name: 'x', durationDays: 0 },
  });
  if (invalidProgramFailure.status !== 400) throw new Error('Invalid program payload was not rejected');

  const exercise = await request('/api/exercises', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Smoke Exercise ${runId}`,
      description: 'Integration exercise',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtubeVideoId: 'dQw4w9WgXcQ',
      repetitions: 10,
      sets: 2,
      painCategory: category._id,
    },
  });
  created.exercises.push(exercise._id);
  if (exercise.youtubeVideoId !== 'dQw4w9WgXcQ') throw new Error('Exercise YouTube video ID was not normalized');

  const invalidVideoFailure = await requestFailure('/api/exercises', {
    method: 'POST',
    token: adminToken,
    body: { name: `Bad Video ${runId}`, videoUrl: 'https://example.com/video' },
  });
  if (invalidVideoFailure.status !== 400) throw new Error('Invalid exercise video URL was not rejected');

  const doctorExerciseCreateFailure = await requestFailure('/api/exercises', {
    method: 'POST',
    token: doctorLogin.token,
    body: { name: `Doctor Bad Exercise ${runId}` },
  });
  if (doctorExerciseCreateFailure.status !== 403) throw new Error('Doctor created admin-only exercise');

  const programDay = await request(`/api/programs/${program._id}/days`, {
    method: 'POST',
    token: adminToken,
    body: {
      dayNumber: 1,
      title: `Smoke Day ${runId}`,
      exercises: [{ exercise: exercise._id, displayOrder: 1 }],
    },
  });
  created.programDays.push(programDay._id);

  const scan = await request('/api/qr/scan', {
    method: 'POST',
    body: { doctorCode: approvedDoctor.doctor.doctorId, deviceInfo: `smoke-${runId}` },
  });
  created.qrScans.push(scan.scanId);

  const fraudScanDevice = `fraud-device-${runId}`;
  const fraudScanOne = await request('/api/qr/scan', {
    method: 'POST',
    body: { doctorCode: approvedDoctor.doctor.doctorId, deviceInfo: fraudScanDevice },
  });
  const fraudScanTwo = await request('/api/qr/scan', {
    method: 'POST',
    body: { doctorCode: approvedDoctor.doctor.doctorId, deviceInfo: fraudScanDevice },
  });
  created.qrScans.push(fraudScanOne.scanId, fraudScanTwo.scanId);

  const patientMobile = `93${String(Date.now()).slice(-8)}`;
  const patientRegistration = await request('/api/patients/register', {
    method: 'POST',
    body: {
      doctorCode: approvedDoctor.doctor.doctorId,
      scanId: scan.scanId,
      fullName: `Smoke Patient ${runId}`,
      mobile: patientMobile,
      city: 'Smoke City',
    },
  });
  created.patients.push(patientRegistration.patientId);

  const otpSend = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { mobile: patientMobile, purpose: 'registration' },
  });
  let otp = otpSend.otp;
  if (!otp) {
    const otpRecord = await Otp.findOne({ mobile: patientMobile, purpose: 'registration', verified: false }).sort({ createdAt: -1 });
    otp = otpRecord?.otp;
  }
  if (!otp) throw new Error('OTP was not available for integration verification');

  const patientAuth = await request('/api/auth/verify-otp', {
    method: 'POST',
    body: { mobile: patientMobile, purpose: 'registration', otp },
  });
  if (patientAuth.role !== 'patient' || !patientAuth.token) throw new Error('Patient OTP auth failed');
  if (!patientAuth.refreshToken || !patientAuth.sessionId) throw new Error('Patient OTP auth did not return refresh session');

  const patientSessions = await request('/api/auth/sessions', { token: patientAuth.token });
  if (!patientSessions.sessions.length) throw new Error('Active patient sessions were not listed');

  const consent = await request('/api/patients/consent', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      patient: patientRegistration.patientId,
      termsAccepted: true,
      privacyPolicyAccepted: true,
      paymentPolicyAccepted: true,
      refundPolicyAccepted: true,
      medicalDisclaimerAccepted: true,
      exerciseConsentAccepted: true,
      communicationConsentAccepted: true,
      healthInfoDeclarationAccepted: true,
    },
  });
  created.consents.push(consent.consent._id);

  const paymentOrder = await request('/api/payments/create-order', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      patientId: patientRegistration.patientId,
      programId: program._id,
      doctorId: approvedDoctor.doctor._id,
      idempotencyKey: `idem_${runId}`,
    },
  });
  const orderRecord = await Order.findOne({ gatewayOrderId: paymentOrder.orderId });
  if (!orderRecord) throw new Error('Payment order was not persisted');
  created.orders.push(orderRecord._id);

  const invalidCreateOrderFailure = await requestFailure('/api/payments/create-order', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      patientId: 'bad-id',
      programId: program._id,
      doctorId: approvedDoctor.doctor._id,
      idempotencyKey: `bad_${runId}`,
    },
  });
  if (invalidCreateOrderFailure.status !== 400) throw new Error('Invalid create-order id was not rejected');

  const doctorCreateOrderFailure = await requestFailure('/api/payments/create-order', {
    method: 'POST',
    token: doctorLogin.token,
    body: {
      patientId: patientRegistration.patientId,
      programId: program._id,
      doctorId: approvedDoctor.doctor._id,
      idempotencyKey: `doctor_bad_${runId}`,
    },
  });
  if (doctorCreateOrderFailure.status !== 403) throw new Error('Doctor created patient-only payment order');

  const idempotentOrder = await request('/api/payments/create-order', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      patientId: patientRegistration.patientId,
      programId: program._id,
      doctorId: approvedDoctor.doctor._id,
      idempotencyKey: `idem_${runId}`,
    },
  });
  if (!idempotentOrder.idempotent || idempotentOrder.orderId !== paymentOrder.orderId) {
    throw new Error('Payment order idempotency failed');
  }

  orderRecord.expiresAt = new Date(Date.now() - 1000);
  await orderRecord.save();
  const expiredOrderFailure = await requestFailure('/api/payments/verify', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      razorpay_order_id: paymentOrder.orderId,
      razorpay_payment_id: `pay_expired_${runId}`,
      razorpay_signature: 'mock_signature',
    },
  });
  if (expiredOrderFailure.status !== 400) throw new Error('Expired payment order was not rejected');
  orderRecord.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await orderRecord.save();

  const previousGatewayMode = process.env.PAYMENT_GATEWAY_MODE;
  const previousRazorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.PAYMENT_GATEWAY_MODE = 'razorpay';
  process.env.RAZORPAY_KEY_SECRET = 'smoke_secret';
  const invalidSignatureFailure = await requestFailure('/api/payments/verify', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      razorpay_order_id: paymentOrder.orderId,
      razorpay_payment_id: `pay_invalid_signature_${runId}`,
      razorpay_signature: 'bad_signature',
    },
  });
  process.env.PAYMENT_GATEWAY_MODE = previousGatewayMode;
  process.env.RAZORPAY_KEY_SECRET = previousRazorpaySecret;
  if (invalidSignatureFailure.status !== 400) throw new Error('Invalid Razorpay signature was not rejected');

  const secondPatientMobile = `94${String(Date.now()).slice(-8)}`;
  const secondScan = await request('/api/qr/scan', {
    method: 'POST',
    body: { doctorCode: approvedDoctor.doctor.doctorId, deviceInfo: `second-${runId}` },
  });
  created.qrScans.push(secondScan.scanId);

  const secondPatientRegistration = await request('/api/patients/register', {
    method: 'POST',
    body: {
      doctorCode: approvedDoctor.doctor.doctorId,
      scanId: secondScan.scanId,
      fullName: `Second Patient ${runId}`,
      mobile: secondPatientMobile,
      city: 'Smoke City',
    },
  });
  created.patients.push(secondPatientRegistration.patientId);

  const secondOtpSend = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { mobile: secondPatientMobile, purpose: 'registration' },
  });
  let secondOtp = secondOtpSend.otp;
  if (!secondOtp) {
    const secondOtpRecord = await Otp.findOne({ mobile: secondPatientMobile, purpose: 'registration', verified: false }).sort({ createdAt: -1 });
    secondOtp = secondOtpRecord?.otp;
  }
  const secondPatientAuth = await request('/api/auth/verify-otp', {
    method: 'POST',
    body: { mobile: secondPatientMobile, purpose: 'registration', otp: secondOtp },
  });

  const wrongPatientFailure = await requestFailure('/api/payments/verify', {
    method: 'POST',
    token: secondPatientAuth.token,
    body: {
      razorpay_order_id: paymentOrder.orderId,
      razorpay_payment_id: `pay_wrong_patient_${runId}`,
      razorpay_signature: 'mock_signature',
    },
  });
  if (wrongPatientFailure.status !== 403) throw new Error('Wrong patient payment verification was not rejected');

  const secondConsent = await request('/api/patients/consent', {
    method: 'POST',
    token: secondPatientAuth.token,
    body: {
      patient: secondPatientRegistration.patientId,
      termsAccepted: true,
      privacyPolicyAccepted: true,
      paymentPolicyAccepted: true,
      refundPolicyAccepted: true,
      medicalDisclaimerAccepted: true,
      exerciseConsentAccepted: true,
      communicationConsentAccepted: true,
      healthInfoDeclarationAccepted: true,
    },
  });
  created.consents.push(secondConsent.consent._id);

  const secondPaymentOrder = await request('/api/payments/create-order', {
    method: 'POST',
    token: secondPatientAuth.token,
    body: {
      patientId: secondPatientRegistration.patientId,
      programId: program._id,
      doctorId: approvedDoctor.doctor._id,
      idempotencyKey: `idem_second_${runId}`,
    },
  });
  const secondOrderRecord = await Order.findOne({ gatewayOrderId: secondPaymentOrder.orderId });
  if (!secondOrderRecord) throw new Error('Second payment order was not persisted');
  created.orders.push(secondOrderRecord._id);

  const paymentVerification = await request('/api/payments/verify', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      razorpay_order_id: paymentOrder.orderId,
      razorpay_payment_id: `pay_mock_${runId}`,
      razorpay_signature: 'mock_signature',
    },
  });
  created.payments.push(paymentVerification.paymentId);

  const duplicatePaymentVerification = await request('/api/payments/verify', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      razorpay_order_id: paymentOrder.orderId,
      razorpay_payment_id: `pay_mock_${runId}`,
      razorpay_signature: 'mock_signature',
    },
  });
  if (duplicatePaymentVerification.paymentId !== paymentVerification.paymentId) {
    throw new Error('Payment verification idempotency failed');
  }

  const duplicateTransactionOtherOrderFailure = await requestFailure('/api/payments/verify', {
    method: 'POST',
    token: secondPatientAuth.token,
    body: {
      razorpay_order_id: secondPaymentOrder.orderId,
      razorpay_payment_id: `pay_mock_${runId}`,
      razorpay_signature: 'mock_signature',
    },
  });
  if (duplicateTransactionOtherOrderFailure.status !== 409) {
    throw new Error('Duplicate gateway transaction on another order was not rejected');
  }

  const paymentRecord = await Payment.findById(paymentVerification.paymentId);
  if (!paymentRecord || paymentRecord.status !== 'successful') throw new Error('Payment was not persisted as successful');

  const feeShare = await FeeShare.findOne({ payment: paymentRecord._id });
  if (!feeShare || feeShare.amount <= 0) throw new Error('Fee share was not created for split-model payment');
  created.feeShares.push(feeShare._id);

  const walletLedger = await WalletTransaction.findOne({ relatedPayment: paymentRecord._id, type: 'fee_share_pending' });
  if (!walletLedger) throw new Error('Wallet ledger entry was not created for payment');

  const receipt = await request(`/api/payments/${paymentRecord._id}/receipt`, { token: patientAuth.token });
  if (receipt.invoiceNumber !== paymentRecord.invoiceNumber) throw new Error('Payment receipt did not load');
  if (!/^RC\/\d{4}\/\d{6}$/.test(receipt.invoiceNumber)) throw new Error('Sequential invoice number format is invalid');

  const invoiceCounter = await Counter.findOne({ key: `invoice:${new Date().getFullYear()}` });
  if (!invoiceCounter || invoiceCounter.sequence < 1) throw new Error('Invoice sequence counter was not incremented');

  const walletForWithdrawal = await DoctorWallet.findOne({ doctor: approvedDoctor.doctor._id });
  if (!walletForWithdrawal) throw new Error('Doctor wallet was not available for withdrawal smoke');
  walletForWithdrawal.availableBalance += 2500;
  await walletForWithdrawal.save();

  const withdrawal = await request('/api/withdrawals/request', {
    method: 'POST',
    token: doctorLogin.token,
    body: { requestedAmount: 1000 },
  });
  created.withdrawals.push(withdrawal.request._id);
  if (withdrawal.request.status !== 'requested') throw new Error('Withdrawal request failed');

  const approvedWithdrawal = await request(`/api/withdrawals/${withdrawal.request._id}/approve`, {
    method: 'POST',
    token: adminToken,
  });
  if (approvedWithdrawal.request.status !== 'approved') throw new Error('Withdrawal approval failed');
  const payout = await Payout.findOne({ withdrawalRequest: withdrawal.request._id });
  if (!payout || payout.status !== 'processing') throw new Error('Payout record was not created on withdrawal approval');
  created.payouts.push(payout._id);

  const paidWithdrawal = await request(`/api/withdrawals/${withdrawal.request._id}/paid`, {
    method: 'POST',
    token: adminToken,
    body: { transactionReference: `UTR${String(Date.now()).slice(-10)}` },
  });
  if (paidWithdrawal.message !== 'Payout marked as completed') throw new Error('Withdrawal paid transition failed');

  const duplicatePayoutReference = await request('/api/withdrawals/request', {
    method: 'POST',
    token: doctorLogin.token,
    body: { requestedAmount: 1000 },
  });
  created.withdrawals.push(duplicatePayoutReference.request._id);
  await request(`/api/withdrawals/${duplicatePayoutReference.request._id}/approve`, {
    method: 'POST',
    token: adminToken,
  });
  const failedPayout = await request(`/api/withdrawals/${duplicatePayoutReference.request._id}/failed`, {
    method: 'POST',
    token: adminToken,
    body: { reason: 'Bank transfer rejected during smoke test' },
  });
  if (failedPayout.message !== 'Payout marked failed, amount returned to wallet') {
    throw new Error('Failed payout transition did not restore wallet');
  }
  const failedPayoutRecord = await Payout.findOne({ withdrawalRequest: duplicatePayoutReference.request._id });
  if (failedPayoutRecord) created.payouts.push(failedPayoutRecord._id);

  const patientProgram = await PatientProgram.findOne({
    patient: patientRegistration.patientId,
    program: program._id,
    status: 'active',
  });
  if (!patientProgram) throw new Error('Payment did not activate patient program');
  created.patientPrograms.push(patientProgram._id);

  const dayContent = await request(`/api/progress/${patientProgram._id}/day/1`, { token: patientAuth.token });
  if (!dayContent.programDay || dayContent.day !== 1) throw new Error('Patient day content did not load');

  const exerciseEvent = await request(`/api/progress/${patientProgram._id}/day/1/exercises/${exercise._id}/event`, {
    method: 'POST',
    token: patientAuth.token,
    body: { eventType: 'video_started' },
  });
  if (!exerciseEvent.progress.exercises.find((item) => item.exercise === exercise._id && item.videoStarted)) {
    throw new Error('Exercise video event was not tracked');
  }
  created.programProgress.push(exerciseEvent.progress._id);

  const dayProgress = await request('/api/progress/submit-day', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      patientProgramId: patientProgram._id,
      dayNumber: 1,
      exercises: [{
        exercise: exercise._id,
        videoStarted: true,
        videoCompleted: true,
        markedCompleted: true,
      }],
      painScoreBefore: 6,
      painScoreAfter: 4,
      difficultyRating: 3,
      feedbackText: `Smoke progress ${runId}`,
      discomfortReported: false,
      fullSessionCompleted: true,
    },
  });
  if (!dayProgress.dayCompleted) throw new Error('Day progress did not complete');

  const progressSummary = await request(`/api/progress/${patientProgram._id}/summary`, { token: patientAuth.token });
  if (progressSummary.completedDays < 1 || progressSummary.completedExercises < 1) {
    throw new Error('Progress summary did not include completed day');
  }

  const manualUnlock = await request('/api/progress/admin-unlock', {
    method: 'POST',
    token: adminToken,
    body: { patientProgramId: patientProgram._id, dayNumber: 2 },
  });
  if (!manualUnlock.progress.dayUnlocked) throw new Error('Admin manual unlock failed');
  created.programProgress.push(manualUnlock.progress._id);

  const refundFailureForDoctor = await requestFailure('/api/refunds', {
    method: 'POST',
    token: doctorLogin.token,
    body: {
      paymentId: paymentRecord._id,
      refundType: 'partial',
      refundAmount: 50,
      reason: `Doctor refund attempt ${runId}`,
    },
  });
  if (refundFailureForDoctor.status !== 403) throw new Error('Doctor accessed admin-only refund processing');

  const refund = await request('/api/refunds', {
    method: 'POST',
    token: adminToken,
    body: {
      paymentId: paymentRecord._id,
      refundType: 'partial',
      refundAmount: 100,
      reason: `Smoke partial refund ${runId}`,
    },
  });
  created.refunds.push(refund.refund._id);
  if (refund.refund.status !== 'completed' || refund.refund.feeShareReversal <= 0) {
    throw new Error('Refund did not complete with fee share reversal');
  }
  const refundedPayment = await Payment.findById(paymentRecord._id);
  if (refundedPayment.status !== 'partially_refunded' || refundedPayment.refundAmount !== 100) {
    throw new Error('Payment refund status was not reconciled');
  }

  const assessment = await request('/api/assessments/submit', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      patientId: patientRegistration.patientId,
      painCategoryId: category._id,
      answers: [{ question: question._id, answer: 'yes' }],
    },
  });
  created.assessments.push(assessment.assessment._id);
  if (!assessment.hasRedFlag) throw new Error('Red flag assessment was not detected');

  const notification = await Notification.findOne({
    type: 'high_risk_assessment',
    message: { $regex: assessment.assessment._id },
  });
  if (notification) created.notifications.push(notification._id);

  const redFlags = await request('/api/assessments/red-flags', { token: adminToken });
  const pendingReview = redFlags.items.find((item) => item._id === assessment.assessment._id);
  if (!pendingReview) throw new Error('Red flag assessment was not listed for admin review');

  const reviewedAssessment = await request(`/api/assessments/${assessment.assessment._id}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'cleared', note: `Smoke review ${runId}` },
  });
  if (reviewedAssessment.assessment.status !== 'cleared') throw new Error('Red flag assessment review failed');

  const supportTicket = await request('/api/support', {
    method: 'POST',
    token: patientAuth.token,
    body: {
      category: 'technical',
      subject: `Smoke support ${runId}`,
      description: 'Integration support ticket',
      priority: 'high',
    },
  });
  created.supportTickets.push(supportTicket._id);

  const ticketNotification = await Notification.findOne({
    type: 'support_ticket_created',
    message: { $regex: supportTicket.ticketId },
  });
  if (ticketNotification) created.notifications.push(ticketNotification._id);

  const supportList = await request('/api/support', { token: adminToken });
  if (!supportList.items.find((item) => item._id === supportTicket._id)) {
    throw new Error('Support ticket was not listed for admin');
  }

  const updatedTicket = await request(`/api/support/${supportTicket._id}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'in_progress', adminResponse: `Smoke response ${runId}` },
  });
  if (updatedTicket.status !== 'in_progress' || !updatedTicket.messages.length) {
    throw new Error('Support ticket admin update failed');
  }

  const ticketReply = await request(`/api/support/${supportTicket._id}/messages`, {
    method: 'POST',
    token: patientAuth.token,
    body: { message: `Patient follow-up ${runId}` },
  });
  if (ticketReply.messages.length < 3) throw new Error('Support ticket message workflow failed');

  const notificationCreate = await request('/api/notifications', {
    method: 'POST',
    token: adminToken,
    body: {
      recipientType: 'patient',
      patient: patientRegistration.patientId,
      type: 'ticket_updated',
      channels: ['in_app', 'sms'],
      title: `Smoke notification ${runId}`,
      message: `Notification delivery smoke ${runId}`,
    },
  });
  notificationCreate.notifications.forEach((item) => created.notifications.push(item._id));
  const smsNotification = notificationCreate.notifications.find((item) => item.channel === 'sms');
  const inAppNotification = notificationCreate.notifications.find((item) => item.channel === 'in_app');
  if (!smsNotification || smsNotification.status !== 'sent') throw new Error('SMS notification log delivery failed');
  if (!inAppNotification) throw new Error('In-app notification was not created');

  const patientNotifications = await request('/api/notifications', { token: patientAuth.token });
  if (!patientNotifications.items.find((item) => item._id === inAppNotification._id)) {
    throw new Error('Patient notification list did not include in-app notification');
  }

  const readNotification = await request(`/api/notifications/${inAppNotification._id}/read`, {
    method: 'PUT',
    token: patientAuth.token,
  });
  if (!readNotification.notification.isRead) throw new Error('Notification read state was not updated');

  const pendingNotification = await request('/api/notifications', {
    method: 'POST',
    token: adminToken,
    body: {
      recipientType: 'patient',
      patient: patientRegistration.patientId,
      type: 'exercise_reminder',
      channel: 'sms',
      title: `Pending notification ${runId}`,
      message: `Pending delivery smoke ${runId}`,
      deliverNow: false,
    },
  });
  pendingNotification.notifications.forEach((item) => created.notifications.push(item._id));
  const processedNotifications = await request('/api/notifications/process-pending', {
    method: 'POST',
    token: adminToken,
    body: { limit: 5 },
  });
  if (!processedNotifications.notifications.find((item) => item._id === pendingNotification.notifications[0]._id && item.status === 'sent')) {
    throw new Error('Pending notification processing failed');
  }

  const previousNotificationMode = process.env.NOTIFICATION_DELIVERY_MODE;
  process.env.NOTIFICATION_DELIVERY_MODE = 'provider';
  const failingNotification = await request('/api/notifications', {
    method: 'POST',
    token: adminToken,
    body: {
      recipientType: 'patient',
      patient: patientRegistration.patientId,
      type: 'payment_failed',
      channel: 'email',
      title: `Failed retry notification ${runId}`,
      message: `Failed retry delivery smoke ${runId}`,
    },
  });
  failingNotification.notifications.forEach((item) => created.notifications.push(item._id));
  const failedNotification = await Notification.findById(failingNotification.notifications[0]._id);
  if (!failedNotification || failedNotification.status !== 'failed' || !failedNotification.nextAttemptAt) {
    throw new Error('Failed notification did not record retry metadata');
  }
  failedNotification.nextAttemptAt = new Date(Date.now() - 1000);
  await failedNotification.save();
  process.env.NOTIFICATION_DELIVERY_MODE = previousNotificationMode;

  const retriedNotifications = await request('/api/notifications/process-pending', {
    method: 'POST',
    token: adminToken,
    body: { limit: 5, includeFailed: true },
  });
  if (!retriedNotifications.notifications.find((item) => item._id === failedNotification._id.toString() && item.status === 'sent')) {
    throw new Error('Failed notification retry processing failed');
  }

  const patientLogout = await request('/api/auth/logout', {
    method: 'POST',
    body: { refreshToken: patientAuth.refreshToken },
  });
  if (patientLogout.message !== 'Logged out') throw new Error('Patient logout failed');

  const patientRefreshFailure = await requestFailure('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: patientAuth.refreshToken },
  });
  if (patientRefreshFailure.status !== 401) throw new Error('Logged out patient refresh token was not revoked');

  const dashboard = await request('/api/admin/dashboard', { token: adminToken });
  if (typeof dashboard.totalDoctors !== 'number') throw new Error('Admin dashboard did not return metrics');

  const adminClinics = await request('/api/admin/clinics?limit=10', { token: adminToken });
  if (!adminClinics.items.find((item) => item.doctorId === doctorResponse.doctorId || item._id === doctorResponse._id)) {
    throw new Error('Admin clinics endpoint did not include registered doctor clinic');
  }

  const adminReferrals = await request('/api/admin/referrals?limit=10', { token: adminToken });
  if (!adminReferrals.items.find((item) => item.doctor?._id === doctorResponse._id || item.doctor === doctorResponse._id)) {
    throw new Error('Admin referrals endpoint did not include QR attribution');
  }

  const adminRevenueModels = await request('/api/admin/revenue-models?limit=10', { token: adminToken });
  if (!adminRevenueModels.items.find((item) => item._id === doctorResponse._id)) {
    throw new Error('Admin revenue models endpoint did not include approved doctor');
  }

  const invalidRevenueModelUpdate = await requestFailure(`/api/admin/revenue-models/${doctorResponse._id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { feeSharePercentage: 101 },
  });
  if (invalidRevenueModelUpdate.status !== 400) throw new Error('Revenue model validation did not reject invalid fee share');

  const updatedRevenueModel = await request(`/api/admin/revenue-models/${doctorResponse._id}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      revenueModel: 'split',
      approvedPatientFee: 650,
      feeSharePercentage: 55,
      feeShareType: 'percentage',
      feeShareCalculationBasis: 'after_discount',
      feeShareHoldingDays: 10,
      minWithdrawal: 500,
      maxWithdrawal: 25000,
      payoutCycle: 'monthly',
      reason: `Smoke revenue model update ${runId}`,
    },
  });
  if (updatedRevenueModel.doctor.feeSharePercentage !== 55 || updatedRevenueModel.doctor.feeShareCalculationBasis !== 'after_discount') {
    throw new Error('Revenue model update did not persist commercial fields');
  }

  const withdrawalDetail = await request(`/api/admin/withdrawals/${withdrawal.request._id}`, { token: adminToken });
  if (withdrawalDetail._id !== withdrawal.request._id || !withdrawalDetail.doctor) {
    throw new Error('Admin withdrawal detail endpoint failed');
  }

  const fraudCases = await request('/api/admin/fraud-cases?rule=abnormal_qr_scans&limit=5', { token: adminToken });
  const qrFraudCase = fraudCases.items.find((item) => item.rule === 'abnormal_qr_scans');
  if (!qrFraudCase) throw new Error('Abnormal QR scan fraud case was not listed');
  created.fraudCases.push(qrFraudCase._id);

  const fraudCaseDetail = await request(`/api/admin/fraud-cases/${qrFraudCase._id}`, { token: adminToken });
  if (fraudCaseDetail._id !== qrFraudCase._id) throw new Error('Fraud case detail failed');

  const reviewedFraudCase = await request(`/api/admin/fraud-cases/${qrFraudCase._id}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'resolved', note: `Reviewed ${runId}` },
  });
  if (reviewedFraudCase.status !== 'resolved') throw new Error('Fraud case review failed');

  const auditLogs = await request('/api/admin/audit-logs?module=ClinicVisit&limit=5', { token: adminToken });
  const clinicVisitAudit = auditLogs.items.find((item) => item.module === 'ClinicVisit');
  if (!clinicVisitAudit) throw new Error('Audit log list did not include ClinicVisit records');

  const auditDetail = await request(`/api/admin/audit-logs/${clinicVisitAudit._id}`, { token: adminToken });
  if (auditDetail._id !== clinicVisitAudit._id || !auditDetail.action) throw new Error('Audit log detail failed');

  const auditExport = await request('/api/admin/audit-logs/export?format=json&module=ClinicVisit&limit=5', { token: adminToken });
  if (!auditExport.items.find((item) => item._id === clinicVisitAudit._id)) {
    throw new Error('Audit log JSON export failed');
  }

  console.log(JSON.stringify({
    ok: true,
    runId,
    checks: [
      'mongodb_connected',
      'admin_login',
      'agent_create_and_login',
      'doctor_create_approve_login_wallet_qr',
      'clinic_visit_tracking_workflow',
      'pain_category_question_program',
      'qr_scan_patient_registration_attribution',
      'otp_verify_patient_token',
      'auth_session_refresh_rotation',
      'consent_recorded',
      'payment_razorpay_hardening_workflow',
      'program_progress_tracking_workflow',
      'red_flag_assessment',
      'red_flag_review_workflow',
      'support_ticket_workflow',
      'notification_delivery_workflow',
      'notification_worker_retry_controls',
      'doctor_kyc_document_upload_s3_ready',
      'withdrawal_payout_hardening_workflow',
      'fraud_risk_rules_workflow',
      'payment_negative_edge_cases',
      'rbac_security_negative_cases',
      'schema_validation_hardening',
      'program_video_management_workflow',
      'kyc_document_access_policy',
      'refund_reconciliation_workflow',
      'admin_clinic_referral_revenue_model_workflow',
      'admin_withdrawal_detail_workflow',
      'admin_dashboard',
      'audit_log_admin_workflow',
    ],
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });
