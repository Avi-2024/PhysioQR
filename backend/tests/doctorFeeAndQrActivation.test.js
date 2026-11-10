const test = require('node:test');
const assert = require('node:assert/strict');
const AuditLog = require('../src/models/AuditLog.model');
const { DoctorWallet } = require('../src/models/Wallet.model');
const User = require('../src/models/User.model');
const Doctor = require('../src/models/Doctor.model');

// Disable mongoose buffering timeouts in unit tests
AuditLog.create = async () => ({});
DoctorWallet.exists = async () => false;
DoctorWallet.findOne = async () => null;
DoctorWallet.findOneAndUpdate = async () => ({});
User.findById = async () => null;
User.findOne = async () => null;
User.create = async (u) => ({ ...u, _id: '507f1f77bcf86cd799439022', save: async () => {} });
const AuthSession = require('../src/models/AuthSession.model');
AuthSession.updateMany = async () => ({});
const authSessionService = require('../src/services/authSession.service');
authSessionService.revokeOwnerSessions = async () => ({});

const DOCTOR_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439022';

test('direct website doctor provisioned without fee leaves qrCodeActive false', async () => {
  const { provisionApprovedDoctor } = require('../src/services/doctorApproval.service');

  const doctor = {
    _id: DOCTOR_ID,
    doctorId: 'DR999',
    registrationSource: 'website_direct',
    fullName: 'Direct Doctor',
    email: 'direct@clinic.com',
    mobile: '9876543210',
    approvedPatientFee: undefined,
    status: 'submitted',
    async save() { this.saved = true; },
  };

  await provisionApprovedDoctor({ doctor });
  assert.equal(doctor.status, 'approved');
  assert.equal(doctor.qrCodeActive, false, 'QR code should NOT be active until doctor sets fee');
  assert.ok(doctor.referralCode);
});

test('direct website doctor with approvedPatientFee sets qrCodeActive true', async () => {
  const { provisionApprovedDoctor } = require('../src/services/doctorApproval.service');

  const doctor = {
    _id: DOCTOR_ID,
    doctorId: 'DR999',
    registrationSource: 'website_direct',
    fullName: 'Direct Doctor',
    email: 'direct@clinic.com',
    mobile: '9876543210',
    approvedPatientFee: 1500,
    status: 'submitted',
    async save() { this.saved = true; },
  };

  await provisionApprovedDoctor({ doctor });
  assert.equal(doctor.status, 'approved');
  assert.equal(doctor.qrCodeActive, true, 'QR code should be active once fee is set');
});

