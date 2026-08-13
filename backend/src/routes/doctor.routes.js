const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange } = require('../middlewares/validate.middleware');
const {
  registerDoctor, getAllDoctors, getDoctorById,
  approveDoctor, rejectDoctor, suspendDoctor,
  generateQrCode, disableQrCode, reactivateQrCode, updateKycAndBank,
  getMyProfile, updateMyProfile, getMyPatients, getMyQrStats,
} = require('../controllers/doctor.controller');

router.post('/self-register', requireFields('fullName', 'mobile'), registerDoctor);

router.use(protect);

// ⚠️ Static /me routes MUST come before dynamic /:id routes
router.get('/me/profile',   authorize('doctor'), getMyProfile);
router.put('/me/profile',   authorize('doctor'), updateMyProfile);
router.get('/me/patients',  authorize('doctor'), getMyPatients);
router.get('/me/qr-stats',  authorize('doctor'), getMyQrStats);

// Agent or Admin registers a doctor
router.post('/', authorize('admin', 'agent'), requireFields('fullName', 'mobile'), registerDoctor);

// Doctor self-registration — public route, no auth needed (SRS §5.1)
// Admin routes
router.get('/',                    authorize('admin'), getAllDoctors);
router.get('/:id',                 authorize('admin'), getDoctorById);
router.post(
  '/:id/approve',
  authorize('admin'),
  validateNumberRange('approvedPatientFee', { min: 0 }),
  validateNumberRange('feeSharePercentage', { min: 0, max: 100 }),
  validateNumberRange('feeShareHoldingDays', { min: 0 }),
  approveDoctor
);
router.post('/:id/reject',         authorize('admin'), rejectDoctor);
router.post('/:id/suspend',        authorize('admin'), suspendDoctor);
router.patch('/:id/kyc-bank',      authorize('admin'), updateKycAndBank);
router.post('/:id/qr-code',        authorize('admin'), generateQrCode);
router.post('/:id/disable-qr',     authorize('admin'), disableQrCode);
router.post('/:id/reactivate-qr',  authorize('admin'), reactivateQrCode);

module.exports = router;
