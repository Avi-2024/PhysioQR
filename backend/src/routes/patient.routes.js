const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
const {
  registerPatient,
  verifyPatientMobile,
  recordConsent,
  getOnboardingStatus,
  getOnboardingQuote,
  getMyProgram,
  getMyProgress,
  getMyPayments,
} = require('../controllers/patient.controller');
const { getClinicalAccess } = require('../controllers/patient-clinical-access.controller');
const { getMyPrescription } = require('../controllers/patientPrescription.controller');
const { getPurchaseQuote } = require('../controllers/patientPurchase.controller');

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

router.use(protect);
router.use(authorize('patient'));
router.post('/consent', recordConsent);
router.get('/me/onboarding-status', getOnboardingStatus);
router.get('/me/clinical-access', getClinicalAccess);
router.get('/me/onboarding-quote', getOnboardingQuote);
router.get('/me/purchase-quote', getPurchaseQuote);
router.get('/me/program', getMyProgram);
router.get('/me/prescription', getMyPrescription);
router.get('/me/progress', getMyProgress);
router.get('/me/payments', getMyPayments);

module.exports = router;
