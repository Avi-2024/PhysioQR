const CaseType = require('../../models/CaseType.model');
const SurgeryType = require('../../models/SurgeryType.model');
const PainCategory = require('../../models/PainCategory.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');

const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const asBoolean = (value, fallback = false) => value === undefined ? fallback : Boolean(value);

const getAssessmentPathways = asyncHandler(async (req, res) => {
  const [caseTypes, bodyRegions, surgeryTypes] = await Promise.all([
    CaseType.find().sort({ displayOrder: 1, name: 1 }).lean(),
    PainCategory.find().sort({ isActive: -1, name: 1 }).select('name nameHindi description isActive').lean(),
    SurgeryType.find().populate('bodyRegion', 'name isActive').sort({ displayOrder: 1, name: 1 }).lean(),
  ]);

  res.json({
    caseTypes,
    bodyRegions,
    surgeryTypes,
    summary: {
      activeCaseTypes: caseTypes.filter((item) => item.isActive).length,
      activeBodyRegions: bodyRegions.filter((item) => item.isActive).length,
      activeSurgeryTypes: surgeryTypes.filter((item) => item.isActive).length,
    },
  });
});

const createCaseType = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Case type name is required' });
  const code = slug(req.body.code || name);
  if (!code) return res.status(400).json({ message: 'Case type code is required' });
  if (await CaseType.exists({ $or: [{ code }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] })) {
    return res.status(409).json({ message: 'A case type with this name or code already exists' });
  }

  const caseType = await CaseType.create({
    code,
    name,
    nameHindi: String(req.body.nameHindi || '').trim(),
    description: String(req.body.description || '').trim(),
    requiresSurgeryDetails: asBoolean(req.body.requiresSurgeryDetails),
    requiresPhysioReview: asBoolean(req.body.requiresPhysioReview),
    displayOrder: Number(req.body.displayOrder || 0),
  });

  await writeAuditLog({ req, action: 'assessment_case_type_created', module: 'CaseType', recordId: caseType._id, newValue: caseType });
  res.status(201).json(caseType);
});

const updateCaseType = asyncHandler(async (req, res) => {
  const caseType = await CaseType.findById(req.params.id);
  if (!caseType) return res.status(404).json({ message: 'Case type not found' });
  const previousValue = caseType.toObject();

  if (req.body.name !== undefined) caseType.name = String(req.body.name || '').trim();
  if (!caseType.name) return res.status(400).json({ message: 'Case type name cannot be empty' });
  if (req.body.code !== undefined) caseType.code = slug(req.body.code);
  if (!caseType.code) return res.status(400).json({ message: 'Case type code cannot be empty' });
  if (req.body.nameHindi !== undefined) caseType.nameHindi = String(req.body.nameHindi || '').trim();
  if (req.body.description !== undefined) caseType.description = String(req.body.description || '').trim();
  if (req.body.requiresSurgeryDetails !== undefined) caseType.requiresSurgeryDetails = Boolean(req.body.requiresSurgeryDetails);
  if (req.body.requiresPhysioReview !== undefined) caseType.requiresPhysioReview = Boolean(req.body.requiresPhysioReview);
  if (req.body.displayOrder !== undefined) caseType.displayOrder = Number(req.body.displayOrder || 0);
  if (req.body.isActive !== undefined) caseType.isActive = Boolean(req.body.isActive);

  await caseType.save();
  await writeAuditLog({ req, action: 'assessment_case_type_updated', module: 'CaseType', recordId: caseType._id, previousValue, newValue: caseType });
  res.json(caseType);
});

const createSurgeryType = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const bodyRegion = String(req.body.bodyRegion || '').trim();
  if (!name || !bodyRegion) return res.status(400).json({ message: 'Surgery name and body region are required' });
  const region = await PainCategory.findOne({ _id: bodyRegion, isActive: true }).select('_id');
  if (!region) return res.status(400).json({ message: 'Select a valid active body region' });
  const code = slug(req.body.code || name);
  if (!code) return res.status(400).json({ message: 'Surgery type code is required' });
  if (await SurgeryType.exists({ code })) return res.status(409).json({ message: 'A surgery type with this code already exists' });

  const surgeryType = await SurgeryType.create({
    code,
    name,
    nameHindi: String(req.body.nameHindi || '').trim(),
    bodyRegion: region._id,
    description: String(req.body.description || '').trim(),
    requiresPhysioReview: req.body.requiresPhysioReview === undefined ? true : Boolean(req.body.requiresPhysioReview),
    displayOrder: Number(req.body.displayOrder || 0),
  });

  await writeAuditLog({ req, action: 'assessment_surgery_type_created', module: 'SurgeryType', recordId: surgeryType._id, newValue: surgeryType });
  res.status(201).json(await surgeryType.populate('bodyRegion', 'name isActive'));
});

const updateSurgeryType = asyncHandler(async (req, res) => {
  const surgeryType = await SurgeryType.findById(req.params.id);
  if (!surgeryType) return res.status(404).json({ message: 'Surgery type not found' });
  const previousValue = surgeryType.toObject();

  if (req.body.bodyRegion !== undefined) {
    const region = await PainCategory.findOne({ _id: req.body.bodyRegion, isActive: true }).select('_id');
    if (!region) return res.status(400).json({ message: 'Select a valid active body region' });
    surgeryType.bodyRegion = region._id;
  }
  if (req.body.name !== undefined) surgeryType.name = String(req.body.name || '').trim();
  if (!surgeryType.name) return res.status(400).json({ message: 'Surgery type name cannot be empty' });
  if (req.body.code !== undefined) surgeryType.code = slug(req.body.code);
  if (!surgeryType.code) return res.status(400).json({ message: 'Surgery type code cannot be empty' });
  if (req.body.nameHindi !== undefined) surgeryType.nameHindi = String(req.body.nameHindi || '').trim();
  if (req.body.description !== undefined) surgeryType.description = String(req.body.description || '').trim();
  if (req.body.requiresPhysioReview !== undefined) surgeryType.requiresPhysioReview = Boolean(req.body.requiresPhysioReview);
  if (req.body.displayOrder !== undefined) surgeryType.displayOrder = Number(req.body.displayOrder || 0);
  if (req.body.isActive !== undefined) surgeryType.isActive = Boolean(req.body.isActive);

  await surgeryType.save();
  await writeAuditLog({ req, action: 'assessment_surgery_type_updated', module: 'SurgeryType', recordId: surgeryType._id, previousValue, newValue: surgeryType });
  res.json(await surgeryType.populate('bodyRegion', 'name isActive'));
});

module.exports = {
  getAssessmentPathways,
  createCaseType,
  updateCaseType,
  createSurgeryType,
  updateSurgeryType,
};
