const mongoose = require('mongoose');
const PainCategory = require('../models/PainCategory.model');
const AssessmentQuestion = require('../models/AssessmentQuestion.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const notificationService = require('../services/notification.service');
const { writeAuditLog } = require('../utils/auditLogger');
const { buildSort, paginateModel } = require('../utils/queryHelpers');
const asyncHandler = require('../utils/asyncHandler');

// Converts an answer value into a stable comparable string.
const toComparable = (value) => {
  if (value === undefined || value === null) return '';
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim().toLowerCase();
};

// Converts a value into a number when numeric comparison is required.
const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

// Checks whether an answer satisfies an assessment rule.
const answerMatchesRule = (answerValue, {
  operator = 'equals',
  value,
  values = [],
  minValue,
  maxValue,
} = {}) => {
  const answerValues = Array.isArray(answerValue) ? answerValue : [answerValue];
  const normalizedAnswers = answerValues.map(toComparable);
  const allowedValues = values.length ? values : [value];
  const normalizedAllowed = allowedValues.map(toComparable);

  if (operator === 'includes') {
    return normalizedAnswers.some((answer) => normalizedAllowed.includes(answer));
  }
  if (operator === 'not_equals') {
    return normalizedAnswers.every((answer) => !normalizedAllowed.includes(answer));
  }
  if (operator === 'gte' || operator === 'lte' || operator === 'between') {
    const numericAnswer = toNumber(answerValue);
    if (numericAnswer === null) return false;
    if (operator === 'gte') return numericAnswer >= Number(minValue ?? value);
    if (operator === 'lte') return numericAnswer <= Number(maxValue ?? value);
    return numericAnswer >= Number(minValue) && numericAnswer <= Number(maxValue);
  }

  return normalizedAnswers.some((answer) => normalizedAllowed.includes(answer));
};

// Determines whether a conditional question should be included for submitted answers.
const isQuestionVisible = (question, answerMap) => {
  const logic = question.conditionalLogic || {};
  const dependsOnQuestion = logic.dependsOnQuestion || question.showIfQuestion;
  if (!dependsOnQuestion) return true;

  const priorAnswer = answerMap.get(dependsOnQuestion.toString());
  if (!priorAnswer) return false;

  return answerMatchesRule(priorAnswer.answer, {
    operator: logic.operator || 'equals',
    value: logic.value ?? question.showIfAnswer,
    values: logic.values || [],
    minValue: logic.minValue,
    maxValue: logic.maxValue,
  });
};

// Builds red-flag matches from visible submitted answers.
const getRedFlagDetails = (visibleQuestions, answerMap) => (
  visibleQuestions.reduce((details, question) => {
    if (!question.isRedFlag) return details;

    const submittedAnswer = answerMap.get(question._id.toString());
    if (!submittedAnswer) return details;

    const configuredValues = question.redFlagAnswerValues || [];
    const isRedFlag = question.redFlagOperator === 'any_answer' && !configuredValues.length
      ? true
      : answerMatchesRule(submittedAnswer.answer, {
        operator: question.redFlagOperator,
        values: configuredValues,
        minValue: question.redFlagMinValue,
        maxValue: question.redFlagMaxValue,
      });

    if (isRedFlag) {
      details.push({
        question: question._id,
        questionText: question.questionText,
        answer: submittedAnswer.answer,
        reason: question.redFlagOperator || 'any_answer',
        safetyMessage: question.redFlagSafetyMessage,
      });
    }

    return details;
  }, [])
);

// Sends an in-app notification for high-risk assessment review.
const notifyHighRiskAssessment = async (assessment) => {
  await notificationService.createNotification({
    recipientType: 'admin',
    type: 'high_risk_assessment',
    channel: 'in_app',
    title: 'High-risk assessment requires review',
    message: `Assessment ${assessment._id} is pending clinical safety review.`,
  });
};

// GET /api/assessments/categories
const getPainCategories = asyncHandler(async (req, res) => {
  res.json(await PainCategory.find({ isActive: true }).sort({ name: 1 }));
});

// POST /api/assessments/categories
const createPainCategory = asyncHandler(async (req, res) => {
  const category = await PainCategory.create(req.body);
  await writeAuditLog({
    req,
    action: 'pain_category_created',
    module: 'PainCategory',
    recordId: category._id,
    newValue: category,
  });
  res.status(201).json(category);
});

// PUT /api/assessments/categories/:id
const updatePainCategory = asyncHandler(async (req, res) => {
  const previous = await PainCategory.findById(req.params.id).lean();
  const category = await PainCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) return res.status(404).json({ message: 'Pain category not found' });
  await writeAuditLog({
    req,
    action: 'pain_category_updated',
    module: 'PainCategory',
    recordId: category._id,
    previousValue: previous,
    newValue: category,
  });
  res.json(category);
});

// DELETE /api/assessments/categories/:id
const deletePainCategory = asyncHandler(async (req, res) => {
  const category = await PainCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return res.status(404).json({ message: 'Pain category not found' });
  await writeAuditLog({
    req,
    action: 'pain_category_deactivated',
    module: 'PainCategory',
    recordId: category._id,
  });
  res.json({ message: 'Pain category deactivated' });
});

