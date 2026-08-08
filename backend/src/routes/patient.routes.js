const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  registerPatient, verifyPatientMobile,
  getMyProgram, getMyProgress, getMyPayments,
} = require('../controllers/patient.controller');

// Public — patient registers via QR code (no login needed yet)
router.post('/register', registerPatient);
router.post('/verify-mobile', verifyPatientMobile);

// Patient submits consent (SRS §13)
router.post('/consent', asyncHandler(async (req, res) => {
  const PatientConsent = require('../models/PatientConsent.model');
  const SystemSettings = require('../models/SystemSettings.model');
  const settings = await SystemSettings.findOne();
  const consent = await PatientConsent.create({
    ...req.body,
    consentVersion: settings?.consentVersion || 'v1.0',
    ipAddress: req.ip,
    deviceInfo: req.headers['user-agent'],
  });
  // Mark consent accepted on patient record
  await require('../models/Patient.model').findByIdAndUpdate(
    req.body.patient,
    { consentAccepted: true, consentVersion: consent.consentVersion, consentDate: new Date() }
  );
  res.status(201).json({ message: 'Consent recorded' });
}));

// Protected — patient must be logged in (via OTP token)
router.use(protect);
router.get('/me/program',   getMyProgram);
router.get('/me/progress',  getMyProgress);
router.get('/me/payments',  getMyPayments);

module.exports = router;
