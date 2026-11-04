// Exercise-plan length is independent from how long a patient may replay it.
// Explicit accessValidityDays is an entitlement set by Admin for each programme.
// Legacy programmes retain their existing duration + grace behaviour.
const resolveProgrammeAccessWindow = (program, legacyGraceDays = 3) => {
  const configured = Number(program?.accessValidityDays);
  const explicit = Number.isInteger(configured) && configured >= 1 && configured <= 365;
  const duration = Math.max(1, Number(program?.durationDays || 30));
  const grace = Math.max(0, Number(legacyGraceDays || 0));
  return {
    validityDays: explicit ? configured : duration + grace,
    gracePeriodDays: explicit ? 0 : grace,
    explicit,
  };
};

const calculateProgrammeExpiry = (program, startDate = new Date(), legacyGraceDays = 3) => {
  const window = resolveProgrammeAccessWindow(program, legacyGraceDays);
  const start = new Date(startDate);
  return {
    ...window,
    expiryDate: new Date(start.getTime() + window.validityDays * 86400000),
  };
};

const hasReplayAccess = (enrollment, now = Date.now()) => {
  if (!enrollment || !['active', 'completed'].includes(enrollment.status)) return false;
  if (!enrollment.expiryDate) return true; // Preserve legacy entitlements without expiry.
  const expiry = new Date(enrollment.expiryDate).getTime();
  return Number.isFinite(expiry) && expiry > Number(now);
};

module.exports = { resolveProgrammeAccessWindow, calculateProgrammeExpiry, hasReplayAccess };
