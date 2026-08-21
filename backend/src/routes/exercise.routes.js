const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
const {
  getExercises,
  createExercise,
  getExerciseById,
  updateExercise,
  setExerciseStatus,
  deleteExercise,
} = require('../controllers/exercise.controller');

router.use(protect);

const exerciseBodySchema = {
  name: { type: 'string', min: 2, max: 150 },
  nameHindi: { type: 'string', max: 150 },
  description: { type: 'string', max: 3000 },
  videoUrl: { type: 'youtubeUrl' },
  thumbnail: { type: 'string', max: 1000 },
  sets: { type: 'number', min: 0, max: 100 },
  repetitions: { type: 'number', min: 0, max: 1000 },
  holdDuration: { type: 'string', max: 120 },
  restDuration: { type: 'string', max: 120 },
  frequency: { type: 'string', max: 200 },
  requiredEquipment: { type: 'array' },
  safetyInstructions: { type: 'string', max: 5000 },
  commonMistakes: { type: 'string', max: 5000 },
  painCategory: { type: 'objectId' },
  language: { type: 'enum', values: ['en', 'hi'] },
  displayOrder: { type: 'number', min: 0, max: 100000 },
};

router.get('/', getExercises);
router.post('/', authorize('admin'), validateSchema({ body: { ...exerciseBodySchema, name: { ...exerciseBodySchema.name, required: true } } }), createExercise);
router.get('/:id', validateSchema({ params: { id: { type: 'objectId', required: true } } }), getExerciseById);
router.put('/:id', authorize('admin'), validateSchema({ params: { id: { type: 'objectId', required: true } }, body: exerciseBodySchema }), updateExercise);
router.post(
  '/:id/:action(deactivate|reactivate)',
  authorize('admin'),
  validateSchema({ params: { id: { type: 'objectId', required: true } }, body: { reason: { type: 'string', max: 500, required: true } } }),
  setExerciseStatus
);
// Kept for older clients; admin UI uses the explicit lifecycle route above.
router.delete('/:id', authorize('admin'), validateSchema({ params: { id: { type: 'objectId', required: true } } }), deleteExercise);

module.exports = router;
