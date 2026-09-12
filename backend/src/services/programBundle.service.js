const PatientAssessment = require('../models/PatientAssessment.model');
const PatientProgram = require('../models/PatientProgram.model');
const Program = require('../models/Program.model');

const normalizeIds = (values = []) => [...new Set((values || []).map((value) => String(value)).filter(Boolean))];

const getApprovedProgrammeIds = (assessment) => {
  const ids = normalizeIds(assessment?.approvedPrograms || []);
  if (ids.length) return ids;
  if (assessment?.approvedProgram) return [String(assessment.approvedProgram)];
  return [];
};

const getLatestApprovedProgrammeIds = async (patientId) => {
  const assessment = await PatientAssessment.findOne({ patient: patientId, status: 'cleared' })
    .sort({ createdAt: -1 })
    .select('approvedProgram approvedPrograms')
    .lean();
  return getApprovedProgrammeIds(assessment);
};

const activateProgrammeBundle = async ({ patientId, paymentId, doctorId = null, programIds, primaryProgramId, session }) => {
  const selectedIds = normalizeIds(programIds);
  if (!selectedIds.length) return [];

  let programQuery = Program.find({ _id: { $in: selectedIds }, isActive: true }).select('_id durationDays');
  if (session) programQuery = programQuery.session(session);
  const programs = await programQuery;
  if (programs.length !== selectedIds.length) {
    const error = new Error('One or more approved programmes are inactive or unavailable');
    error.status = 409;
    throw error;
  }

  const primaryId = String(primaryProgramId || selectedIds[0]);
  const results = [];

  for (const program of programs) {
    const isPrimary = String(program._id) === primaryId;
    let existingQuery = PatientProgram.findOne({ patient: patientId, program: program._id });
    if (session) existingQuery = existingQuery.session(session);
    const existing = await existingQuery;

    if (existing?.status === 'active') {
      existing.activationPayment = paymentId;
      if (isPrimary && !existing.payment) existing.payment = paymentId;
      if (doctorId) existing.doctor = doctorId;
      else existing.doctor = undefined;
      await existing.save(session ? { session } : undefined);
      results.push(existing);
      continue;
    }

    const startDate = existing?.startDate || new Date();
    const gracePeriodDays = Number(existing?.gracePeriodDays ?? 3);
    const durationDays = Number(program.durationDays || 30);
    const expiryDate = existing?.expiryDate || new Date(startDate.getTime() + (durationDays + gracePeriodDays) * 24 * 60 * 60 * 1000);

    const set = {
      status: 'active',
      startDate,
      expiryDate,
      gracePeriodDays,
      activationPayment: paymentId,
    };
    if (doctorId) set.doctor = doctorId;
    if (isPrimary) set.payment = paymentId;

    const update = { $set: set };
    if (!doctorId) update.$unset = { doctor: '' };

    let enrollmentQuery = PatientProgram.findOneAndUpdate(
      { patient: patientId, program: program._id },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true, ...(session ? { session } : {}) },
    );
    results.push(await enrollmentQuery);
  }

  return results;
};

module.exports = {
  getApprovedProgrammeIds,
  getLatestApprovedProgrammeIds,
  activateProgrammeBundle,
};
