// Maps a doctor-scoped 30-day recovery activity aggregate to safe,
 // patient-reported status data without diagnosing clinical improvement.
const score = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
const asCount = (value) => Math.max(0, Number(value) || 0);
const id = (value) => String(value?._id || value || '');

const buildRecoveryPipeline = ({ patientIds, enrollmentIds, since }) => [
  { $match: {
    patient: { $in: patientIds },
    patientProgram: { $in: enrollmentIds },
    updatedAt: { $gte: since },
    // Merely unlocking a day is not a patient activity/recovery update.
    $or: [
      { dayStarted: true },
      { dayCompleted: true },
      { painScoreBefore: { $type: 'number' } },
      { painScoreAfter: { $type: 'number' } },
      { discomfortReported: { $type: 'bool' } },
      { feedbackText: { $exists: true, $nin: [null, ''] } },
    ],
  } },
  { $facet: {
    totals: [{ $group: {
      _id: null,
      loggedDays: { $sum: 1 },
      completedDays: { $sum: { $cond: ['$dayCompleted', 1, 0] } },
      discomfortDays: { $sum: { $cond: [{ $eq: ['$discomfortReported', true] }, 1, 0] } },
      reportingPatients: { $addToSet: '$patient' },
    } }],
    updates: [
      { $sort: { updatedAt: -1, _id: -1 } },
      { $limit: 8 },
      { $project: {
        _id: 0,
        patient: 1, patientProgram: 1, dayNumber: 1,
        dayCompleted: 1, painScoreBefore: 1, painScoreAfter: 1,
        discomfortReported: 1, feedbackText: 1, updatedAt: 1,
      } },
    ],
  } },
];

const describeUpdate = (item) => {
  const before = score(item.painScoreBefore);
  const after = score(item.painScoreAfter);
  const painIncreased = before !== null && after !== null && after > before;
  const discomfort = item.discomfortReported === true;
  return {
    dayNumber: Math.max(1, asCount(item.dayNumber) || 1),
    completed: item.dayCompleted === true,
    painBefore: before,
    painAfter: after,
    discomfortReported: discomfort,
    needsReview: discomfort || painIncreased,
    // Only patient-supplied notes. Escape and output safety are handled by React.
    feedback: typeof item.feedbackText === 'string' ? item.feedbackText.slice(0, 800).trim() : '',
    updatedAt: item.updatedAt || null,
  };
};

const summarizeOverview = ({ result, patients, enrollments, since }) => {
  const totals = result?.totals?.[0] || {};
  const patientMap = new Map(patients.map((patient) => [id(patient._id), patient]));
  const enrollmentMap = new Map(enrollments.map((entry) => [id(entry._id), entry]));
  const updates = (result?.updates || [])
    .map((item) => {
      const patient = patientMap.get(id(item.patient));
      const enrollment = enrollmentMap.get(id(item.patientProgram));
      // Fail closed if an aggregate row isn't in both authorized lookup sets.
      if (!patient || !enrollment || id(enrollment.patient) !== id(patient._id)) return null;
      return {
        patientId: patient.patientId || id(patient._id),
        patientName: patient.fullName || 'Patient',
        programmeName: enrollment.program?.name || 'Rehabilitation programme',
        ...describeUpdate(item),
      };
    }).filter(Boolean);
  return {
    periodDays: 30,
    since,
    totalReferredPatients: patients.length,
    patientsReporting: (totals.reportingPatients || []).length,
    loggedDays: asCount(totals.loggedDays),
    completedDays: asCount(totals.completedDays),
    discomfortDays: asCount(totals.discomfortDays),
    recentUpdates: updates,
  };
};

module.exports = { buildRecoveryPipeline, describeUpdate, summarizeOverview };
