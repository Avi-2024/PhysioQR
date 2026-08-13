require('dotenv').config();

const mongoose = require('mongoose');
const app = require('../src/app');

const User = require('../src/models/User.model');
const Agent = require('../src/models/Agent.model');
const Doctor = require('../src/models/Doctor.model');
const Patient = require('../src/models/Patient.model');
const Otp = require('../src/models/Otp.model');
const PainCategory = require('../src/models/PainCategory.model');
const AssessmentQuestion = require('../src/models/AssessmentQuestion.model');
const PatientAssessment = require('../src/models/PatientAssessment.model');
const PatientConsent = require('../src/models/PatientConsent.model');
const Program = require('../src/models/Program.model');
const QrScan = require('../src/models/QrScan.model');
const { DoctorWallet, WalletTransaction } = require('../src/models/Wallet.model');
const AuditLog = require('../src/models/AuditLog.model');

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
  qrScans: [],
  wallets: [],
};

let server;
let baseUrl;

const request = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
};

const cleanup = async () => {
  await Promise.allSettled([
    PatientAssessment.deleteMany({ _id: { $in: created.assessments } }),
    PatientConsent.deleteMany({ _id: { $in: created.consents } }),
    AssessmentQuestion.deleteMany({ _id: { $in: created.questions } }),
    PainCategory.deleteMany({ _id: { $in: created.painCategories } }),
    Program.deleteMany({ _id: { $in: created.programs } }),
    QrScan.deleteMany({ _id: { $in: created.qrScans } }),
    WalletTransaction.deleteMany({ doctor: { $in: created.doctors } }),
    DoctorWallet.deleteMany({ doctor: { $in: created.doctors } }),
    Patient.deleteMany({ _id: { $in: created.patients } }),
    Doctor.deleteMany({ _id: { $in: created.doctors } }),
    Agent.deleteMany({ _id: { $in: created.agents } }),
    User.deleteMany({ _id: { $in: created.users } }),
    Otp.deleteMany({ mobile: { $regex: runId } }),
    AuditLog.deleteMany({ recordId: { $in: [...created.users, ...created.agents, ...created.doctors, ...created.patients].map(String) } }),
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
  const adminToken = login.token;

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

  const scan = await request('/api/qr/scan', {
    method: 'POST',
    body: { doctorCode: approvedDoctor.doctor.doctorId, deviceInfo: `smoke-${runId}` },
  });
  created.qrScans.push(scan.scanId);

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

  const consent = await request('/api/patients/consent', {
    method: 'POST',
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

  const dashboard = await request('/api/admin/dashboard', { token: adminToken });
  if (typeof dashboard.totalDoctors !== 'number') throw new Error('Admin dashboard did not return metrics');

  console.log(JSON.stringify({
    ok: true,
    runId,
    checks: [
      'mongodb_connected',
      'admin_login',
      'agent_create_and_login',
      'doctor_create_approve_login_wallet_qr',
      'pain_category_question_program',
      'qr_scan_patient_registration_attribution',
      'otp_verify_patient_token',
      'consent_recorded',
      'red_flag_assessment',
      'admin_dashboard',
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
