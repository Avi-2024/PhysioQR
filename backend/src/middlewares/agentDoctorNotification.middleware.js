const Doctor = require('../models/Doctor.model');
const notificationService = require('../services/notification.service');

const ACTIONS = {
  approved: {
    type: 'doctor_approved',
    title: 'Doctor approved',
    message: (doctor) => `${doctor.fullName || 'Doctor'} has been approved by Admin.`,
  },
  rejected: {
    type: 'doctor_rejected',
    title: 'Doctor application rejected',
    message: (doctor) => `${doctor.fullName || 'Doctor'} was rejected by Admin. Review the doctor record for the reason.`,
  },
  documents_required: {
    type: 'documents_required',
    title: 'Doctor documents required',
    message: (doctor) => `Additional documents are required for ${doctor.fullName || 'this doctor'}.`,
  },
};

// Registers a post-response notification without making the admin mutation fail
// if the notification subsystem is temporarily unavailable.
const notifyAssignedAgentAfterDoctorAction = (action) => (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode >= 400 || !ACTIONS[action]) return;
    try {
      const doctor = await Doctor.findById(req.params.id).select('_id doctorId fullName clinicName agent').lean();
      if (!doctor?.agent) return;
      const config = ACTIONS[action];
      await notificationService.createNotification({
        recipientType: 'agent',
        agent: doctor.agent,
        type: config.type,
        channel: 'in_app',
        title: config.title,
        message: config.message(doctor),
        metadata: { doctorId: doctor._id, doctorCode: doctor.doctorId, action },
      });
    } catch (error) {
      console.error('Agent doctor notification failed:', error.message);
    }
  });
  next();
};

module.exports = { notifyAssignedAgentAfterDoctorAction };
