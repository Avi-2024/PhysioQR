const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields, validateEnum } = require('../middlewares/validate.middleware');
const {
  getPainCategories,
  createPainCategory,
  updatePainCategory,
  deletePainCategory,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitAssessment,
  listRedFlagAssessments,
  reviewAssessment,
} = require('../controllers/assessment.controller');

router.get('/categories', getPainCategories);
router.post('/categories', protect, authorize('admin'), requireFields('name'), createPainCategory);
router.put('/categories/:id', protect, authorize('admin'), updatePainCategory);
router.delete('/categories/:id', protect, authorize('admin'), deletePainCategory);

router.get('/questions', getQuestions);
router.post(
  '/questions',
  protect,
  authorize('admin'),
  requireFields('questionText', 'questionType'),
  validateEnum('questionType', ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number', 'text', 'date', 'image']),
  createQuestion
);
router.put('/questions/:id', protect, authorize('admin'), updateQuestion);
router.delete('/questions/:id', protect, authorize('admin'), deleteQuestion);

router.post('/submit', protect, requireFields('patientId', 'painCategoryId', 'answers'), submitAssessment);
router.get('/red-flags', protect, authorize('admin'), listRedFlagAssessments);
router.patch(
  '/:id/review',
  protect,
  authorize('admin'),
  requireFields('status'),
  validateEnum('status', ['cleared', 'blocked']),
  reviewAssessment
);

module.exports = router;
