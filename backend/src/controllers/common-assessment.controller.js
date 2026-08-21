const mongoose = require('mongoose');
const PainCategory = require('../models/PainCategory.model');
const AssessmentQuestion = require('../models/AssessmentQuestion.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const notificationService = require('../services/notification.service');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const toComparable = (value) => {
  if (value === undefined || value === null) return '';
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim().toLowerCase();
};

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

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

  if (operator === 'includes') return normalizedAnswers.some((answer) => normalizedAllowed.includes(answer));
  if (operator === 'not_equals') return normalizedAnswers.every((answer) => !normalizedAllowed.includes(answer));
  if (operator === 'gte' || operator === 'lte' || operator === 'between') {
    const numericAnswer = toNumber(answerValue);
    if (numericAnswer === null) return false;
    if (operator === 'gte') return numericAnswer >= Number(minValue ?? value);
    if (operator === 'lte') return numericAnswer <= Number(maxValue ?? value);
    return numericAnswer >= Number(minValue) && numericAnswer <= Number(maxValue);
  }
  return normalizedAnswers.some((answer) => normalizedAllowed.includes(answer));
};

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

const getRedFlagDetails = (visibleQuestions, answerMap) => visibleQuestions.reduce((details, question) => {
  if (!question.isRedFlag) return details;
  const submittedAnswer = answerMap.get(question._id.toString());
  if (!submittedAnswer) return details;

  const configuredValues = question.redFlagAnswerValues || [];
  const matched = question.redFlagOperator === 'any_answer' && !configuredValues.length
    ? true
    : answerMatchesRule(submittedAnswer.answer, {
      operator: question.redFlagOperator,
      values: configuredValues,
      minValue: question.redFlagMinValue,
      maxValue: question.redFlagMaxValue,
    });

  if (matched) {
    details.push({
      question: question._id,
      questionText: question.questionText,
      answer: submittedAnswer.answer,
      reason: question.redFlagOperator || 'any_answer',
      safetyMessage: question.redFlagSafetyMessage,
    });
  }
  return details;
}, []);

const notifyHighRiskAssessment = async (assessment) => {
  await notificationService.createNotification({
    recipientType: 'admin',
    type: 'high_risk_assessment',
    channel: 'in_app',
    title: 'High-risk assessment requires review',
    message: `Assessment ${assessment._id} is pending clinical safety review.`,
  });
};

// The assessment is intentionally common. Pain category is selected inside the
// assessment UI and is stored as assessment context, but it does not select a
// different question set.
const getCommonQuestions = asyncHandler(async (req, res) => {
  const questions = await AssessmentQuestion.find({ isActive: true })
    .select('-painCategory')
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  res.json(questions);
});

const submitCommonAssessment = asyncHandler(async (req, res) => {
  const { patientId, painCategoryId, answers } = req.body;

  if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
    return res.status(403).json({ message: 'Cannot submit assessment for another patient' });
  }
  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: 'answers must be a non-empty array' });
  }

  const painCategory = await PainCategory.findOne({ _id: painCategoryId, isActive: true }).select('_id name').lean();
  if (!painCategory) return res.status(400).json({ message: 'Select a valid active pain category' });

  const answerMap = new Map(answers.map((answer) => [answer.question?.toString(), answer]));
  const questions = await AssessmentQuestion.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
  const visibleQuestions = questions.filter((question) => isQuestionVisible(question, answerMap));
  const visibleQuestionIds = new Set(visibleQuestions.map((question) => question._id.toString()));
  const invalidAnswer = answers.find((answer) => !visibleQuestionIds.has(answer.question?.toString()));
  if (invalidAnswer) {
    return res.status(400).json({
      message: 'Submitted answer contains an inactive or hidden question',
      question: invalidAnswer.question,
    });
  }

  const redFlagDetails = getRedFlagDetails(visibleQuestions, answerMap);
  const hasRedFlag = redFlagDetails.length > 0;
  const assessment = await PatientAssessment.create({
    patient: patientId,
    painCategory: painCategory._id,
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
      newValue: { patientId, painCategoryId: painCategory._id, redFlagDetails },
    });
  }

  res.status(201).json({
    assessment,
    painCategory,
    hasRedFlag,
    redFlagDetails,
  });
});

module.exports = { getCommonQuestions, submitCommonAssessment };
