const CaseType = require('../models/CaseType.model');
const PainCategory = require('../models/PainCategory.model');
const SurgeryType = require('../models/SurgeryType.model');
const asyncHandler = require('../utils/asyncHandler');

const getPathwayOptions = asyncHandler(async (req, res) => {
  const caseTypes = await CaseType.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .select('code name nameHindi description requiresSurgeryDetails requiresPhysioReview displayOrder')
    .lean();

  const bodyRegions = await PainCategory.find({ isActive: true })
    .sort({ name: 1 })
    .select('name nameHindi description')
    .lean();

  res.json({ caseTypes, bodyRegions });
});

const getSurgeryTypes = asyncHandler(async (req, res) => {
  const bodyRegionId = String(req.query.bodyRegionId || '').trim();
  if (!bodyRegionId) return res.status(400).json({ message: 'bodyRegionId is required' });

  const bodyRegion = await PainCategory.findOne({ _id: bodyRegionId, isActive: true }).select('_id name').lean();
  if (!bodyRegion) return res.status(404).json({ message: 'Body region not found or inactive' });

  const surgeryTypes = await SurgeryType.find({ bodyRegion: bodyRegion._id, isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .select('code name nameHindi description requiresPhysioReview displayOrder bodyRegion')
    .lean();

  res.json({ bodyRegion, items: surgeryTypes });
});

module.exports = { getPathwayOptions, getSurgeryTypes };
