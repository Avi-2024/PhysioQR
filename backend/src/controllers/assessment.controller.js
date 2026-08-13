const PainCategory = require('../models/PainCategory.model');
const AssessmentQuestion = require('../models/AssessmentQuestion.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const asyncHandler = require('../utils/asyncHandler');

const getPainCategories = asyncHandler(async (req, res) => {
  res.json(await PainCategory.find({ isActive: true }).sort({ name: 1 }));
});

const createPainCategory = asyncHandler(async (req, res) => {
  res.status(201).json(await PainCategory.create(req.body));
});

const updatePainCategory = asyncHandler(async (req, res) => {
  const category = await PainCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) return res.status(404).json({ message: 'Pain category not found' });
  res.json(category);
});

const deletePainCategory = asyncHandler(async (req, res) => {
  const category = await PainCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return res.status(404).json({ message: 'Pain category not found' });
  res.json({ message: 'Pain category deactivated' });
});

const getQuestions = asyncHandler(async (req, res) => {
  const { categoryId } = req.query;
  const filter = { isActive: true };
  if (categoryId) filter.painCategory = categoryId;
  res.json(await AssessmentQuestion.find(filter).sort({ displayOrder: 1 }));
});

const createQuestion = asyncHandler(async (req, res) => {
  res.status(201).json(await AssessmentQuestion.create(req.body));
});

const updateQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  res.json(question);
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  res.json({ message: 'Assessment question deactivated' });
});

const submitAssessment = asyncHandler(async (req, res) => {
  const { patientId, painCategoryId, answers } = req.body;

  if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
    return res.status(403).json({ message: 'Cannot submit assessment for another patient' });
  }
  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: 'answers must be a non-empty array' });
  }

  const questions = await AssessmentQuestion.find({
    _id: { $in: answers.map((answer) => answer.question) },
    isRedFlag: true,
  });

  const hasRedFlag = questions.length > 0;
  const assessment = await PatientAssessment.create({
    patient: patientId,
    painCategory: painCategoryId,
    answers,
    hasRedFlag,
    status: hasRedFlag ? 'pending_review' : 'cleared',
  });

  res.status(201).json({ assessment, hasRedFlag });
});

module.exports = {
  getPainCategories,
  createPainCategory,
  updatePainCategory,
  deletePainCategory,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitAssessment,
};
