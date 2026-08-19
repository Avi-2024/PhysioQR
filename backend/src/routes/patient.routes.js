const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
const {
  registerPatient,
  verifyPatientMobile,
  recordConsent,
  getOnboardingQuote,
  getMyProgram,
  getMyProgress,
  getMyPayments,
} = require('../controllers/patient.controller');

// Public patient registration from a doctor QR code.
router.post('/register', validateSchema({
  body: {
    fullName: { type: 'string', min: 2, max: 100, required: true },
    mobile: { type: 'mobile', required: true },
    doctorCode: { type: 'string', min: 3, max: 40 },
    scanId: { type: 'objectId' },
    email: { type: 'email' },
    city: { type: 'string', max: 80 },
  },
}), registerPatient);
router.post('/verify-mobile', validateSchema({ body: { mobile: { type: 'mobile', required: true } } }), verifyPatientMobile);

// Protected patient self-service APIs require an OTP-backed patient session.
router.use(protect);
router.use(authorize('patient'));
router.post('/consent', recordConsent);
router.get('/me/onboarding-quote', getOnboardingQuote);
router.get('/me/program', getMyProgram);
router.get('/me/progress', getMyProgress);
router.get('/me/payments', getMyPayments);

module.exports = router;
