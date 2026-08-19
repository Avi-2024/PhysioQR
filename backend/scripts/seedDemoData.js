require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Agent = require('../src/models/Agent.model');
const Doctor = require('../src/models/Doctor.model');
const Patient = require('../src/models/Patient.model');
const PainCategory = require('../src/models/PainCategory.model');
const Program = require('../src/models/Program.model');
const { Exercise, ProgramDay } = require('../src/models/Exercise.model');
const QrScan = require('../src/models/QrScan.model');
const { Order, Payment } = require('../src/models/Payment.model');
const { FeeShare, WithdrawalRequest } = require('../src/models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../src/models/Wallet.model');
const SupportTicket = require('../src/models/SupportTicket.model');

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

// Creates or updates a login user while preserving password hashing.
async function upsertUser({ role, email, mobile, password, status = 'active' }) {
  const query = email ? { email } : { mobile };
  let user = await User.findOne(query);
  if (!user) {
    user = new User({ role, email, mobile, password, status });
  } else {
    user.role = role;
    user.email = email || user.email;
    user.mobile = mobile || user.mobile;
    user.password = password;
    user.status = status;
  }
  await user.save();
  return user;
}

// Creates or updates an agent profile and links it to the login user.
async function upsertAgent(data, password) {
  const user = await upsertUser({ role: 'agent', email: data.email, mobile: data.mobile, password, status: data.status || 'active' });
  let agent = await Agent.findOne({ $or: [{ email: data.email }, { mobile: data.mobile }] });
  if (!agent) {
    agent = new Agent({ ...data, user: user._id });
  } else {
    Object.assign(agent, data, { user: user._id });
  }
  await agent.save();
  user.profileRef = agent._id;
  user.profileModel = 'Agent';
  await user.save();
  return agent;
}

// Creates or updates a doctor profile and links it to the login user.
async function upsertDoctor(data, password) {
  const user = await upsertUser({ role: 'doctor', email: data.email, mobile: data.mobile, password, status: 'active' });
  let doctor = await Doctor.findOne({ $or: [{ email: data.email }, { mobile: data.mobile }] });
  if (!doctor) {
    doctor = new Doctor({ ...data, user: user._id });
  } else {
    Object.assign(doctor, data, { user: user._id });
  }
  await doctor.save();
  user.profileRef = doctor._id;
  user.profileModel = 'Doctor';
  await user.save();
  return doctor;
}

// Creates or updates a patient record by mobile number.
async function upsertPatient(data) {
  let patient = await Patient.findOne({ mobile: data.mobile });
  if (!patient) {
    patient = new Patient(data);
  } else {
    Object.assign(patient, data);
  }
  await patient.save();
  return patient;
}

