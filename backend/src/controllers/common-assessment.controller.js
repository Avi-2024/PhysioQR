const mongoose = require('mongoose');
const PainCategory = require('../models/PainCategory.model');
const CaseType = require('../models/CaseType.model');
const SurgeryType = require('../models/SurgeryType.model');
const AssessmentQuestion = require('../models/AssessmentQuestion.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const notificationService = require('../services/notification.service');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_SIDES = ['right', 'left', 'both', 'not_applicable'];

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

const questionScopeFilter = ({ caseTypeId, bodyRegionId, surgeryTypeId }) => {
  const scopes = [
    { scopeType: 'common' },
    { scopeType: { $exists: false } },
  ];
  if (caseTypeId) scopes.push({ scopeType: 'case_type', caseType: caseTypeId });
  if (bodyRegionId) scopes.push({ scopeType: 'body_region', bodyRegion: bodyRegionId });
  if (surgeryTypeId) scopes.push({ scopeType: 'surgery_type', surgeryType: surgeryTypeId });
  return { isActive: true, $or: scopes };
};

const loadPathwayContext = async ({ caseTypeId, bodyRegionId, surgeryTypeId, surgeryDate, side }, { requireCaseType = true } = {}) => {
  if (requireCaseType && !caseTypeId) return { error: 'Select what brings you to physiotherapy' };
  const caseType = caseTypeId
    ? await CaseType.findOne({ _id: caseTypeId, isActive: true }).lean()
    : null;
  if (caseTypeId && !caseType) return { error: 'Selected case type is invalid or inactive' };

  const bodyRegion = bodyRegionId
    ? await PainCategory.findOne({ _id: bodyRegionId, isActive: true }).select('_id name').lean()
    : null;
  if (bodyRegionId && !bodyRegion) return { error: 'Selected body region is invalid or inactive' };

  let surgeryType = null;
  let parsedSurgeryDate;
  if (caseType?.requiresSurgeryDetails) {
    if (!bodyRegion) return { error: 'Select the operated body region' };
    if (!surgeryTypeId) return { error: 'Select the surgery type' };
    surgeryType = await SurgeryType.findOne({ _id: surgeryTypeId, bodyRegion: bodyRegion._id, isActive: true }).lean();
    if (!surgeryType) return { error: 'Selected surgery type is invalid for this body region' };
    if (!surgeryDate) return { error: 'Surgery date is required' };
    parsedSurgeryDate = new Date(surgeryDate);
    if (Number.isNaN(parsedSurgeryDate.getTime())) return { error: 'Enter a valid surgery date' };
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (parsedSurgeryDate > today) return { error: 'Surgery date cannot be in the future' };
  }

  const normalizedSide = side ? String(side).trim().toLowerCase() : undefined;
  if (normalizedSide && !ALLOWED_SIDES.includes(normalizedSide)) return { error: 'Invalid side selection' };

  return { caseType, bodyRegion, surgeryType, surgeryDate: parsedSurgeryDate, side: normalizedSide };
};

const notifyAssessmentReview = async (assessment, hasRedFlag) => {
  await notificationService.createNotification({
    recipientType: 'admin',
    type: hasRedFlag ? 'high_risk_assessment' : 'clinical_review_required',
    channel: 'in_app',
    title: hasRedFlag ? 'High-risk assessment requires review' : 'Clinical assessment requires physiotherapy review',
    message: `Assessment ${assessment._id} is pending clinical review.`,
    metadata: { assessmentId: assessment._id, reviewType: assessment.reviewType },
  });
};

// GET /api/assessments/questions
// Returns common questions plus the selected case/body-region/surgery layers.
const getCommonQuestions = asyncHandler(async (req, res) => {
  const { caseTypeId, bodyRegionId, surgeryTypeId } = req.query;
  let resolvedCaseTypeId = caseTypeId;

  // Current patient UI already tells this endpoint whether a surgery type was
  // selected. Keep that flow backward-compatible while caseTypeId is rolled out
  // explicitly to every client: surgery => post-op path, otherwise => MSK path.
  if (!resolvedCaseTypeId) {
    const inferredCaseType = await CaseType.findOne({
      isActive: true,
      requiresSurgeryDetails: Boolean(surgeryTypeId),
    }).sort({ displayOrder: 1, createdAt: 1 }).select('_id').lean();
    resolvedCaseTypeId = inferredCaseType?._id;
  }

  const questions = await AssessmentQuestion.find(questionScopeFilter({
    caseTypeId: resolvedCaseTypeId,
    bodyRegionId,
    surgeryTypeId,
  }))
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  res.json(questions);
});

const submitCommonAssessment = asyncHandler(async (req, res) => {
  const {
    patientId,
    caseTypeId,
    painCategoryId,
    surgeryTypeId,
    surgeryDate,
    side,
    answers,
  } = req.body;

  if (req.user.role === 'patient' && req.user._id.toString() !== patientId) {
    return res.status(403).json({ message: 'Cannot submit assessment for another patient' });
  }
  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: 'answers must be a non-empty array' });
  }

  const context = await loadPathwayContext({
    caseTypeId,
    bodyRegionId: painCategoryId,
    surgeryTypeId,
    surgeryDate,
    side,
  });
  if (context.error) return res.status(400).json({ message: context.error });
  if (!context.bodyRegion) return res.status(400).json({ message: 'Select a valid active body region' });

  const answerMap = new Map(answers.map((answer) => [answer.question?.toString(), answer]));
  const questions = await AssessmentQuestion.find(questionScopeFilter({
    caseTypeId: context.caseType._id,
    bodyRegionId: context.bodyRegion._id,
    surgeryTypeId: context.surgeryType?._id,
  })).sort({ displayOrder: 1, createdAt: 1 });

  // Reject only answers that do not belong to the selected active pathway at all.
  // A same-pathway conditional question may have been answered before its parent
  // answer changed; those now-hidden answers are safely discarded below instead
  // of failing the whole assessment submission.
  const scopedQuestionIds = new Set(questions.map((question) => question._id.toString()));
  const unrelatedAnswer = answers.find((answer) => !scopedQuestionIds.has(answer.question?.toString()));
  if (unrelatedAnswer) {
    return res.status(400).json({
      message: 'Submitted answer contains an inactive or unrelated pathway question',
      question: unrelatedAnswer.question,
    });
  }

  const visibleQuestions = questions.filter((question) => isQuestionVisible(question, answerMap));
  const visibleQuestionIds = new Set(visibleQuestions.map((question) => question._id.toString()));
  const sanitizedAnswers = answers.filter((answer) => visibleQuestionIds.has(answer.question?.toString()));
  const sanitizedAnswerMap = new Map(sanitizedAnswers.map((answer) => [answer.question?.toString(), answer]));

  if (!sanitizedAnswers.length) {
    return res.status(400).json({ message: 'Please answer at least one visible assessment question' });
  }

  const redFlagDetails = getRedFlagDetails(visibleQuestions, sanitizedAnswerMap);
  const hasRedFlag = redFlagDetails.length > 0;
  const requiresPhysioReview = Boolean(context.caseType?.requiresPhysioReview || context.surgeryType?.requiresPhysioReview);
  const reviewRequired = hasRedFlag || requiresPhysioReview;
  const postOpDayAtAssessment = context.surgeryDate
    ? Math.max(0, Math.floor((Date.now() - context.surgeryDate.getTime()) / DAY_MS))
    : undefined;

  const assessment = await PatientAssessment.create({
    patient: patientId,
    caseType: context.caseType._id,
    painCategory: context.bodyRegion._id,
    surgeryType: context.surgeryType?._id,
    surgeryDate: context.surgeryDate,
    side: context.side,
    postOpDayAtAssessment,
    requiresPhysioReview,
    reviewType: hasRedFlag ? 'red_flag' : requiresPhysioReview ? 'physio_review' : undefined,
    answers: sanitizedAnswers,
    hasRedFlag,
    redFlagDetails,
    status: reviewRequired ? 'pending_review' : 'cleared',
  });

  if (reviewRequired) {
    await notifyAssessmentReview(assessment, hasRedFlag);
    await writeAuditLog({
      req,
      action: hasRedFlag ? 'high_risk_assessment_submitted' : 'physio_review_assessment_submitted',
      module: 'PatientAssessment',
      recordId: assessment._id,
      newValue: {
        patientId,
        caseTypeId: context.caseType._id,
        painCategoryId: context.bodyRegion._id,
        surgeryTypeId: context.surgeryType?._id,
        reviewType: assessment.reviewType,
        redFlagDetails,
      },
    });
  }

  res.status(201).json({
    assessment,
    caseType: context.caseType,
    painCategory: context.bodyRegion,
    surgeryType: context.surgeryType,
    hasRedFlag,
    requiresPhysioReview,
    reviewRequired,
    redFlagDetails,
    postOpDay: postOpDayAtAssessment,
    postOpWeek: postOpDayAtAssessment === undefined ? undefined : Math.floor(postOpDayAtAssessment / 7) + 1,
  });
});

module.exports = { getCommonQuestions, submitCommonAssessment };