test('Admin can approve direct website doctor with zero or omitted fee', async () => {
  const { approveDoctor } = require('../src/controllers/admin/doctor-approval.controller');

  const doctor = {
    _id: DOCTOR_ID,
    doctorId: 'DR999',
    registrationSource: 'website_direct',
    fullName: 'Direct Doctor',
    revenueModel: 'split',
    feeShareType: 'percentage',
    feeSharePercentage: 50,
    status: 'submitted',
    approvedPatientFee: 0,
    async save() { this.saved = true; },
  };

  const origFindById = Doctor.findById;
  try {
    Doctor.findById = async () => doctor;

    let status = 200, responseData;
    const req = {
      params: { id: DOCTOR_ID },
      body: { approvedPatientFee: 0, feeShareHoldingDays: 15 },
      user: { _id: 'admin1', role: 'admin' },
    };
    const res = {
      status(code) { status = code; return res; },
      json(data) { responseData = data; return res; },
    };

    await new Promise((resolve, reject) => {
      approveDoctor(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
      // In case res.json is called synchronously, we can check responseData
      setTimeout(resolve, 50);
    });

    assert.equal(status, 200);
    assert.equal(doctor.status, 'approved');
    assert.equal(doctor.qrCodeActive, false);
    assert.match(responseData.message, /QR code will activate when patient programme fee is confirmed/);
  } finally {
    Doctor.findById = origFindById;
  }
});

test('Doctor can set their own patient fee via updateMyPatientFee and activate QR', async () => {
  const { updateMyPatientFee } = require('../src/controllers/doctor.controller');

  let savedCalled = false;
  const doctor = {
    _id: DOCTOR_ID,
    user: USER_ID,
    doctorId: 'DR999',
    registrationSource: 'website_direct',
    fullName: 'Direct Doctor',
    status: 'approved',
    approvedPatientFee: 0,
    qrCodeActive: false,
    async save() { savedCalled = true; },
  };

  const origFindOne = Doctor.findOne;
  try {
    Doctor.findOne = async () => doctor;

    let status = 200, responseData;
    const req = {
      user: { _id: USER_ID, role: 'doctor' },
      body: { approvedPatientFee: 1800 },
    };
    const res = {
      set() {},
      status(code) { status = code; return res; },
      json(data) { responseData = data; return res; },
    };

    await new Promise((resolve, reject) => {
      updateMyPatientFee(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
      setTimeout(resolve, 50);
    });

    assert.equal(status, 200);
    assert.equal(doctor.approvedPatientFee, 1800);
    assert.equal(doctor.qrCodeActive, true, 'Setting fee activates QR code');
    assert.equal(savedCalled, true);
    assert.match(responseData.message, /Patient programme fee confirmed and QR code activated/);
  } finally {
    Doctor.findOne = origFindOne;
  }
});


test('sendDoctorApprovalNotification dispatches SMS and Email with required approval and credentials format', async () => {
  const { sendDoctorApprovalNotification } = require('../src/services/doctorApproval.service');
  const notificationService = require('../src/services/notification.service');

  const dispatched = [];
  const origCreateNotification = notificationService.createNotification;
  notificationService.createNotification = async (payload) => {
    dispatched.push(payload);
    return { ...payload, _id: 'notif_' + Math.random(), status: 'sent' };
  };

  try {
    const doctor = {
      _id: DOCTOR_ID,
      fullName: 'Sneha Sharma',
      mobile: '9876543210',
      email: 'sneha@clinic.com',
    };

    const results = await sendDoctorApprovalNotification({
      doctor,
      temporaryPassword: 'Doctor@123456',
    });

    assert.equal(dispatched.length, 2, 'Should dispatch 1 SMS and 1 Email');
    
    // Check SMS notification
    const sms = dispatched.find((d) => d.channel === 'sms');
    assert.ok(sms, 'SMS notification must be created');
    assert.equal(sms.recipientType, 'doctor');
    assert.equal(sms.recipientContact, '9876543210');
    assert.match(sms.message, /Approval Confirmation: Account approve ho chuka hai\./);
    assert.match(sms.message, /Login ID: 9876543210/);
    assert.match(sms.message, /Temporary Password: Doctor@123456/);
    assert.match(sms.message, /Login Link: .*\/login/);

    // Check Email notification
    const email = dispatched.find((d) => d.channel === 'email');
    assert.ok(email, 'Email notification must be created');
    assert.equal(email.recipientType, 'doctor');
    assert.equal(email.recipientContact, 'sneha@clinic.com');
    assert.match(email.message, /Approval Confirmation: Account approve ho chuka hai\./);
    assert.match(email.message, /Login ID: 9876543210/);
    assert.match(email.message, /Temporary Password: Doctor@123456/);
    assert.match(email.message, /Login Link: .*\/login/);
    assert.ok(email.metadata?.html, 'Email must include rich HTML template');
    assert.match(email.metadata.html, /Approval Confirmation: Account approve ho chuka hai\./);
  } finally {
    notificationService.createNotification = origCreateNotification;
  }
});


test('Admin can update doctor details via updateDoctorByAdmin', async () => {
  const { updateDoctorByAdmin } = require('../src/controllers/doctor.controller');

  let savedCalled = false;
  const doctor = {
    _id: DOCTOR_ID,
    doctorId: 'DR999',
    fullName: 'Old Doctor Name',
    specialization: 'Medicin',
    clinicName: 'Old Clinic',
    mobile: '9876543210',
    email: 'old@clinic.com',
    async save() { savedCalled = true; },
  };

  const origFindById = Doctor.findById;
  const origFindOne = Doctor.findOne;
  try {
    Doctor.findById = async () => doctor;
    Doctor.findOne = async () => null; // no duplicate

    let status = 200, responseData;
    const req = {
      params: { id: DOCTOR_ID },
      body: {
        fullName: 'Dr. Sneha Docs',
        specialization: 'Medicine & Ortho',
        clinicName: 'Gasto Cure Clinic',
        city: 'Chetwayi',
        state: 'Kerala',
      },
      user: { _id: 'admin1', role: 'admin' },
    };
    const res = {
      status(code) { status = code; return res; },
      json(data) { responseData = data; return res; },
    };

    await new Promise((resolve, reject) => {
      updateDoctorByAdmin(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
      setTimeout(resolve, 50);
    });

    assert.equal(status, 200);
    assert.equal(doctor.fullName, 'Dr. Sneha Docs');
    assert.equal(doctor.specialization, 'Medicine & Ortho');
    assert.equal(doctor.clinicName, 'Gasto Cure Clinic');
    assert.equal(doctor.city, 'Chetwayi');
    assert.equal(doctor.state, 'Kerala');
    assert.equal(savedCalled, true);
    assert.match(responseData.message, /Doctor details updated successfully/);
  } finally {
    Doctor.findById = origFindById;
    Doctor.findOne = origFindOne;
  }
});

test('Password reset via OTP resets user password successfully', async () => {
  const { resetPassword } = require('../src/controllers/auth.controller');
  const otpService = require('../src/services/otp.service');

  const user = {
    _id: USER_ID,
    mobile: '9876543210',
    password: 'old_hashed_password',
    mustChangePassword: true,
    async save() { this.saved = true; },
  };

  const origUserFindOne = User.findOne;
  const origVerifyOtp = otpService.verifyOtp;

  try {
    User.findOne = async () => user;
    otpService.verifyOtp = async () => ({ mobile: '9876543210' });

    let status = 200, responseData;
    const req = {
      body: {
        mobile: '9876543210',
        otp: '123456',
        newPassword: 'MyNewStrongPassword@2026',
      },
    };
    const res = {
      status(code) { status = code; return res; },
      json(data) { responseData = data; return res; },
    };

    await new Promise((resolve, reject) => {
      resetPassword(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
      setTimeout(resolve, 50);
    });

    assert.equal(status, 200);
    assert.equal(user.password, 'MyNewStrongPassword@2026');
    assert.equal(user.mustChangePassword, false);
    assert.equal(user.saved, true);
    assert.match(responseData.message, /Password reset successfully/);
  } finally {
    User.findOne = origUserFindOne;
    otpService.verifyOtp = origVerifyOtp;
  }
});

test('Admin can revert doctor approval back to under_review', async () => {
  const { revertDoctorApproval } = require('../src/controllers/admin/doctor-approval.controller');

  const doctor = {
    _id: DOCTOR_ID,
    doctorId: 'DR999',
    status: 'approved',
    approvalDate: new Date(),
    qrCodeActive: true,
    user: USER_ID,
    async save() { this.saved = true; },
  };

  const linkedUser = {
    _id: USER_ID,
    status: 'active',
    tokenVersion: 1,
    role: 'doctor',
    async save() { this.saved = true; },
  };

  const origDoctorFindById = Doctor.findById;
  const origUserFindById = User.findById;

  try {
    Doctor.findById = async () => doctor;
    User.findById = async () => linkedUser;

    let status = 200, responseData;
    const req = {
      params: { id: DOCTOR_ID },
      body: { reason: 'Approval reverted due to incomplete registration proof' },
      user: { _id: 'admin_123', role: 'admin' },
    };
    const res = {
      status(code) { status = code; return res; },
      json(data) { responseData = data; return res; },
    };

    await new Promise((resolve, reject) => {
      revertDoctorApproval(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
      setTimeout(resolve, 50);
    });

    assert.equal(status, 200);
    assert.equal(doctor.status, 'under_review');
    assert.equal(doctor.qrCodeActive, false);
    assert.equal(doctor.approvalDate, undefined);
    assert.equal(linkedUser.status, 'inactive');
    assert.equal(linkedUser.tokenVersion, 2);
    assert.equal(doctor.saved, true);
    assert.equal(linkedUser.saved, true);
    assert.match(responseData.message, /approval reverted/i);
  } finally {
    Doctor.findById = origDoctorFindById;
    User.findById = origUserFindById;
  }
});
