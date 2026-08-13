const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateNumberRange } = require('../middlewares/validate.middleware');
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
  requireFields('name'),
  validateNumberRange('sets', { min: 0 }),
  validateNumberRange('repetitions', { min: 0 }),
  createExercise
);
router.get('/:id', getExerciseById);
router.put('/:id', authorize('admin'), updateExercise);
router.delete('/:id', authorize('admin'), deleteExercise);

module.exports = router;
