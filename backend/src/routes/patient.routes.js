const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const {
  registerPatient, verifyPatientMobile,
  recordConsent, getMyProgram, getMyProgress, getMyPayments,
} = require('../controllers/patient.controller');

// Public — patient registers via QR code (no login needed yet)
router.post('/register', requireFields('fullName', 'mobile'), registerPatient);
router.post('/verify-mobile', requireFields('mobile'), verifyPatientMobile);

// Patient submits consent (SRS §13)
router.post('/consent', requireFields('patient'), recordConsent);

// Protected — patient must be logged in (via OTP token)
router.use(protect);
router.get('/me/program',   getMyProgram);
router.get('/me/progress',  getMyProgress);
router.get('/me/payments',  getMyPayments);

module.exports = router;
