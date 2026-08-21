const AssessmentQuestion = require('../../models/AssessmentQuestion.model');
const PainCategory = require('../../models/PainCategory.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number', 'text', 'date', 'image'];
const RULE_OPERATORS = ['any_answer', 'equals', 'not_equals', 'includes', 'gte', 'lte', 'between'];

const normalizePayload = (body = {}) => {
  const payload = {};
  const stringFields = ['questionText', 'questionTextHindi', 'redFlagSafetyMessage', 'showIfAnswer'];
  stringFields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = String(body[field] ?? '').trim();
  });

  if (body.questionType !== undefined) payload.questionType = body.questionType;
  if (body.painCategory !== undefined) payload.painCategory = body.painCategory || null;
  if (body.isRedFlag !== undefined) payload.isRedFlag = Boolean(body.isRedFlag);
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  if (body.redFlagOperator !== undefined) payload.redFlagOperator = body.redFlagOperator;
  if (body.displayOrder !== undefined && body.displayOrder !== '') payload.displayOrder = Number(body.displayOrder);
  if (body.redFlagMinValue !== undefined && body.redFlagMinValue !== '') payload.redFlagMinValue = Number(body.redFlagMinValue);
  if (body.redFlagMaxValue !== undefined && body.redFlagMaxValue !== '') payload.redFlagMaxValue = Number(body.redFlagMaxValue);
  if (Array.isArray(body.options)) payload.options = body.options;
  if (Array.isArray(body.redFlagAnswerValues)) payload.redFlagAnswerValues = body.redFlagAnswerValues;
  if (body.showIfQuestion !== undefined) payload.showIfQuestion = body.showIfQuestion || null;
  if (body.conditionalLogic !== undefined) payload.conditionalLogic = body.conditionalLogic || undefined;
  return payload;
};

const validatePayload = async (payload, { partial = false } = {}) => {
  if (!partial && !payload.questionText) return 'Question text is required';
  if (payload.questionText !== undefined && !payload.questionText) return 'Question text is required';
  if (!partial && !payload.questionType) return 'Question type is required';
  if (payload.questionType !== undefined && !QUESTION_TYPES.includes(payload.questionType)) return 'Invalid question type';
  if (payload.redFlagOperator !== undefined && !RULE_OPERATORS.includes(payload.redFlagOperator)) return 'Invalid red flag operator';
  if (payload.displayOrder !== undefined && (!Number.isFinite(payload.displayOrder) || payload.displayOrder < 0)) return 'Display order must be zero or greater';
  if (payload.redFlagOperator === 'between' && payload.redFlagMinValue !== undefined && payload.redFlagMaxValue !== undefined && payload.redFlagMinValue > payload.redFlagMaxValue) return 'Red flag minimum cannot exceed maximum';
  if (payload.painCategory && !(await PainCategory.exists({ _id: payload.painCategory, isActive: true }))) return 'Pain category not found or inactive';
  if (payload.showIfQuestion && !(await AssessmentQuestion.exists({ _id: payload.showIfQuestion, isActive: true }))) return 'Conditional parent question not found or inactive';
  return null;
};

const getAssessmentQuestions = asyncHandler(async (req, res) => {
  const { search, questionType, categoryId, redFlag, status } = req.query;
  const filter = { ...buildSearchFilter(search, ['questionText', 'questionTextHindi', 'redFlagSafetyMessage']) };
  if (questionType) filter.questionType = questionType;
  if (categoryId) filter.painCategory = categoryId;
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
      { path: 'painCategory', select: 'name nameHindi isActive' },
      { path: 'showIfQuestion', select: 'questionText questionType isActive' },
      { path: 'conditionalLogic.dependsOnQuestion', select: 'questionText questionType isActive' },
    ],
  });

  const [total, active, inactive, redFlags, conditional, categories] = await Promise.all([
    AssessmentQuestion.countDocuments(),
    AssessmentQuestion.countDocuments({ isActive: true }),
    AssessmentQuestion.countDocuments({ isActive: false }),
    AssessmentQuestion.countDocuments({ isActive: true, isRedFlag: true }),
    AssessmentQuestion.countDocuments({ isActive: true, $or: [{ showIfQuestion: { $ne: null } }, { 'conditionalLogic.dependsOnQuestion': { $ne: null } }] }),
    PainCategory.countDocuments({ isActive: true }),
  ]);

  res.json({ ...result, summary: { total, active, inactive, redFlags, conditional, categories } });
});

const getAssessmentQuestionById = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findById(req.params.id)
    .populate('painCategory', 'name nameHindi description isActive')
    .populate('showIfQuestion', 'questionText questionType isActive')
    .populate('conditionalLogic.dependsOnQuestion', 'questionText questionType isActive')
    .lean();
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  res.json(question);
});

const createAssessmentQuestion = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
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
  await writeAuditLog({ req, action: 'assessment_question_updated', module: 'AssessmentQuestion', recordId: question._id, previousValue, newValue: payload });
  res.json(question);
});

const deactivateAssessmentQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
  const previousValue = { isActive: question.isActive };
  question.isActive = false;
  await question.save();
  await writeAuditLog({ req, action: 'assessment_question_deactivated', module: 'AssessmentQuestion', recordId: question._id, previousValue, newValue: { isActive: false }, reason: req.body.reason });
  res.json({ message: 'Assessment question deactivated', question });
});

const reactivateAssessmentQuestion = asyncHandler(async (req, res) => {
  const question = await AssessmentQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Assessment question not found' });
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
