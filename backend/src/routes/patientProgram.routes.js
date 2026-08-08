const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const PatientProgram = require('../models/PatientProgram.model');
const SystemSettings = require('../models/SystemSettings.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// POST /api/patient-programs/:id/pause — SRS §21.3
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const program = await PatientProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });

  // Only the patient or admin can pause
  const isOwner = program.patient.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied' });

  if (program.status !== 'active') {
    return res.status(400).json({ message: `Cannot pause a program with status: ${program.status}` });
  }

  const settings = await SystemSettings.findOne();
  const maxPauses = settings?.maxPausesAllowed || 2;

  if (program.pauseCount >= maxPauses) {
    return res.status(400).json({ message: `Maximum pause limit of ${maxPauses} reached` });
  }

  program.status = 'paused';
  program.pausedAt = new Date();
  program.pauseReason = reason || 'Patient request';
  program.pauseCount += 1;
  await program.save();

  res.json({ message: 'Program paused', program });
}));

// POST /api/patient-programs/:id/resume
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const program = await PatientProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });

  const isOwner = program.patient.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied' });

  if (program.status !== 'paused') {
    return res.status(400).json({ message: 'Program is not paused' });
  }

  const settings = await SystemSettings.findOne();

  // Extend expiry date by pause duration if configured (SRS §21.3)
  if (settings?.extendExpiryOnPause && program.pausedAt && program.expiryDate) {
    const pausedMs = Date.now() - new Date(program.pausedAt).getTime();
    program.expiryDate = new Date(program.expiryDate.getTime() + pausedMs);
  }

  program.status = 'active';
  program.pausedAt = null;
  program.pauseReason = null;
  await program.save();

  res.json({ message: 'Program resumed', program });
}));

// POST /api/patient-programs/:id/extend — Admin extends a program (SRS §16.3)
router.post('/:id/extend', authorize('admin'), asyncHandler(async (req, res) => {
  const { extensionDays } = req.body;
  if (!extensionDays || extensionDays <= 0) {
    return res.status(400).json({ message: 'extensionDays must be a positive number' });
  }

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
}));

// GET /api/patient-programs/:id — get enrollment details
router.get('/:id', asyncHandler(async (req, res) => {
  const program = await PatientProgram.findById(req.params.id)
    .populate('program')
    .populate('doctor', 'fullName clinicName');
  if (!program) return res.status(404).json({ message: 'Program not found' });
  res.json(program);
}));

module.exports = router;
