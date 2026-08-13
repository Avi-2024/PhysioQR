const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange } = require('../middlewares/validate.middleware');
const {
  pauseProgram,
  resumeProgram,
  extendProgram,
  getPatientProgram,
} = require('../controllers/patientProgram.controller');

router.use(protect);

router.post('/:id/pause', pauseProgram);
router.post('/:id/resume', resumeProgram);
router.post('/:id/extend', authorize('admin'), requireFields('extensionDays'), validateNumberRange('extensionDays', { min: 1 }), extendProgram);
router.get('/:id', getPatientProgram);

module.exports = router;
