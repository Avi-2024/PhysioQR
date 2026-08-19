const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
const {
  getExercises,
  createExercise,
  getExerciseById,
  updateExercise,
  deleteExercise,
} = require('../controllers/exercise.controller');

router.use(protect);

router.get('/', getExercises);
router.post(
  '/',
  authorize('admin'),
  validateSchema({
    body: {
      name: { type: 'string', min: 2, max: 150, required: true },
      description: { type: 'string', max: 2000 },
      videoUrl: { type: 'youtubeUrl' },
      sets: { type: 'number', min: 0, max: 100 },
      repetitions: { type: 'number', min: 0, max: 1000 },
      painCategory: { type: 'objectId' },
      language: { type: 'string', min: 2, max: 20 },
    },
  }),
  createExercise
);
router.get('/:id', validateSchema({ params: { id: { type: 'objectId', required: true } } }), getExerciseById);
router.put('/:id', authorize('admin'), validateSchema({
  params: { id: { type: 'objectId', required: true } },
  body: {
    name: { type: 'string', min: 2, max: 150 },
    description: { type: 'string', max: 2000 },
    videoUrl: { type: 'youtubeUrl' },
    sets: { type: 'number', min: 0, max: 100 },
    repetitions: { type: 'number', min: 0, max: 1000 },
    painCategory: { type: 'objectId' },
    language: { type: 'string', min: 2, max: 20 },
  },
}), updateExercise);
router.delete('/:id', authorize('admin'), validateSchema({ params: { id: { type: 'objectId', required: true } } }), deleteExercise);

module.exports = router;
