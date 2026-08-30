const Agent = require('../models/Agent.model');
const Doctor = require('../models/Doctor.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const Patient = require('../models/Patient.model');
const Notification = require('../models/Notification.model');
const { Payment } = require('../models/Payment.model');
const asyncHandler = require('../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded', 'refunded'];

const currentAgent = async (req) => {
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) { const error = new Error('Agent profile not found'); error.status = 404; throw error; }
  return agent;
};

const getMyPerformance = asyncHandler(async (req, res) => {
  const agent = await currentAgent(req);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const doctorIds = (await Doctor.find({ agent: agent._id }).select('_id').lean()).map((d) => d._id);

  const [totalDoctors, approvedDoctors, monthOnboarded, visits, completedFollowUps, scheduledFollowUps, patientCount, paidPatients, revenue, monthlyDoctors] = await Promise.all([
    Doctor.countDocuments({ agent: agent._id }),
    Doctor.countDocuments({ agent: agent._id, status: 'approved' }),
    Doctor.countDocuments({ agent: agent._id, createdAt: { $gte: monthStart, $lt: nextMonth } }),
    ClinicVisit.countDocuments({ agent: agent._id }),
    ClinicVisit.countDocuments({ agent: agent._id, followUpStatus: 'completed' }),
    ClinicVisit.countDocuments({ agent: agent._id, followUpStatus: { $in: ['scheduled', 'completed', 'missed'] } }),
    Patient.countDocuments({ referringDoctor: { $in: doctorIds } }),
    Payment.distinct('patient', { doctor: { $in: doctorIds }, status: { $in: VERIFIED_PAYMENT_STATUSES } }),
    Payment.aggregate([{ $match: { doctor: { $in: doctorIds }, status: { $in: VERIFIED_PAYMENT_STATUSES } } }, { $group: { _id: null, paid: { $sum: { $ifNull: ['$paidAmount', 0] } }, refunded: { $sum: { $ifNull: ['$refundAmount', 0] } } } }]),
    Doctor.aggregate([{ $match: { agent: agent._id, createdAt: { $gte: sixMonthsStart } } }, { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
  ]);

  const target = Number.isFinite(agent.monthlyOnboardingTarget) ? agent.monthlyOnboardingTarget : null;
  const revenueRow = revenue[0] || { paid: 0, refunded: 0 };
  res.json({
    summary: {
      totalDoctors, approvedDoctors, monthOnboarded, clinicVisits: visits, patientRegistrations: patientCount,
      paidPatients: paidPatients.length, netRevenue: Math.max((revenueRow.paid || 0) - (revenueRow.refunded || 0), 0),
      approvalConversionPercent: totalDoctors ? Math.round((approvedDoctors / totalDoctors) * 100) : 0,
      followUpCompletionPercent: scheduledFollowUps ? Math.round((completedFollowUps / scheduledFollowUps) * 100) : 0,
    },
    target: { monthlyTarget: target, achieved: monthOnboarded, achievementPercent: target ? Math.round((monthOnboarded / target) * 100) : null },
    monthlyDoctors,
  });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const agent = await currentAgent(req);
  res.json({ agent: {
    id: agent._id, agentId: agent.agentId, fullName: agent.fullName, mobile: agent.mobile, whatsapp: agent.whatsapp,
    email: agent.email, address: agent.address, city: agent.city, state: agent.state, assignedRegion: agent.assignedRegion,
    joiningDate: agent.joiningDate, reportingPerson: agent.reportingPerson, profilePhoto: agent.profilePhoto,
    monthlyOnboardingTarget: agent.monthlyOnboardingTarget, status: agent.status,
  }});
});

const getMyNotifications = asyncHandler(async (req, res) => {
  const agent = await currentAgent(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const filter = { recipientType: 'agent', agent: agent._id, channel: { $in: ['in_app', 'web_push'] } };
  if (req.query.unread === 'true') filter.isRead = false;
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).select('type channel title message metadata isRead status createdAt').sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ recipientType: 'agent', agent: agent._id, channel: { $in: ['in_app', 'web_push'] }, isRead: false }),
  ]);
  res.json({ notifications, unreadCount });
});

const markMyNotificationRead = asyncHandler(async (req, res) => {
  const agent = await currentAgent(req);
  const notification = await Notification.findOneAndUpdate({ _id: req.params.notificationId, recipientType: 'agent', agent: agent._id }, { $set: { isRead: true } }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification marked as read' });
});

const markAllMyNotificationsRead = asyncHandler(async (req, res) => {
  const agent = await currentAgent(req);
  const result = await Notification.updateMany({ recipientType: 'agent', agent: agent._id, isRead: false }, { $set: { isRead: true } });
  res.json({ message: 'Notifications marked as read', updated: result.modifiedCount || 0 });
});

module.exports = { getMyPerformance, getMyProfile, getMyNotifications, markMyNotificationRead, markAllMyNotificationsRead };
