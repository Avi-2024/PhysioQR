const PatientProgram = require('../models/PatientProgram.model');
const SystemSettings = require('../models/SystemSettings.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const canAccessProgram = (program, user) => (
  user.role === 'admin' || program.patient.toString() === user._id.toString()
);

const pauseProgram = asyncHandler(async (req, res) => {
  const program = await PatientProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });
  if (!canAccessProgram(program, req.user)) return res.status(403).json({ message: 'Access denied' });
  if (program.status !== 'active') return res.status(400).json({ message: `Cannot pause a program with status: ${program.status}` });

  const settings = await SystemSettings.findOne();
  const maxPauses = settings?.maxPausesAllowed || 2;
  if (program.pauseCount >= maxPauses) return res.status(400).json({ message: `Maximum pause limit of ${maxPauses} reached` });

  program.status = 'paused';
  program.pausedAt = new Date();
  program.pauseReason = req.body.reason || 'Patient request';
  program.pauseCount += 1;
  await program.save();

  res.json({ message: 'Program paused', program });
});

const resumeProgram = asyncHandler(async (req, res) => {
  const program = await PatientProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });
  if (!canAccessProgram(program, req.user)) return res.status(403).json({ message: 'Access denied' });
  if (program.status !== 'paused') return res.status(400).json({ message: 'Program is not paused' });

  const settings = await SystemSettings.findOne();
  if (settings?.extendExpiryOnPause && program.pausedAt && program.expiryDate) {
    const pausedMs = Date.now() - new Date(program.pausedAt).getTime();
    program.expiryDate = new Date(program.expiryDate.getTime() + pausedMs);
  }

  program.status = 'active';
  program.pausedAt = null;
  program.pauseReason = null;
  await program.save();

  res.json({ message: 'Program resumed', program });
});

const extendProgram = asyncHandler(async (req, res) => {
  const extensionDays = Number(req.body.extensionDays);
  if (!extensionDays || extensionDays <= 0) return res.status(400).json({ message: 'extensionDays must be a positive number' });

  const program = await PatientProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });

  const baseDate = program.expiryDate || new Date();
  program.expiryDate = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);
  await program.save();

  await writeAuditLog({
    req,
    action: 'program_extended',
    module: 'PatientProgram',
    recordId: program._id,
    newValue: { extensionDays, newExpiryDate: program.expiryDate },
  });

  res.json({ message: `Program extended by ${extensionDays} days`, newExpiryDate: program.expiryDate });
});

const getPatientProgram = asyncHandler(async (req, res) => {
  const program = await PatientProgram.findById(req.params.id)
    .populate('program')
    .populate('doctor', 'fullName clinicName');
  if (!program) return res.status(404).json({ message: 'Program not found' });
  if (!canAccessProgram(program, req.user)) return res.status(403).json({ message: 'Access denied' });

  res.json(program);
});

module.exports = {
  pauseProgram,
  resumeProgram,
  extendProgram,
  getPatientProgram,
};
