const { createReferralQr } = require('./doctorReferralQr.service');
const User = require('../models/User.model');
const { DoctorWallet } = require('../models/Wallet.model');

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

  // Refresh previously saved localhost QR images when approving a doctor.
  const { referralUrl, qrCodeUrl } = await createReferralQr(doctor);
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
    loginUser.password = generatedPassword;
    loginUser.mustChangePassword = true;
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
    const isDirect = doctor.registrationSource === 'website_direct';
    const hasPatientFee = Number(doctor.approvedPatientFee || 0) > 0;
    doctor.qrCodeActive = isDirect ? hasPatientFee : (hasPatientFee || Number(doctor.requestedPatientFee || 0) > 0 || doctor.qrCodeActive === true);
    await doctor.save();

    return {
      doctor,
      temporaryPassword: generatedPassword,
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


async function sendDoctorApprovalNotification({ doctor, temporaryPassword }) {
  if (!doctor || !temporaryPassword) return { sms: null, email: null };

  const notificationService = require('./notification.service');
  const { resolvePatientSiteOrigin } = require('./doctorReferralQr.service');

  let loginUrl = '/login';
  try {
    loginUrl = `${resolvePatientSiteOrigin()}/login`;
  } catch {}

  const loginId = doctor.mobile || doctor.email;
  const doctorName = doctor.fullName ? `Dr. ${doctor.fullName}` : 'Doctor';

  // Format exactly matching user's specification:
  // Approval Confirmation: Account approve ho chuka hai.
  // Login ID: Registered Mobile Number (ya Email).
  // Temporary Password: Auto-generated secure password (jaise Doctor@123456).
  // Login Link: Direct sign-in portal link.
  const smsMessage = `Dear ${doctorName},
Approval Confirmation: Account approve ho chuka hai.
Login ID: ${loginId}
Temporary Password: ${temporaryPassword}
Login Link: ${loginUrl}
Team PhysioQR`;

  const emailSubject = 'PhysioQR Doctor Account Approved - Your Login Credentials';
  const emailMessage = `Dear ${doctorName},

Approval Confirmation: Account approve ho chuka hai.

Login ID: ${loginId}
Temporary Password: ${temporaryPassword}
Login Link: ${loginUrl}

Please sign in to Doctor Portal and set your patient programme fee to activate your clinic reception QR standee.

Best regards,
Team PhysioQR`;

  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 24px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: bold;">PhysioQR Clinical Network</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Partner Clinic Portal Onboarding</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">PhysioQR Doctor Partner Account Approved</h2>
      <p style="margin: 0 0 16px; font-size: 15px; color: #475569;">Dear ${doctorName},</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
        <p style="margin: 0; color: #15803d; font-size: 14px; font-weight: 600;">
          ✅ Approval Confirmation: Account approve ho chuka hai.
        </p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Your Doctor Portal Credentials</h3>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">Login ID:</div>
          <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #0f172a;">${loginId}</div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">Temporary Password:</div>
          <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #0f766e; background: #e6fffa; display: inline-block; padding: 3px 8px; border-radius: 6px; border: 1px solid #99f6e4;">${temporaryPassword}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">Login Link:</div>
          <div><a href="${loginUrl}" style="color: #0d9488; font-size: 14px; font-weight: 600; text-decoration: underline;">${loginUrl}</a></div>
        </div>
      </div>
      <div style="margin-bottom: 28px;">
        <h4 style="margin: 0 0 8px; font-size: 14px; color: #0f172a;">Next Steps to Activate Your QR Standee:</h4>
        <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.6;">
          <li>Click the button below to sign in using your credentials.</li>
          <li>Set or confirm your Patient Programme Fee in the Doctor Portal (50:50 Partner Split Model).</li>
          <li>Your reception QR standee and referral link will activate instantly for print and patient onboarding.</li>
        </ol>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${loginUrl}" style="background-color: #0f766e; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; display: inline-block;">Sign In to Doctor Portal</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 20px;" />
      <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
        PhysioQR Clinical Network • Digital Physiotherapy Rehabilitation
      </p>
    </div>
  </div>
</body>
</html>`;

  const results = { sms: null, email: null };

  if (doctor.mobile) {
    try {
      results.sms = await notificationService.createNotification({
        recipientType: 'doctor',
        doctor: doctor._id,
        recipientContact: doctor.mobile,
        type: 'doctor_approved',
        channel: 'sms',
        title: 'PhysioQR Doctor Account Approved',
        message: smsMessage,
        metadata: { doctorId: doctor._id, temporaryPassword, loginUrl, loginId },
      });
    } catch (error) {
      console.error('Doctor approval SMS dispatch failed:', error.message);
    }
  }

  if (doctor.email) {
    try {
      results.email = await notificationService.createNotification({
        recipientType: 'doctor',
        doctor: doctor._id,
        recipientContact: doctor.email,
        type: 'doctor_approved',
        channel: 'email',
        title: emailSubject,
        message: emailMessage,
        metadata: { doctorId: doctor._id, temporaryPassword, loginUrl, loginId, html: emailHtml },
      });
    } catch (error) {
      console.error('Doctor approval email dispatch failed:', error.message);
    }
  }

  return results;
}

module.exports = { provisionApprovedDoctor, createTemporaryPassword, sendDoctorApprovalNotification };
