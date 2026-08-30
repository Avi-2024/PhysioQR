require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Agent = require('../src/models/Agent.model');
const Doctor = require('../src/models/Doctor.model');
const Patient = require('../src/models/Patient.model');

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@12345';

async function upsertUser({ role, email, mobile, profileModel }) {
  let user = await User.findOne({ $or: [{ email }, { mobile }] });
  if (!user) {
    user = new User({ role, email, mobile, password: TEST_PASSWORD, status: 'active', profileModel });
  } else {
    user.role = role;
    user.email = email;
    user.mobile = mobile;
    user.password = TEST_PASSWORD;
    user.status = 'active';
    if (profileModel) user.profileModel = profileModel;
  }
  await user.save();
  return user;
}

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is required');

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_SEED !== 'true') {
    throw new Error('Refusing to seed test accounts in production. Set ALLOW_TEST_SEED=true only if you intentionally want this.');
  }

  await mongoose.connect(mongoUri);

  const agentUser = await upsertUser({
    role: 'agent',
    email: 'agent.test@physioqr.local',
    mobile: '9100000091',
    profileModel: 'Agent',
  });

  let agent = await Agent.findOne({ user: agentUser._id });
  if (!agent) agent = new Agent({ user: agentUser._id });
  Object.assign(agent, {
    fullName: 'Amit Test Agent',
    mobile: '9100000091',
    whatsapp: '9100000091',
    email: 'agent.test@physioqr.local',
    city: 'Noida',
    state: 'Uttar Pradesh',
    assignedRegion: 'Test Region',
    joiningDate: new Date(),
    reportingPerson: 'Admin',
    status: 'active',
  });
  await agent.save();
  agentUser.profileRef = agent._id;
  await agentUser.save();

  const doctorUser = await upsertUser({
    role: 'doctor',
    email: 'doctor.test@physioqr.local',
    mobile: '9200000091',
    profileModel: 'Doctor',
  });

  let doctor = await Doctor.findOne({ user: doctorUser._id });
  if (!doctor) doctor = new Doctor({ user: doctorUser._id });
  Object.assign(doctor, {
    agent: agent._id,
    fullName: 'Dr. Neha Test',
    mobile: '9200000091',
    whatsapp: '9200000091',
    email: 'doctor.test@physioqr.local',
    qualification: 'MBBS, MS Orthopedics',
    specialization: 'Orthopedics',
    medicalRegNumber: 'TEST-DOC-0091',
    registrationCouncil: 'Test Medical Council',
    yearsOfExperience: 10,
    languagesSpoken: ['English', 'Hindi'],
    clinicName: 'PhysioQR Test Clinic',
    clinicAddress: 'Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    approvedPatientFee: 500,
    requestedPatientFee: 500,
    revenueModel: 'split',
    feeSharePercentage: 60,
    feeShareType: 'percentage',
    feeShareCalculationBasis: 'gross',
    feeShareHoldingDays: 15,
    minWithdrawal: 1000,
    maxWithdrawal: 50000,
    payoutCycle: 'monthly',
    status: 'approved',
    referralCode: 'DR-TEST-0091',
    qrCodeActive: true,
    kycStatus: 'approved',
    bankAccountHolder: 'Neha Test',
    bankAccountNumber: '000000000091',
    bankName: 'Test Bank',
    ifscCode: 'TEST0000091',
    bankVerified: true,
  });
  await doctor.save();
  doctorUser.profileRef = doctor._id;
  await doctorUser.save();

  let patient = await Patient.findOne({ mobile: '7470562824' });
  if (!patient) patient = new Patient({ mobile: '7470562824' });
  Object.assign(patient, {
    fullName: 'Ravi Test Patient',
    whatsapp: '7470562824',
    email: 'patient.test@physioqr.local',
    age: 35,
    gender: 'male',
    city: 'Noida',
    state: 'Uttar Pradesh',
    preferredLanguage: 'en',
    referringDoctor: doctor._id,
    referralSource: 'qr_code',
    referralLocked: false,
    mobileVerified: true,
    consentAccepted: true,
    consentVersion: 'test-v1',
    consentDate: new Date(),
    status: 'active',
  });
  await patient.save();

  console.log('\nPhysioQR test users are ready.');
  console.log('--------------------------------');
  console.log(`Doctor  : doctor.test@physioqr.local / ${TEST_PASSWORD}`);
  console.log('Doctor mobile: 9200000091');
  console.log(`Agent   : agent.test@physioqr.local / ${TEST_PASSWORD}`);
  console.log('Agent mobile : 9100000091');
  console.log('Patient : 7470562824 (OTP login; use OTP returned by /auth/send-otp in development DB mode)');
  console.log(`Doctor referral code: ${doctor.referralCode}`);
  console.log('Admin   : existing admin account was left unchanged.');
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
