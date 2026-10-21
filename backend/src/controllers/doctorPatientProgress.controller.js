const mongoose = require('mongoose');
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const PatientProgram = require('../models/PatientProgram.model');
const ProgramProgress = require('../models/ProgramProgress.model');
const asyncHandler = require('../utils/asyncHandler');
const { formatDay, summarizeDays } = require('../services/doctorPatientProgress.service');

// GET /api/doctors/me/patients/:patientId/progress
// This is doctor-only, read-only, and scoped to current referringDoctor.
// Patient IDs may be MongoDB IDs or public PT IDs from the doctor's patient list.
const getMyPatientProgress = asyncHandler(async (req, res) => {
  const identifier = String(req.params.patientId || '').trim();
  const byMongoId = mongoose.isValidObjectId(identifier);
  const byPublicId = /^PT\d{5,}$/.test(identifier);
  if (!byMongoId && !byPublicId) {
    return res.status(400).json({ message: 'Invalid patient identifier' });
  }

  const doctor = await Doctor.findOne({ user: req.user._id }).select('_id').lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const patient = await Patient.findOne({
    ...(byMongoId ? { _id: identifier } : { patientId: identifier }),
    referringDoctor: doctor._id,
  }).select('_id patientId fullName age referringDoctor').lean();

  // Never reveal whether an unrelated/direct patient exists.
  if (!patient) return res.status(404).json({ message: 'Patient not found in your referrals' });

  const enrollments = await PatientProgram.find({ patient: patient._id })
    .select('program status currentDay completionPercentage startDate expiryDate createdAt')
    .populate('program', 'name programCode durationDays')
    .sort({ createdAt: -1 })
    .lean();

  const enrollmentIds = enrollments.map((item) => item._id);
  const progressEntries = enrollmentIds.length
    ? await ProgramProgress.find({
      patient: patient._id,
      patientProgram: { $in: enrollmentIds },
    })
      .select('patientProgram dayNumber dayStarted dayCompleted completedAt updatedAt painScoreBefore painScoreAfter difficultyRating feedbackText discomfortReported fullSessionCompleted exercises')
      .populate('exercises.exercise', 'name')
      .sort({ dayNumber: 1 })
      .lean()
    : [];

  const progressByEnrollment = new Map();
  for (const entry of progressEntries) {
    const key = String(entry.patientProgram);
    if (!progressByEnrollment.has(key)) progressByEnrollment.set(key, []);
    progressByEnrollment.get(key).push(formatDay(entry));
  }

  const programmes = enrollments.map((item) => {
    const days = (progressByEnrollment.get(String(item._id)) || [])
      .sort((a, b) => a.dayNumber - b.dayNumber);
    return {
      enrollmentId: item._id,
      program: item.program ? {
        name: item.program.name,
        programCode: item.program.programCode,
        durationDays: item.program.durationDays,
      } : null,
      status: item.status,
      currentDay: item.currentDay,
      completionPercentage: item.completionPercentage || 0,
      startDate: item.startDate || null,
      expiryDate: item.expiryDate || null,
      summary: summarizeDays(days),
      days,
    };
  });

  const allDays = programmes.flatMap((item) => item.days);
  res.set('Cache-Control', 'private, no-store');
  res.json({
    patient: { id: patient._id, patientId: patient.patientId, fullName: patient.fullName, age: patient.age ?? null },
    summary: summarizeDays(allDays),
    programmes,
  });
});

module.exports = { getMyPatientProgress };
