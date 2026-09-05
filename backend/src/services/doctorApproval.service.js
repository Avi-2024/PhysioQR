const QRCode = require('qrcode');
const User = require('../models/User.model');
const { DoctorWallet } = require('../models/Wallet.model');

function buildReferralUrl(doctor) {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/register?doctor=${doctor.doctorId}`;
}

function createTemporaryPassword() {
  return `Doctor@${Math.floor(100000 + Math.random() * 900000)}`;
}

function doctorLoginFilter(doctor) {
  const clauses = [];
  if (doctor.email) clauses.push({ email: String(doctor.email).trim().toLowerCase() });
  if (doctor.mobile) clauses.push({ mobile: String(doctor.mobile).trim() });
  return clauses.length ? { $or: clauses } : null;
}

async function provisionApprovedDoctor({ doctor, password }) {
  if (!doctor) {
    const error = new Error('Doctor is required for approval provisioning');
    error.status = 400;
    throw error;
  }

  const referralUrl = buildReferralUrl(doctor);
  const qrCodeUrl = doctor.qrCodeUrl || await QRCode.toDataURL(referralUrl);
  const generatedPassword = password || createTemporaryPassword();
  const walletAlreadyExists = Boolean(await DoctorWallet.exists({ doctor: doctor._id }));
  let loginUser = doctor.user ? await User.findById(doctor.user) : null;
  let createdLoginUser = false;

  try {
    if (!loginUser) {
      const loginFilter = doctorLoginFilter(doctor);
      const existing = loginFilter ? await User.findOne(loginFilter) : null;

      if (existing) {
        if (existing.role !== 'doctor') {
          const error = new Error('Doctor login mobile or email belongs to another role');
          error.status = 409;
          throw error;
        }
        if (existing.profileRef && String(existing.profileRef) !== String(doctor._id)) {
          const error = new Error('Doctor login mobile or email is already linked to another doctor');
          error.status = 409;
          throw error;
        }
        loginUser = existing;
      } else {
        loginUser = await User.create({
          role: 'doctor',
          email: doctor.email ? String(doctor.email).trim().toLowerCase() : undefined,
          mobile: doctor.mobile ? String(doctor.mobile).trim() : undefined,
          password: generatedPassword,
          status: 'active',
          mustChangePassword: true,
        });
        createdLoginUser = true;
      }
    }

    loginUser.status = 'active';
    loginUser.profileRef = doctor._id;
    loginUser.profileModel = 'Doctor';
    await loginUser.save();

    await DoctorWallet.findOneAndUpdate(
      { doctor: doctor._id },
      { $setOnInsert: { doctor: doctor._id } },
      { upsert: true, new: true }
    );

    doctor.status = 'approved';
    doctor.approvalDate = doctor.approvalDate || new Date();
    doctor.user = loginUser._id;
    doctor.referralCode = doctor.doctorId;
    doctor.qrCodeUrl = qrCodeUrl;
    doctor.qrCodeActive = true;
    await doctor.save();

    return {
      doctor,
      temporaryPassword: createdLoginUser && !password ? generatedPassword : undefined,
      referralUrl,
    };
  } catch (error) {
    if (createdLoginUser && loginUser?._id) {
      await User.deleteOne({ _id: loginUser._id }).catch(() => {});
    }
    if (!walletAlreadyExists) {
      await DoctorWallet.deleteOne({ doctor: doctor._id }).catch(() => {});
    }
    throw error;
  }
}

module.exports = { provisionApprovedDoctor };
