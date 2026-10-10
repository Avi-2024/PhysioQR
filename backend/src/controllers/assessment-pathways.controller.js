const mongoose = require('mongoose');
const CaseType = require('../models/CaseType.model');
const PainCategory = require('../models/PainCategory.model');
const SurgeryType = require('../models/SurgeryType.model');
const { isRegionVisibleForCase, isSurgeryVisible } = require('../services/assessmentVisibility.service');
const asyncHandler = require('../utils/asyncHandler');

// Public registration: options follow the selected case type. Do not expose
// all globally-active joints to patients while their pathway is unpublished.
const getPathwayOptions = asyncHandler(async (req, res) => {
  const caseTypes = await CaseType.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .select('code name nameHindi description requiresSurgeryDetails requiresPhysioReview displayOrder isActive')
    .lean();

  const caseTypeId = String(req.query.caseTypeId || '').trim();
  const selectedCaseType = caseTypeId
    ? caseTypes.find((item) => String(item._id) === caseTypeId)
    : null;
  if (caseTypeId && !selectedCaseType) return res.status(400).json({ message: 'Invalid or inactive case type' });

  // No selected pathway = no selectable body regions. Client first selects the
  // case type, then reloads its matching regions.
  const regions = selectedCaseType
    ? await PainCategory.find({ isActive: true }).sort({ name: 1 })
      .select('name nameHindi description isActive assessmentVisibility').lean()
    : [];
  let bodyRegions = regions.filter((region) => isRegionVisibleForCase(region, selectedCaseType));

  if (selectedCaseType?.requiresSurgeryDetails && bodyRegions.length) {
    const surgeryTypes = await SurgeryType.find({
      isActive: true,
      bodyRegion: { $in: bodyRegions.map((region) => region._id) },
    }).select('bodyRegion code assessmentPublished isActive').lean();
    const eligibleRegions = new Set(surgeryTypes.filter(isSurgeryVisible).map((surgery) => String(surgery.bodyRegion)));
    bodyRegions = bodyRegions.filter((region) => eligibleRegions.has(String(region._id)));
  }

  res.json({
    caseTypes,
    bodyRegions: bodyRegions.map(({ assessmentVisibility, isActive, ...region }) => region),
  });
});

const getSurgeryTypes = asyncHandler(async (req, res) => {
  const bodyRegionId = String(req.query.bodyRegionId || '').trim();
  const caseTypeId = String(req.query.caseTypeId || '').trim();
  if (!mongoose.isValidObjectId(bodyRegionId)) return res.status(400).json({ message: 'Select a valid body region' });

  // Ensure legacy clients cannot bypass post-operative visibility.
  const caseType = caseTypeId
    ? await CaseType.findOne({ _id: mongoose.isValidObjectId(caseTypeId) ? caseTypeId : null, isActive: true }).lean()
    : await CaseType.findOne({ code: 'post_surgery', isActive: true }).lean();
  if (!caseType?.requiresSurgeryDetails) return res.status(400).json({ message: 'Select an active post-operative pathway' });

  const bodyRegion = await PainCategory.findOne({ _id: bodyRegionId, isActive: true })
    .select('_id name isActive assessmentVisibility').lean();
  if (!isRegionVisibleForCase(bodyRegion, caseType)) {
    return res.status(404).json({ message: 'This body region is not available for post-operative assessment' });
  }

  const surgeryTypes = await SurgeryType.find({ bodyRegion: bodyRegion._id, isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .select('code name nameHindi description requiresPhysioReview displayOrder bodyRegion isActive assessmentPublished')
    .lean();

  res.json({
    bodyRegion: { _id: bodyRegion._id, name: bodyRegion.name },
    items: surgeryTypes.filter(isSurgeryVisible).map(({ isActive, assessmentPublished, ...surgery }) => surgery),
  });
});

module.exports = { getPathwayOptions, getSurgeryTypes };
