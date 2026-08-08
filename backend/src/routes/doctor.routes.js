const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  registerDoctor, getAllDoctors, getDoctorById,
  approveDoctor, rejectDoctor, suspendDoctor,
  generateQrCode, disableQrCode,
  getMyProfile, updateMyProfile, getMyPatients, getMyQrStats,
} = require('../controllers/doctor.controller');

router.use(protect);

// ⚠️ Static /me routes MUST come before dynamic /:id routes
router.get('/me/profile',   authorize('doctor'), getMyProfile);
router.put('/me/profile',   authorize('doctor'), updateMyProfile);
router.get('/me/patients',  authorize('doctor'), getMyPatients);
router.get('/me/qr-stats',  authorize('doctor'), getMyQrStats);

// Agent or Admin registers a doctor
router.post('/', authorize('admin', 'agent'), registerDoctor);

// Doctor self-registration — public route, no auth needed (SRS §5.1)
router.post('/self-register', require('../controllers/doctor.controller').registerDoctor);

// Admin routes
router.get('/',                    authorize('admin'), getAllDoctors);
router.get('/:id',                 authorize('admin'), getDoctorById);
router.post('/:id/approve',        authorize('admin'), approveDoctor);
router.post('/:id/reject',         authorize('admin'), rejectDoctor);
router.post('/:id/suspend',        authorize('admin'), suspendDoctor);
router.post('/:id/qr-code',        authorize('admin'), generateQrCode);
router.post('/:id/disable-qr',     authorize('admin'), disableQrCode);

module.exports = router;
