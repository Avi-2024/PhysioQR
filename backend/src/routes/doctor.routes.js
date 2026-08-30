const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange } = require('../middlewares/validate.middleware');
const { reactivateDoctor } = require('../controllers/admin/doctor-reactivation.controller');
const { updateDoctorKycAndBank } = require('../controllers/admin/doctor-kyc.controller');
const { registerDoctorSecure } = require('../controllers/doctorRegistration.controller');
const {
  getAllDoctors, getDoctorById,
  approveDoctor, rejectDoctor, requestDoctorDocuments, suspendDoctor,
  generateQrCode, disableQrCode, reactivateQrCode,
  uploadKycDocument, getKycDocumentAccess, uploadMyKycDocument, getMyKycDocumentAccess,
  getMyProfile, updateMyProfile, getMySummary, getMyPatients, getMyQrStats,
} = require('../controllers/doctor.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/self-register', requireFields('fullName', 'mobile'), registerDoctorSecure);
router.use(protect);
router.get('/me/profile', authorize('doctor'), getMyProfile);
router.put('/me/profile', authorize('doctor'), updateMyProfile);
router.get('/me/summary', authorize('doctor'), getMySummary);
router.get('/me/patients', authorize('doctor'), getMyPatients);
router.get('/me/qr-stats', authorize('doctor'), getMyQrStats);
router.post('/me/kyc-documents', authorize('doctor'), upload.single('document'), uploadMyKycDocument);
router.get('/me/kyc-documents/:documentId/access', authorize('doctor'), getMyKycDocumentAccess);
router.post('/', authorize('admin', 'agent'), requireFields('fullName', 'mobile'), registerDoctorSecure);
router.get('/', authorize('admin'), getAllDoctors);
router.get('/:id', authorize('admin'), getDoctorById);
router.post('/:id/approve', authorize('admin'), validateNumberRange('approvedPatientFee', { min: 0 }), validateNumberRange('feeSharePercentage', { min: 0, max: 100 }), validateNumberRange('feeShareHoldingDays', { min: 0 }), approveDoctor);
router.post('/:id/reject', authorize('admin'), rejectDoctor);
router.post('/:id/request-documents', authorize('admin'), requireFields('reason'), requestDoctorDocuments);
router.post('/:id/suspend', authorize('admin'), suspendDoctor);
router.post('/:id/reactivate', authorize('admin'), requireFields('reason'), reactivateDoctor);
router.patch('/:id/kyc-bank', authorize('admin'), updateDoctorKycAndBank);
router.post('/:id/kyc-documents', authorize('admin'), upload.single('document'), uploadKycDocument);
router.get('/:id/kyc-documents/:documentId/access', authorize('admin'), getKycDocumentAccess);
router.post('/:id/qr-code', authorize('admin'), generateQrCode);
router.post('/:id/disable-qr', authorize('admin'), disableQrCode);
router.post('/:id/reactivate-qr', authorize('admin'), reactivateQrCode);
module.exports = router;
