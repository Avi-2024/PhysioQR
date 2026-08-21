const Doctor = require('../../models/Doctor.model');
const User = require('../../models/User.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');

// POST /api/doctors/:id/reactivate - Admin restores a suspended doctor.
// This restores portal access and returns the doctor to the approved state.
// QR access is only re-enabled when a QR already exists; admins can generate one
// separately when the doctor has never had a referral QR.
const reactivateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  if (doctor.status !== 'suspended') {
    return res.status(400).json({ message: 'Only suspended doctors can be reactivated' });
  }

  const reason = String(req.body.reason || '').trim();
  if (!reason) {
    return res.status(400).json({ message: 'reason is required' });
  }

  const previousValue = {
    status: doctor.status,
    suspensionReason: doctor.suspensionReason,
    qrCodeActive: doctor.qrCodeActive,
  };

  doctor.status = 'approved';
  doctor.suspensionReason = undefined;
  doctor.qrCodeActive = Boolean(doctor.qrCodeUrl);
  await doctor.save();

  if (doctor.user) {
    await User.findByIdAndUpdate(doctor.user, {
      status: 'active',
      $inc: { tokenVersion: 1 },
    });
  }

  await writeAuditLog({
    req,
    action: 'doctor_reactivated',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: {
      status: doctor.status,
      qrCodeActive: doctor.qrCodeActive,
      reason,
    },
    reason,
  });

  res.json({
    message: doctor.qrCodeActive
      ? 'Doctor reactivated and existing QR enabled'
      : 'Doctor reactivated; generate a QR code before accepting new referrals',
    doctor,
  });
});

module.exports = { reactivateDoctor };
