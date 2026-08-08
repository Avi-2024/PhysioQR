const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const PainCategory = require('../models/PainCategory.model');
const AssessmentQuestion = require('../models/AssessmentQuestion.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const asyncHandler = require('../utils/asyncHandler');

// Pain Categories
router.get('/categories',       asyncHandler(async (req, res) => { res.json(await PainCategory.find({ isActive: true })); }));
router.post('/categories',      protect, authorize('admin'), asyncHandler(async (req, res) => { res.status(201).json(await PainCategory.create(req.body)); }));

// Assessment Questions
router.get('/questions',        asyncHandler(async (req, res) => {
  const { categoryId } = req.query;
  const filter = { isActive: true };
  if (categoryId) filter.painCategory = categoryId;
  res.json(await AssessmentQuestion.find(filter).sort({ displayOrder: 1 }));
}));
router.post('/questions',       protect, authorize('admin'), asyncHandler(async (req, res) => { res.status(201).json(await AssessmentQuestion.create(req.body)); }));

// Patient submits assessment
router.post('/submit',          protect, asyncHandler(async (req, res) => {
  const { patientId, painCategoryId, answers } = req.body;
  // Check for red flags
  const questions = await AssessmentQuestion.find({ _id: { $in: answers.map(a => a.question) }, isRedFlag: true });
  const hasRedFlag = questions.length > 0;
  const assessment = await PatientAssessment.create({
    patient: patientId,
    painCategory: painCategoryId,
    answers,
    hasRedFlag,
    status: hasRedFlag ? 'pending_review' : 'cleared',
  });
  res.status(201).json({ assessment, hasRedFlag });
}));

module.exports = router;