// GET /api/assessments/questions
const getQuestions = asyncHandler(async (req, res) => {
  const { categoryId } = req.query;
  const filter = { isActive: true };
  if (categoryId) {
    filter.$or = [
      { painCategory: categoryId },
      { painCategory: null },
      { painCategory: { $exists: false } },
    ];
  }
  res.json(await AssessmentQuestion.find(filter).sort({ displayOrder: 1 }));
});

// POST /api/assessments/questions
const createQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.create(req.body);
  await writeAuditLog({
    req,
    action: 'assessment_question_created',
    module: 'AssessmentQuestion',
    recordId: question._id,
    newValue: question,
  });
  res.status(201).json(question);
});

// PUT /api/assessments/questions/:id
const updateQuestion = asyncHandler(async (req, res) => {
  const previous = await AssessmentQuestion.findById(req.params.id).lean();
  const question = await AssessmentQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  await writeAuditLog({
    req,
    action: 'assessment_question_updated',
    module: 'AssessmentQuestion',
    recordId: question._id,
    previousValue: previous,
    newValue: question,
  });
  res.json(question);
});

// DELETE /api/assessments/questions/:id
const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  await writeAuditLog({
    req,
    action: 'assessment_question_deactivated',
    module: 'AssessmentQuestion',
    recordId: question._id,
  });
  res.json({ message: 'Assessment question deactivated' });
});

// POST /api/assessments/submit
const submitAssessment = asyncHandler(async (req, res) => {
  const { patientId, painCategoryId, answers } = req.body;

  if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
    return res.status(403).json({ message: 'Cannot submit assessment for another patient' });
  }
  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: 'answers must be a non-empty array' });
  }

  const answerMap = new Map(answers.map((answer) => [answer.question?.toString(), answer]));
  const questions = await AssessmentQuestion.find({
    isActive: true,
    $or: [
      { painCategory: painCategoryId },
      { painCategory: null },
      { painCategory: { $exists: false } },
    ],
  }).sort({ displayOrder: 1 });

  const visibleQuestions = questions.filter((question) => isQuestionVisible(question, answerMap));
  const visibleQuestionIds = new Set(visibleQuestions.map((question) => question._id.toString()));
  const invalidAnswer = answers.find((answer) => !visibleQuestionIds.has(answer.question?.toString()));
  if (invalidAnswer) {
    return res.status(400).json({ message: 'Submitted answer contains an inactive or hidden question', question: invalidAnswer.question });
  }

  const redFlagDetails = getRedFlagDetails(visibleQuestions, answerMap);
  const hasRedFlag = redFlagDetails.length > 0;
  const assessment = await PatientAssessment.create({
    patient: patientId,
    painCategory: painCategoryId,
    answers,
    hasRedFlag,
    redFlagDetails,
    status: hasRedFlag ? 'pending_review' : 'cleared',
  });

  if (hasRedFlag) {
    await notifyHighRiskAssessment(assessment);
    await writeAuditLog({
      req,
      action: 'high_risk_assessment_submitted',
      module: 'PatientAssessment',
      recordId: assessment._id,
      newValue: { patientId, painCategoryId, redFlagDetails },
    });
  }

  res.status(201).json({ assessment, hasRedFlag, redFlagDetails });
});

// GET /api/assessments/red-flags
const listRedFlagAssessments = asyncHandler(async (req, res) => {
  const filter = { hasRedFlag: true };
  if (req.query.status) filter.status = req.query.status;

  const result = await paginateModel({
    model: PatientAssessment,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'reviewedAt', 'status']),
    populate: [
      { path: 'patient', select: 'patientId fullName mobile status' },
      { path: 'painCategory', select: 'name' },
      { path: 'reviewedBy', select: 'email mobile role' },
    ],
  });

  res.json(result);
});

// PATCH /api/assessments/:id/review
const reviewAssessment = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!['cleared', 'blocked'].includes(status)) {
    return res.status(400).json({ message: 'status must be one of: cleared, blocked' });
  }

  const assessment = await PatientAssessment.findById(req.params.id);
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

  const previous = {
    status: assessment.status,
    adminReviewNote: assessment.adminReviewNote,
    reviewedBy: assessment.reviewedBy,
    reviewedAt: assessment.reviewedAt,
  };

  assessment.status = status;
  assessment.adminReviewNote = note;
  assessment.reviewedBy = req.user._id;
  assessment.reviewedAt = new Date();
  await assessment.save();

  await writeAuditLog({
    req,
    action: status === 'cleared' ? 'assessment_red_flag_cleared' : 'assessment_red_flag_blocked',
    module: 'PatientAssessment',
    recordId: assessment._id,
    previousValue: previous,
    newValue: {
      status: assessment.status,
      adminReviewNote: assessment.adminReviewNote,
      reviewedBy: assessment.reviewedBy,
      reviewedAt: assessment.reviewedAt,
    },
    reason: note,
  });

  res.json({ message: `Assessment ${status}`, assessment });
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
  listRedFlagAssessments,
  reviewAssessment,
};
