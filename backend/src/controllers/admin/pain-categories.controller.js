const PainCategory = require('../../models/PainCategory.model');
const PatientAssessment = require('../../models/PatientAssessment.model');
const Program = require('../../models/Program.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalize = (category, counts = {}) => ({
  ...category,
  id: category._id,
  linkedPrograms: counts.linkedPrograms || 0,
  activePrograms: counts.activePrograms || 0,
  assessmentUsage: counts.assessmentUsage || 0,
});

const getPainCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: regex }, { nameHindi: regex }, { description: regex }];
  }

  const [categories, total, all, active, inactive] = await Promise.all([
    PainCategory.find(filter).sort({ isActive: -1, name: 1 }).skip(skip).limit(limit).lean(),
    PainCategory.countDocuments(filter),
    PainCategory.countDocuments(),
    PainCategory.countDocuments({ isActive: true }),
    PainCategory.countDocuments({ isActive: false }),
  ]);

  const ids = categories.map((item) => item._id);
  const [programCounts, usageCounts] = await Promise.all([
    Program.aggregate([
      { $match: { painCategory: { $in: ids } } },
      { $group: { _id: '$painCategory', linkedPrograms: { $sum: 1 }, activePrograms: { $sum: { $cond: ['$isActive', 1, 0] } } } },
    ]),
    PatientAssessment.aggregate([
      { $match: { painCategory: { $in: ids } } },
      { $group: { _id: '$painCategory', assessmentUsage: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map();
  [...programCounts, ...usageCounts].forEach((row) => {
    const key = String(row._id);
    map.set(key, { ...(map.get(key) || {}), ...row });
  });

  res.json({
    items: categories.map((item) => normalize(item, map.get(String(item._id)))),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: { total: all, active, inactive },
  });
});

const getPainCategoryById = asyncHandler(async (req, res) => {
  const category = await PainCategory.findById(req.params.id).lean();
  if (!category) return res.status(404).json({ message: 'Pain category not found' });

  const [programs, assessmentUsage] = await Promise.all([
    Program.find({ painCategory: category._id })
      .select('programCode name nameHindi durationDays difficultyLevel defaultPrice isActive')
      .sort({ name: 1 })
      .lean(),
    PatientAssessment.countDocuments({ painCategory: category._id }),
  ]);

  res.json({
    ...normalize(category, {
      linkedPrograms: programs.length,
      activePrograms: programs.filter((item) => item.isActive).length,
      assessmentUsage,
    }),
    programs,
  });
});

const createPainCategory = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Category name is required' });
  const duplicate = await PainCategory.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (duplicate) return res.status(409).json({ message: 'A pain category with this name already exists' });

  const category = await PainCategory.create({
    name,
    nameHindi: String(req.body.nameHindi || '').trim(),
    description: String(req.body.description || '').trim(),
    isActive: true,
  });
  await writeAuditLog({ req, action: 'pain_category_created', module: 'PainCategory', recordId: category._id, newValue: category });
  res.status(201).json(category);
});

const updatePainCategory = asyncHandler(async (req, res) => {
  const category = await PainCategory.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Pain category not found' });
  const previousValue = category.toObject();

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ message: 'Category name cannot be empty' });
    const duplicate = await PainCategory.findOne({ _id: { $ne: category._id }, name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (duplicate) return res.status(409).json({ message: 'A pain category with this name already exists' });
    category.name = name;
  }
  if (req.body.nameHindi !== undefined) category.nameHindi = String(req.body.nameHindi || '').trim();
  if (req.body.description !== undefined) category.description = String(req.body.description || '').trim();
  await category.save();

  await writeAuditLog({ req, action: 'pain_category_updated', module: 'PainCategory', recordId: category._id, previousValue, newValue: category });
  res.json(category);
});

const setPainCategoryStatus = asyncHandler(async (req, res) => {
  const category = await PainCategory.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Pain category not found' });
  const isActive = req.params.action === 'reactivate';
  if (category.isActive === isActive) return res.status(409).json({ message: `Pain category is already ${isActive ? 'active' : 'inactive'}` });

  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ message: 'Reason is required' });
  const previousValue = { isActive: category.isActive };
  category.isActive = isActive;
  await category.save();

  await writeAuditLog({
    req,
    action: isActive ? 'pain_category_reactivated' : 'pain_category_deactivated',
    module: 'PainCategory',
    recordId: category._id,
    previousValue,
    newValue: { isActive },
    reason,
  });
  res.json(category);
});

module.exports = { getPainCategories, getPainCategoryById, createPainCategory, updatePainCategory, setPainCategoryStatus };
