const AssessmentQuestion = require('../../models/AssessmentQuestion.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number', 'text', 'date', 'image'];
const CHOICE_TYPES = ['single_choice', 'multiple_choice'];
const RED_FLAG_TYPES = ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number'];
const RULE_OPERATORS = ['any_answer', 'equals', 'not_equals', 'includes', 'gte', 'lte', 'between'];

const cleanOption = (option = {}, index = 0) => {
  const label = String(option.label ?? '').trim();
  const labelHindi = String(option.labelHindi ?? '').trim();
  const fallbackValue = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `option_${index + 1}`;
  const value = String(option.value ?? fallbackValue).trim();
  return { label, labelHindi, value };
};

const normalizePayload = (body = {}) => {
  const payload = {};
  const stringFields = ['questionText', 'questionTextHindi', 'redFlagSafetyMessage', 'showIfAnswer'];
  stringFields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = String(body[field] ?? '').trim();
  });

  if (body.questionType !== undefined) payload.questionType = body.questionType;
  if (body.isRedFlag !== undefined) payload.isRedFlag = Boolean(body.isRedFlag);
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  if (body.redFlagOperator !== undefined) payload.redFlagOperator = body.redFlagOperator;
  if (body.displayOrder !== undefined && body.displayOrder !== '') payload.displayOrder = Number(body.displayOrder);
  if (body.redFlagMinValue !== undefined && body.redFlagMinValue !== '') payload.redFlagMinValue = Number(body.redFlagMinValue);
  if (body.redFlagMaxValue !== undefined && body.redFlagMaxValue !== '') payload.redFlagMaxValue = Number(body.redFlagMaxValue);
  if (Array.isArray(body.options)) payload.options = body.options.map(cleanOption);
  if (Array.isArray(body.redFlagAnswerValues)) payload.redFlagAnswerValues = body.redFlagAnswerValues;
  if (body.showIfQuestion !== undefined) payload.showIfQuestion = body.showIfQuestion || null;
  if (body.conditionalLogic !== undefined) payload.conditionalLogic = body.conditionalLogic || undefined;
  return payload;
};

const validateOptions = (payload, { partial = false } = {}) => {
  if (!payload.questionType) return null;
  if (!CHOICE_TYPES.includes(payload.questionType)) return null;
  if (partial && payload.options === undefined) return null;

  if (!Array.isArray(payload.options) || payload.options.length < 2) return 'Single and multiple choice questions require at least two answer options';
  if (payload.options.some((option) => !option.label || !option.value)) return 'Every answer option requires an English label';

  const values = payload.options.map((option) => String(option.value).trim().toLowerCase());
  if (new Set(values).size !== values.length) return 'Answer option values must be unique';
  return null;
};

const validateRedFlag = (payload, { partial = false } = {}) => {
  if (!payload.isRedFlag) return null;
  if (!payload.questionType && partial) return null;
  if (!RED_FLAG_TYPES.includes(payload.questionType)) return 'Red flags can only be configured for structured answer types';
  if (!partial && (!payload.redFlagOperator || payload.redFlagOperator === 'any_answer')) return 'Choose an explicit red-flag trigger instead of any answer';
  if (!partial && !payload.redFlagSafetyMessage) return 'Safety message is required for a red-flag question';

  const operator = payload.redFlagOperator;
  const values = Array.isArray(payload.redFlagAnswerValues) ? payload.redFlagAnswerValues : [];

  if (['equals', 'not_equals', 'includes'].includes(operator) && !values.length) return 'Select the answer that should trigger the red flag';
  if (operator === 'gte' && !Number.isFinite(payload.redFlagMinValue)) return 'Red flag minimum value is required';
  if (operator === 'lte' && !Number.isFinite(payload.redFlagMaxValue)) return 'Red flag maximum value is required';
  if (operator === 'between') {
    if (!Number.isFinite(payload.redFlagMinValue) || !Number.isFinite(payload.redFlagMaxValue)) return 'Red flag minimum and maximum values are required';
    if (payload.redFlagMinValue > payload.redFlagMaxValue) return 'Red flag minimum cannot exceed maximum';
  }
  if (payload.questionType === 'pain_scale') {
    if (payload.redFlagMinValue !== undefined && (payload.redFlagMinValue < 0 || payload.redFlagMinValue > 10)) return 'Pain-scale red flag minimum must be between 0 and 10';
    if (payload.redFlagMaxValue !== undefined && (payload.redFlagMaxValue < 0 || payload.redFlagMaxValue > 10)) return 'Pain-scale red flag maximum must be between 0 and 10';
  }
  return null;
};

