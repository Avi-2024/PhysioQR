const CaseType = require('../../models/CaseType.model');
const SurgeryType = require('../../models/SurgeryType.model');
const PainCategory = require('../../models/PainCategory.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { getRegionVisibility, isSurgeryVisible } = require('../../services/assessmentVisibility.service');
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
    PainCategory.find().sort({ isActive: -1, name: 1 }).select('name nameHindi description isActive assessmentVisibility').lean(),
    SurgeryType.find().populate('bodyRegion', 'name isActive').sort({ displayOrder: 1, name: 1 }).lean(),
  ]);

  const publishedRegions = bodyRegions.map((region) => ({
    ...region, assessmentVisibility: getRegionVisibility(region),
  }));
  const publishedSurgeries = surgeryTypes.map((surgery) => ({
    ...surgery, assessmentPublished: isSurgeryVisible(surgery),
  }));
  res.json({
    caseTypes,
    bodyRegions: publishedRegions,
    surgeryTypes: publishedSurgeries,
    summary: {
      activeCaseTypes: caseTypes.filter((item) => item.isActive).length,
      activeBodyRegions: bodyRegions.filter((item) => item.isActive).length,
      activeSurgeryTypes: surgeryTypes.filter((item) => item.isActive).length,
      generalVisible: publishedRegions.filter((item) => item.isActive && item.assessmentVisibility.general).length,
      postOperativeVisible: publishedRegions.filter((item) => item.isActive && item.assessmentVisibility.postOperative).length,
      publishedSurgeries: publishedSurgeries.filter((item) => item.isActive && item.assessmentPublished).length,
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


const assertVisibilityRequest = (req, res) => {
  const { visible, reason } = req.body || {};
  if (typeof visible !== 'boolean') {
    res.status(400).json({ message: 'Visible must be true or false' });
    return false;
  }
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) {
    res.status(400).json({ message: 'Enter a short reason (5–500 characters) for this publication change' });
    return false;
  }
  return true;
};

// Controls visibility during NEW patient registration. Does not edit old
// assessments or change the global category status.
const setBodyRegionAssessmentVisibility = asyncHandler(async (req, res) => {
  if (!assertVisibilityRequest(req, res)) return;
  const pathway = req.body.pathway;
  if (!['general', 'postOperative'].includes(pathway)) {
    return res.status(400).json({ message: 'Pathway must be general or postOperative' });
  }
  const region = await PainCategory.findById(req.params.id);
  if (!region) return res.status(404).json({ message: 'Body region not found' });
  if (!region.isActive && req.body.visible) {
    return res.status(409).json({ message: 'Activate this body region first, then publish its assessment pathway' });
  }

  const previousValue = getRegionVisibility(region.toObject());
  if (previousValue[pathway] === req.body.visible) return res.json({ ...region.toObject(), assessmentVisibility: previousValue });
  region.set(`assessmentVisibility.${pathway}`, req.body.visible);
  await region.save();
  const newValue = getRegionVisibility(region.toObject());

  await writeAuditLog({
    req, action: 'assessment_body_region_visibility_changed', module: 'PainCategory',
    recordId: region._id, previousValue, newValue, reason: req.body.reason.trim(),
  });
  res.json({ ...region.toObject(), assessmentVisibility: newValue });
});

const setSurgeryAssessmentVisibility = asyncHandler(async (req, res) => {
  if (!assertVisibilityRequest(req, res)) return;
  const surgery = await SurgeryType.findById(req.params.id).populate('bodyRegion', 'name isActive assessmentVisibility');
  if (!surgery) return res.status(404).json({ message: 'Surgery type not found' });
  if (req.body.visible && (!surgery.isActive || !surgery.bodyRegion?.isActive)) {
    return res.status(409).json({ message: 'Activate the surgery and its body region before publishing' });
  }
  if (req.body.visible && !getRegionVisibility(surgery.bodyRegion).postOperative) {
    return res.status(409).json({ message: 'Enable the Post-op visibility for this body region first' });
  }

  const previousValue = { assessmentPublished: isSurgeryVisible(surgery) };
  if (previousValue.assessmentPublished === req.body.visible) {
    return res.json({ ...surgery.toObject(), assessmentPublished: previousValue.assessmentPublished });
  }
  surgery.assessmentPublished = req.body.visible;
  await surgery.save();

  await writeAuditLog({
    req, action: 'assessment_surgery_visibility_changed', module: 'SurgeryType',
    recordId: surgery._id, previousValue,
    newValue: { assessmentPublished: req.body.visible }, reason: req.body.reason.trim(),
  });
  res.json({ ...surgery.toObject(), assessmentPublished: req.body.visible });
});

module.exports = {
  getAssessmentPathways,
  setBodyRegionAssessmentVisibility,
  setSurgeryAssessmentVisibility,
  createCaseType,
  updateCaseType,
  createSurgeryType,
  updateSurgeryType,
};
