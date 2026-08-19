const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange } = require('../middlewares/validate.middleware');
const {
  submitDayProgress,
  getDayContent,
  trackExerciseEvent,
  getProgramProgressSummary,
  adminUnlockDay,
} = require('../controllers/progress.controller');

router.use(protect);

router.post('/submit-day', requireFields('patientProgramId', 'dayNumber'), submitDayProgress);
router.post('/admin-unlock', authorize('admin'), requireFields('patientProgramId', 'dayNumber'), validateNumberRange('dayNumber', { min: 1 }), adminUnlockDay);
router.get('/:patientProgramId/summary', getProgramProgressSummary);
router.post(
  '/:patientProgramId/day/:dayNumber/exercises/:exerciseId/event',
  requireFields('eventType'),
  trackExerciseEvent
);
router.get('/:patientProgramId/day/:dayNumber', getDayContent);

module.exports = router;