const validatePayload = async (payload, { partial = false } = {}) => {
  if (!partial && !payload.questionText) return 'Question text is required';
  if (payload.questionText !== undefined && !payload.questionText) return 'Question text is required';
  if (!partial && !payload.questionType) return 'Question type is required';
  if (payload.questionType !== undefined && !QUESTION_TYPES.includes(payload.questionType)) return 'Invalid question type';
  if (payload.redFlagOperator !== undefined && !RULE_OPERATORS.includes(payload.redFlagOperator)) return 'Invalid red flag operator';
  if (payload.displayOrder !== undefined && (!Number.isFinite(payload.displayOrder) || payload.displayOrder < 0)) return 'Display order must be zero or greater';

  const optionError = validateOptions(payload, { partial });
  if (optionError) return optionError;
  const redFlagError = validateRedFlag(payload, { partial });
  if (redFlagError) return redFlagError;

  if (payload.redFlagOperator === 'between' && payload.redFlagMinValue !== undefined && payload.redFlagMaxValue !== undefined && payload.redFlagMinValue > payload.redFlagMaxValue) return 'Red flag minimum cannot exceed maximum';
  if (payload.showIfQuestion && !(await AssessmentQuestion.exists({ _id: payload.showIfQuestion, isActive: true }))) return 'Conditional parent question not found or inactive';
  return null;
};

const applyCreateDefaults = async (payload) => {
  if (payload.questionType === 'yes_no' && (!Array.isArray(payload.options) || !payload.options.length)) {
    payload.options = [
      { label: 'Yes', labelHindi: 'हाँ', value: 'yes' },
      { label: 'No', labelHindi: 'नहीं', value: 'no' },
    ];
  }

  if (payload.displayOrder === undefined) {
    const lastQuestion = await AssessmentQuestion.findOne().sort({ displayOrder: -1, createdAt: -1 }).select('displayOrder').lean();
    const currentMax = Number(lastQuestion?.displayOrder || 0);
    payload.displayOrder = Math.max(10, Math.ceil(currentMax / 10) * 10 + 10);
  }
};

const getAssessmentQuestions = asyncHandler(async (req, res) => {
  const { search, questionType, redFlag, status } = req.query;
  const filter = { ...buildSearchFilter(search, ['questionText', 'questionTextHindi', 'redFlagSafetyMessage']) };
  if (questionType) filter.questionType = questionType;
  if (redFlag === 'true') filter.isRedFlag = true;
  if (redFlag === 'false') filter.isRedFlag = false;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const result = await paginateModel({
    model: AssessmentQuestion,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['displayOrder', 'createdAt', 'questionText', 'questionType']),
    populate: [
      { path: 'showIfQuestion', select: 'questionText questionType isActive' },
      { path: 'conditionalLogic.dependsOnQuestion', select: 'questionText questionType isActive' },
    ],
  });

  const [total, active, inactive, redFlags, conditional] = await Promise.all([
    AssessmentQuestion.countDocuments(),
    AssessmentQuestion.countDocuments({ isActive: true }),
    AssessmentQuestion.countDocuments({ isActive: false }),
    AssessmentQuestion.countDocuments({ isActive: true, isRedFlag: true }),
    AssessmentQuestion.countDocuments({ isActive: true, $or: [{ showIfQuestion: { $ne: null } }, { 'conditionalLogic.dependsOnQuestion': { $ne: null } }] }),
  ]);

  res.json({ ...result, summary: { total, active, inactive, redFlags, conditional } });
});

const getAssessmentQuestionById = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findById(req.params.id)
    .populate('showIfQuestion', 'questionText questionType isActive')
    .populate('conditionalLogic.dependsOnQuestion', 'questionText questionType isActive')
    .lean();
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  res.json(question);
});

const createAssessmentQuestion = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  await applyCreateDefaults(payload);
  const error = await validatePayload(payload);
  if (error) return res.status(400).json({ message: error });
  const question = await AssessmentQuestion.create(payload);
  await writeAuditLog({ req, action: 'assessment_question_created', module: 'AssessmentQuestion', recordId: question._id, newValue: question });
  res.status(201).json(question);
});

const updateAssessmentQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  const payload = normalizePayload(req.body);
  const error = await validatePayload(payload, { partial: true });
  if (error) return res.status(400).json({ message: error });
  if (payload.showIfQuestion && String(payload.showIfQuestion) === String(question._id)) return res.status(400).json({ message: 'A question cannot depend on itself' });

  const previousValue = question.toObject();
  Object.assign(question, payload);
  await question.save();
  await writeAuditLog({ req, action: 'assessment_question_updated', module: 'AssessmentQuestion', recordId: question._id, previousValue, newValue: question });
  res.json(question);
});

const deactivateAssessmentQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  if (!question.isActive) return res.status(409).json({ message: 'Assessment question is already inactive' });
  const previousValue = { isActive: question.isActive };
  question.isActive = false;
  await question.save();
  await writeAuditLog({ req, action: 'assessment_question_deactivated', module: 'AssessmentQuestion', recordId: question._id, previousValue, newValue: { isActive: false }, reason: req.body.reason });
  res.json({ message: 'Assessment question deactivated', question });
});

const reactivateAssessmentQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  if (question.isActive) return res.status(409).json({ message: 'Assessment question is already active' });
  const previousValue = { isActive: question.isActive };
  question.isActive = true;
  await question.save();
  await writeAuditLog({ req, action: 'assessment_question_reactivated', module: 'AssessmentQuestion', recordId: question._id, previousValue, newValue: { isActive: true }, reason: req.body.reason });
  res.json({ message: 'Assessment question reactivated', question });
});

module.exports = {
  getAssessmentQuestions,
  getAssessmentQuestionById,
  createAssessmentQuestion,
  updateAssessmentQuestion,
  deactivateAssessmentQuestion,
  reactivateAssessmentQuestion,
};
