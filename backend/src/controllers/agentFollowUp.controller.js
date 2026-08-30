const Agent = require('../models/Agent.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const notificationService = require('../services/notification.service');
const { writeAuditLog } = require('../utils/auditLogger');
const { paginateModel } = require('../utils/queryHelpers');
const asyncHandler = require('../utils/asyncHandler');

const ALLOWED_STATUSES = ['scheduled', 'completed', 'missed', 'cancelled'];

const getCurrentAgent = async (req) => {
  const agent = await Agent.findOne({ user: req.user._id }).select('_id');
  if (!agent) {
    const error = new Error('Agent profile not found');
    error.status = 404;
    throw error;
  }
  return agent;
};

const getMyFollowUps = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const status = req.query.followUpStatus || 'scheduled';
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid follow-up status' });

  const filter = { agent: agent._id, followUpStatus: status };
  const now = new Date();

  if (status === 'scheduled') {
    if (req.query.due === 'true') filter.followUpDate = { $lte: now };
    if (req.query.upcoming === 'true') filter.followUpDate = { $gt: now };
  }

  const result = await paginateModel({
    model: ClinicVisit,
    filter,
    query: req.query,
    sort: status === 'scheduled' ? { followUpDate: 1, createdAt: -1 } : { updatedAt: -1 },
    populate: [{ path: 'doctor', select: 'doctorId fullName clinicName' }],
  });

  res.json(result);
});

const updateMyFollowUp = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const { followUpStatus, followUpDate, note, nextAction } = req.body;

  if (!ALLOWED_STATUSES.includes(followUpStatus)) return res.status(400).json({ message: 'Invalid follow-up status' });
  if (followUpStatus === 'scheduled' && !followUpDate) return res.status(400).json({ message: 'Follow-up date is required when scheduling or rescheduling' });

  const visit = await ClinicVisit.findOne({ _id: req.params.visitId, agent: agent._id });
  if (!visit) return res.status(404).json({ message: 'Clinic visit not found' });

  const previousValue = {
    followUpStatus: visit.followUpStatus,
    followUpDate: visit.followUpDate,
    followUpCompletedAt: visit.followUpCompletedAt,
    followUpCompletedNote: visit.followUpCompletedNote,
    nextAction: visit.nextAction,
  };

  visit.followUpStatus = followUpStatus;
  if (note !== undefined) visit.followUpCompletedNote = note;
  if (nextAction !== undefined) visit.nextAction = nextAction;
  visit.updatedBy = req.user._id;

  if (followUpStatus === 'scheduled') {
    visit.followUpDate = new Date(followUpDate);
    if (Number.isNaN(visit.followUpDate.getTime())) return res.status(400).json({ message: 'Follow-up date is invalid' });
    visit.followUpCompletedAt = null;
  } else {
    if (followUpStatus === 'completed') visit.followUpCompletedAt = new Date();
  }

  await visit.save();

  if (followUpStatus === 'scheduled') {
    await notificationService.createNotification({
      recipientType: 'agent',
      agent: agent._id,
      type: 'clinic_visit_reminder',
      channel: 'in_app',
      title: 'Clinic follow-up scheduled',
      message: `Follow-up scheduled for ${visit.clinicName || visit.doctorName || visit._id} on ${visit.followUpDate.toISOString().slice(0, 10)}.`,
    });
  }

  await writeAuditLog({
    req,
    action: 'clinic_follow_up_updated',
    module: 'ClinicVisit',
    recordId: visit._id,
    previousValue,
    newValue: {
      followUpStatus: visit.followUpStatus,
      followUpDate: visit.followUpDate,
      followUpCompletedAt: visit.followUpCompletedAt,
      followUpCompletedNote: visit.followUpCompletedNote,
      nextAction: visit.nextAction,
    },
  });

  res.json(visit);
});

module.exports = { getMyFollowUps, updateMyFollowUp };