// Creates payment, wallet, and fee-share records for a paid demo patient.
async function upsertPaidOrder({ patient, doctor, agent, program, amount, index }) {
  const orderId = `DEMO-ORDER-${index}`;
  const paymentId = `DEMO-PAYMENT-${index}`;
  const gatewayOrderId = `order_demo_${index}`;
  const gatewayTransactionId = `pay_demo_${index}`;
  const feeShareAmount = Math.round(amount * ((doctor.feeSharePercentage || 60) / 100));
  const platformShare = amount - feeShareAmount;

  const order = await Order.findOneAndUpdate(
    { orderId },
    {
      patient: patient._id,
      doctor: doctor._id,
      agent: agent._id,
      program: program._id,
      originalAmount: amount,
      finalAmount: amount,
      paymentMethod: 'upi',
      gatewayProvider: 'razorpay',
      gatewayOrderId,
      gatewayReceipt: orderId,
      pricingSnapshot: {
        revenueModel: doctor.revenueModel,
        approvedPatientFee: doctor.approvedPatientFee,
        feeSharePercentage: doctor.feeSharePercentage,
      },
      status: 'successful',
      paidAt: new Date(now.getTime() - index * dayMs),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const payment = await Payment.findOneAndUpdate(
    { gatewayTransactionId },
    {
      order: order._id,
      patient: patient._id,
      doctor: doctor._id,
      agent: agent._id,
      program: program._id,
      gatewayProvider: 'razorpay',
      gatewayOrderId,
      gatewayTransactionId,
      paymentMethod: 'upi',
      paidAmount: amount,
      doctorFeeShare: feeShareAmount,
      platformShare,
      feeSharePercentage: doctor.feeSharePercentage,
      feeShareBasis: doctor.feeShareCalculationBasis,
      status: 'successful',
      invoiceNumber: `DEMO/2026/${String(index).padStart(4, '0')}`,
      verifiedAt: new Date(now.getTime() - index * dayMs),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await FeeShare.findOneAndUpdate(
    { payment: payment._id },
    {
      doctor: doctor._id,
      patient: patient._id,
      amount: feeShareAmount,
      percentage: doctor.feeSharePercentage,
      calculationBasis: doctor.feeShareCalculationBasis,
      holdingDays: doctor.feeShareHoldingDays,
      availableDate: new Date(now.getTime() + (doctor.feeShareHoldingDays || 15) * dayMs),
      status: index === 1 ? 'available' : 'pending',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const wallet = await DoctorWallet.findOneAndUpdate(
    { doctor: doctor._id },
    {
      pendingBalance: index === 1 ? 900 : 1500,
      availableBalance: index === 1 ? 1200 : 0,
      lifetimeEarnings: 2100,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await WalletTransaction.findOneAndUpdate(
    { wallet: wallet._id, relatedPayment: payment._id, type: 'fee_share_pending' },
    {
      doctor: doctor._id,
      wallet: wallet._id,
      relatedPayment: payment._id,
      amount: feeShareAmount,
      previousBalance: 0,
      newBalance: feeShareAmount,
      reason: 'Demo successful payment fee-share',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return payment;
}

// Seeds a connected demo dataset for Admin portal testing.
async function run() {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_MOBILE, DEMO_ADMIN_PASSWORD, DEMO_AGENT_PASSWORD, DEMO_DOCTOR_PASSWORD } = process.env;
  if (!MONGO_URI) throw new Error('MONGO_URI is required');
  if (!DEMO_ADMIN_PASSWORD || !DEMO_AGENT_PASSWORD || !DEMO_DOCTOR_PASSWORD) {
    throw new Error('DEMO_ADMIN_PASSWORD, DEMO_AGENT_PASSWORD, and DEMO_DOCTOR_PASSWORD are required');
  }

  await mongoose.connect(MONGO_URI);

  const adminEmail = ADMIN_EMAIL || 'admin@physioqr.local';
  await upsertUser({
    role: 'admin',
    email: ADMIN_EMAIL ? adminEmail : undefined,
    mobile: ADMIN_EMAIL ? ADMIN_MOBILE : (ADMIN_MOBILE || '9000000000'),
    password: DEMO_ADMIN_PASSWORD,
    status: 'active',
  });

  const agents = [];
  agents.push(await upsertAgent({
    fullName: 'Amit Field Executive',
    mobile: '9100000001',
    whatsapp: '9100000001',
    email: 'agent.demo@physioqr.local',
    address: 'Sector 62 clinic belt',
    city: 'Noida',
    state: 'Uttar Pradesh',
    assignedRegion: 'Noida East',
    joiningDate: new Date('2026-08-01T00:00:00.000Z'),
    reportingPerson: 'Operations Lead',
    status: 'active',
  }, DEMO_AGENT_PASSWORD));
  agents.push(await upsertAgent({
    fullName: 'Priya Clinic Coordinator',
    mobile: '9100000002',
    whatsapp: '9100000002',
    email: 'agent.north@physioqr.local',
    address: 'South Delhi OPD route',
    city: 'Delhi',
    state: 'Delhi',
    assignedRegion: 'South Delhi',
    joiningDate: new Date('2026-08-05T00:00:00.000Z'),
    reportingPerson: 'Operations Lead',
    status: 'active',
  }, DEMO_AGENT_PASSWORD));

  const knee = await PainCategory.findOneAndUpdate(
    { name: 'Knee pain' },
    { name: 'Knee pain', nameHindi: 'Ghutne ka dard', description: 'Structured knee rehabilitation programs.', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const back = await PainCategory.findOneAndUpdate(
    { name: 'Lower back pain' },
    { name: 'Lower back pain', nameHindi: 'Kamar ka dard', description: 'Mobility and stability recovery for lower back pain.', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const exercise = await Exercise.findOneAndUpdate(
    { name: 'Quadriceps Isometric Strengthening' },
    {
      name: 'Quadriceps Isometric Strengthening',
      description: 'Sit with the knee straight, tighten the thigh muscle, hold, and release slowly.',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      youtubeVideoId: 'dQw4w9WgXcQ',
      repetitions: 10,
      sets: 3,
      holdDuration: '10 seconds',
      restDuration: '30 seconds',
      frequency: 'Once daily',
      painCategory: knee._id,
      language: 'en',
      displayOrder: 1,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const program = await Program.findOneAndUpdate(
    { programCode: 'KNEE-BASIC-14' },
    {
      programCode: 'KNEE-BASIC-14',
      name: 'Knee Stability Basic Recovery',
      painCategory: knee._id,
      description: 'A 14-day doctor-referred knee strengthening and mobility program.',
      objective: 'Reduce stiffness and improve controlled knee loading.',
      difficultyLevel: 'beginner',
      durationDays: 14,
      sessionsPerDay: 1,
      recommendedAgeGroup: '18-65',
      eligibleConditions: ['Mild knee pain', 'Patellar tracking discomfort'],
      excludedConditions: ['Recent fracture', 'Severe swelling'],
      instructions: 'Complete one guided session per day.',
      precautions: 'Stop if severe pain, dizziness, or swelling increases.',
      requiredEquipment: ['Chair', 'Towel'],
      defaultPrice: 500,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await ProgramDay.findOneAndUpdate(
    { program: program._id, dayNumber: 1 },
    {
      program: program._id,
      dayNumber: 1,
      title: 'Pain-safe activation',
      exercises: [{ exercise: exercise._id, displayOrder: 1 }],
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const doctors = [];
  doctors.push(await upsertDoctor({
    fullName: 'Dr. Neha Sharma',
    mobile: '9200000001',
    whatsapp: '9200000001',
    email: 'doctor.demo@physioqr.local',
    qualification: 'MBBS, MS Orthopedics',
    specialization: 'Orthopedics',
    medicalRegNumber: 'DMC-DEMO-1001',
    registrationCouncil: 'Delhi Medical Council',
    yearsOfExperience: 12,
    languagesSpoken: ['English', 'Hindi'],
    consultationFee: 700,
    clinicName: 'Sharma Ortho Clinic',
    clinicAddress: 'Block A, Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    clinicContact: '0120-4000001',
    agent: agents[0]._id,
    registrationDate: new Date(now.getTime() - 12 * dayMs),
    approvalDate: new Date(now.getTime() - 10 * dayMs),
    requestedPatientFee: 500,
    approvedPatientFee: 500,
    revenueModel: 'split',
    feeSharePercentage: 60,
    feeShareType: 'percentage',
    feeShareCalculationBasis: 'gross',
    feeShareHoldingDays: 15,
    minWithdrawal: 1000,
    maxWithdrawal: 50000,
    payoutCycle: 'monthly',
    status: 'approved',
    referralCode: 'DR-DEMO-NEHA',
    qrCodeActive: true,
    kycStatus: 'approved',
    bankAccountHolder: 'Neha Sharma',
    bankAccountNumber: '000000001234',
    bankName: 'Demo Bank',
    ifscCode: 'DEMO0001234',
    bankVerified: true,
  }, DEMO_DOCTOR_PASSWORD));
  doctors.push(await upsertDoctor({
    fullName: 'Dr. Arvind Mehta',
    mobile: '9200000002',
    whatsapp: '9200000002',
    email: 'doctor.platform@physioqr.local',
    qualification: 'BPT, MPT',
    specialization: 'Physiotherapy',
    medicalRegNumber: 'PT-DEMO-2002',
    registrationCouncil: 'State Physiotherapy Council',
    yearsOfExperience: 9,
    clinicName: 'Mehta Rehab Studio',
    clinicAddress: 'Greater Kailash',
    city: 'Delhi',
    state: 'Delhi',
    agent: agents[1]._id,
    registrationDate: new Date(now.getTime() - 7 * dayMs),
    approvalDate: new Date(now.getTime() - 5 * dayMs),
    requestedPatientFee: 300,
    approvedPatientFee: 250,
    revenueModel: 'platform_fee',
    feeSharePercentage: 0,
    feeShareType: 'percentage',
    feeShareHoldingDays: 7,
    minWithdrawal: 0,
    status: 'approved',
    referralCode: 'DR-DEMO-ARVIND',
    qrCodeActive: true,
    kycStatus: 'submitted',
  }, DEMO_DOCTOR_PASSWORD));

  const patients = [];
  patients.push(await upsertPatient({
    fullName: 'Ravi Kumar',
    mobile: '9300000001',
    whatsapp: '9300000001',
    email: 'ravi.patient@physioqr.local',
    age: 42,
    gender: 'male',
    city: 'Noida',
    state: 'Uttar Pradesh',
    preferredLanguage: 'hi',
    referringDoctor: doctors[0]._id,
    referralSource: 'qr_code',
    referralLocked: true,
    mobileVerified: true,
    consentAccepted: true,
    consentVersion: 'v1',
    consentDate: new Date(now.getTime() - 4 * dayMs),
    status: 'active',
  }));
  patients.push(await upsertPatient({
    fullName: 'Sunita Verma',
    mobile: '9300000002',
    whatsapp: '9300000002',
    email: 'sunita.patient@physioqr.local',
    age: 51,
    gender: 'female',
    city: 'Delhi',
    state: 'Delhi',
    preferredLanguage: 'en',
    referringDoctor: doctors[1]._id,
    referralSource: 'qr_code',
    referralLocked: false,
    mobileVerified: true,
    consentAccepted: true,
    consentVersion: 'v1',
    consentDate: new Date(now.getTime() - 2 * dayMs),
    status: 'active',
  }));
  patients.push(await upsertPatient({
    fullName: 'Mohit Singh',
    mobile: '9300000003',
    whatsapp: '9300000003',
    age: 36,
    gender: 'male',
    city: 'Noida',
    state: 'Uttar Pradesh',
    preferredLanguage: 'en',
    referringDoctor: doctors[0]._id,
    referralSource: 'referral_link',
    referralLocked: false,
    mobileVerified: true,
    consentAccepted: true,
    consentVersion: 'v1',
    status: 'active',
  }));

  await upsertPaidOrder({ patient: patients[0], doctor: doctors[0], agent: agents[0], program, amount: 500, index: 1 });
  await upsertPaidOrder({ patient: patients[1], doctor: doctors[1], agent: agents[1], program, amount: 250, index: 2 });

  await QrScan.deleteMany({ deviceInfo: /^demo-device-/ });
  await QrScan.insertMany([
    { doctor: doctors[0]._id, agent: agents[0]._id, patient: patients[0]._id, clinicId: 'CL-DEMO-001', referralSource: 'qr_code', registrationDate: patients[0].createdAt, paymentStatus: 'paid', deviceInfo: 'demo-device-1', ipAddress: '127.0.0.1' },
    { doctor: doctors[1]._id, agent: agents[1]._id, patient: patients[1]._id, clinicId: 'CL-DEMO-002', referralSource: 'qr_code', registrationDate: patients[1].createdAt, paymentStatus: 'paid', deviceInfo: 'demo-device-2', ipAddress: '127.0.0.1' },
    { doctor: doctors[0]._id, agent: agents[0]._id, patient: patients[2]._id, clinicId: 'CL-DEMO-001', referralSource: 'referral_link', registrationDate: patients[2].createdAt, paymentStatus: 'pending', deviceInfo: 'demo-device-3', ipAddress: '127.0.0.1' },
  ]);

  const wallet = await DoctorWallet.findOne({ doctor: doctors[0]._id });
  await WithdrawalRequest.findOneAndUpdate(
    { doctor: doctors[0]._id, requestedAmount: 1200 },
    {
      doctor: doctors[0]._id,
      wallet: wallet?._id,
      requestedAmount: 1200,
      bankAccountHolder: 'Neha Sharma',
      bankAccountNumber: '000000001234',
      ifscCode: 'DEMO0001234',
      status: 'requested',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await SupportTicket.findOneAndUpdate(
    { subject: 'Demo video access support request' },
    {
      userType: 'patient',
      patient: patients[0]._id,
      category: 'video_access',
      subject: 'Demo video access support request',
      description: 'Patient reports video buffering on Day 1.',
      priority: 'medium',
      status: 'open',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const counts = await Promise.all([
    Agent.countDocuments(),
    Doctor.countDocuments(),
    Patient.countDocuments(),
    Program.countDocuments(),
    Exercise.countDocuments(),
    Payment.countDocuments(),
  ]);

  console.log('Demo data seeded');
  console.log(`Counts: agents=${counts[0]}, doctors=${counts[1]}, patients=${counts[2]}, programs=${counts[3]}, exercises=${counts[4]}, payments=${counts[5]}`);
  console.log(`Admin login: ${ADMIN_EMAIL ? adminEmail : (ADMIN_MOBILE || '9000000000')}`);
  console.log('Agent login: agent.demo@physioqr.local');
  console.log('Doctor login: doctor.demo@physioqr.local');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
