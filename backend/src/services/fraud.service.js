const FraudCase = require('../models/FraudCase.model');
const QrScan = require('../models/QrScan.model');
const { Payment } = require('../models/Payment.model');
const Refund = require('../models/Refund.model');
const Doctor = require('../models/Doctor.model');
const notificationService = require('./notification.service');

// Creates one open fraud case per rule and related record.
const createFraudCase = async ({ rule, severity = 'medium', doctor, patient, payment, relatedRecord, summary, evidence }) => {
  const filter = { rule, status: { $in: ['open', 'reviewing'] } };
  if (relatedRecord) filter.relatedRecord = relatedRecord;
  else {
    if (doctor) filter.doctor = doctor;
    if (patient) filter.patient = patient;
    if (payment) filter.payment = payment;
  }

  const fraudCase = await FraudCase.findOneAndUpdate(
    filter,
    { $setOnInsert: { rule, severity, doctor, patient, payment, relatedRecord, summary, evidence } },
    { new: true, upsert: true }
  );

  await notificationService.createNotification({
    recipientType: 'admin',
    type: 'suspicious_activity',
    channel: 'in_app',
    title: 'Suspicious activity detected',
    message: summary,
    metadata: { fraudCase: fraudCase._id, rule, severity },
  }, { deliverNow: true });

  return fraudCase;
};

// Flags repeated scans from the same device with low payment conversion.
const evaluateQrScanRisk = async ({ doctorId, deviceInfo }) => {
  if (!doctorId || !deviceInfo) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [scanCount, paidCount] = await Promise.all([
    QrScan.countDocuments({ doctor: doctorId, deviceInfo, createdAt: { $gte: since } }),
    QrScan.countDocuments({ doctor: doctorId, deviceInfo, paymentStatus: 'paid', createdAt: { $gte: since } }),
  ]);

  if (scanCount < Number(process.env.FRAUD_QR_SCAN_THRESHOLD || 20) || paidCount > 0) return [];

  return [await createFraudCase({
    rule: 'abnormal_qr_scans',
    severity: 'medium',
    doctor: doctorId,
    relatedRecord: `${doctorId}:${deviceInfo}`,
    summary: `High QR scan activity without payments detected for doctor ${doctorId}`,
    evidence: { deviceInfo, scanCount, paidCount, windowHours: 24 },
  })];
};

// Flags duplicate gateway transactions and high refund concentration under a doctor.
const evaluatePaymentRisk = async ({ payment }) => {
  if (!payment) return [];
  const cases = [];

  const duplicateTransactions = await Payment.countDocuments({
    gatewayTransactionId: payment.gatewayTransactionId,
    _id: { $ne: payment._id },
  });
  if (payment.gatewayTransactionId && duplicateTransactions > 0) {
    cases.push(await createFraudCase({
      rule: 'duplicate_gateway_transaction',
      severity: 'critical',
      doctor: payment.doctor,
      patient: payment.patient,
      payment: payment._id,
      relatedRecord: payment.gatewayTransactionId,
      summary: `Duplicate gateway transaction detected: ${payment.gatewayTransactionId}`,
      evidence: { gatewayTransactionId: payment.gatewayTransactionId, duplicateTransactions },
    }));
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const refundCount = await Refund.countDocuments({ doctor: payment.doctor, createdAt: { $gte: since } });
  if (refundCount >= Number(process.env.FRAUD_REFUND_THRESHOLD || 5)) {
    cases.push(await createFraudCase({
      rule: 'frequent_refunds_under_doctor',
      severity: 'high',
      doctor: payment.doctor,
      payment: payment._id,
      relatedRecord: `${payment.doctor}:refunds:${since.toISOString().slice(0, 10)}`,
      summary: `Frequent refunds detected under doctor ${payment.doctor}`,
      evidence: { refundCount, windowDays: 30 },
    }));
  }

  return cases;
};

// Flags multiple doctors using the same bank account.
const evaluateDoctorBankRisk = async ({ doctor }) => {
  if (!doctor?.bankAccountNumber) return [];

  const sameBankDoctors = await Doctor.find({
    _id: { $ne: doctor._id },
    bankAccountNumber: doctor.bankAccountNumber,
  }).select('_id doctorId fullName');

  if (!sameBankDoctors.length) return [];

  return [await createFraudCase({
    rule: 'shared_doctor_bank_account',
    severity: 'high',
    doctor: doctor._id,
    relatedRecord: `bank:${doctor.bankAccountNumber.slice(-4)}:${doctor._id}`,
    summary: `Multiple doctors appear to use the same bank account ending ${doctor.bankAccountNumber.slice(-4)}`,
    evidence: { matchingDoctors: sameBankDoctors.map((item) => ({ id: item._id, doctorId: item.doctorId, fullName: item.fullName })) },
  })];
};

module.exports = {
  createFraudCase,
  evaluateQrScanRisk,
  evaluatePaymentRisk,
  evaluateDoctorBankRisk,
};
