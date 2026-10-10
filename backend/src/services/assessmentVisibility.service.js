// Patient-facing assessment rollout rules. All body regions and surgeries remain
// in MongoDB; visibility is independent of their global active/inactive status.
//
// Phase 1 defaults apply only when no Admin visibility preference has been saved.
// Future regions/surgeries are hidden until an Admin explicitly publishes them.
// Never infer clinical readiness solely from a name or a toggle.
const PHASE_ONE_GENERAL_REGIONS = new Set([
  'spine', 'back pain', 'back pain spine', 'neck', 'neck pain',
  'knee', 'knee pain', 'knee joint', 'shoulder', 'shoulder pain', 'shoulder joint',
]);
const PHASE_ONE_POST_OP_REGIONS = new Set(['knee', 'knee pain', 'knee joint', 'shoulder', 'shoulder pain', 'shoulder joint']);
const PHASE_ONE_SURGERY_CODES = new Set(['total_knee_replacement', 'shoulder_replacement']);

const normalizeName = (name) => String(name || '').trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

const getRegionVisibility = (region) => {
  const name = normalizeName(region?.name);
  const configured = region?.assessmentVisibility || {};
  return {
    general: typeof configured.general === 'boolean'
      ? configured.general : PHASE_ONE_GENERAL_REGIONS.has(name),
    postOperative: typeof configured.postOperative === 'boolean'
      ? configured.postOperative : PHASE_ONE_POST_OP_REGIONS.has(name),
  };
};

const isRegionVisibleForCase = (region, caseType) => {
  if (!region || region.isActive === false || !caseType || caseType.isActive === false) return false;
  const visibility = getRegionVisibility(region);
  return caseType.requiresSurgeryDetails ? visibility.postOperative : visibility.general;
};

const isSurgeryVisible = (surgery) => {
  if (!surgery || surgery.isActive === false) return false;
  if (typeof surgery.assessmentPublished === 'boolean') return surgery.assessmentPublished;
  return PHASE_ONE_SURGERY_CODES.has(String(surgery.code || '').trim().toLowerCase());
};

module.exports = {
  getRegionVisibility, isRegionVisibleForCase, isSurgeryVisible,
};
