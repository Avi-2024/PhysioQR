const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
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
  validateSchema({
    body: {
      name: { type: 'string', min: 2, max: 150, required: true },
      programCode: { type: 'string', min: 2, max: 60 },
      painCategory: { type: 'objectId' },
      durationDays: { type: 'number', min: 1, max: 365, required: true },
      sessionsPerDay: { type: 'number', min: 1, max: 10 },
      defaultPrice: { type: 'number', min: 0, max: 100000 },
      difficultyLevel: { type: 'string', max: 60 },
    },
  }),
  createProgram
);
router.put('/:id', authorize('admin'), validateSchema({
  params: { id: { type: 'objectId', required: true } },
  body: {
    name: { type: 'string', min: 2, max: 150 },
    programCode: { type: 'string', min: 2, max: 60 },
    painCategory: { type: 'objectId' },
    durationDays: { type: 'number', min: 1, max: 365 },
    sessionsPerDay: { type: 'number', min: 1, max: 10 },
    defaultPrice: { type: 'number', min: 0, max: 100000 },
    difficultyLevel: { type: 'string', max: 60 },
  },
}), updateProgram);

router.get('/:id/days', getProgramDays);
router.post('/:id/days', authorize('admin'), validateSchema({
  params: { id: { type: 'objectId', required: true } },
  body: {
    dayNumber: { type: 'number', min: 1, max: 365, required: true },
    title: { type: 'string', max: 150 },
    exercises: { type: 'array' },
  },
}), createProgramDay);
router.put('/:id/days/:dayId', authorize('admin'), validateSchema({
  params: {
    id: { type: 'objectId', required: true },
    dayId: { type: 'objectId', required: true },
  },
  body: {
    dayNumber: { type: 'number', min: 1, max: 365 },
    title: { type: 'string', max: 150 },
    exercises: { type: 'array' },
  },
}), updateProgramDay);

module.exports = router;
