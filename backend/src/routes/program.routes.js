const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange } = require('../middlewares/validate.middleware');
const {
  getPrograms,
  createProgram,
  updateProgram,
  getProgramDays,
  createProgramDay,
  updateProgramDay,
} = require('../controllers/program.controller');

router.use(protect);

router.get('/', getPrograms);
router.post(
  '/',
  authorize('admin'),
  requireFields('name', 'durationDays'),
  validateNumberRange('durationDays', { min: 1 }),
  validateNumberRange('sessionsPerDay', { min: 1 }),
  validateNumberRange('defaultPrice', { min: 0 }),
  createProgram
);
router.put('/:id', authorize('admin'), updateProgram);

router.get('/:id/days', getProgramDays);
router.post('/:id/days', authorize('admin'), requireFields('dayNumber'), validateNumberRange('dayNumber', { min: 1 }), createProgramDay);
router.put('/:id/days/:dayId', authorize('admin'), updateProgramDay);

module.exports = router;
