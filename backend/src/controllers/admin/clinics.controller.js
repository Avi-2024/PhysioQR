const Doctor = require('../../models/Doctor.model');
const Patient = require('../../models/Patient.model');
const QrScan = require('../../models/QrScan.model');
const { Payment } = require('../../models/Payment.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));
const CLINIC_FIELDS = [
  'clinicName',
  'clinicAddress',
  'city',
  'state',
  'postalCode',
  'clinicContact',
  'clinicEmail',
  'clinicWorkingHours',
  'googleMapsLink',
  'clinicBranches',
];

const clinicFilter = { clinicName: { $exists: true, $ne: '' } };

const findClinicDoctor = async (identifier) => {
  const raw = String(identifier || '').trim();
  const doctorId = raw.startsWith('CLINIC-') ? raw.slice(7) : raw;
  const or = [{ doctorId }];
  if (isObjectId(raw)) or.push({ _id: raw });
  return Doctor.findOne({ $or: or });
};

const toClinicItem = (doctor) => ({
  ...doctor,
  id: doctor._id,
  clinicId: `CLINIC-${doctor.doctorId || doctor._id}`,
  doctor: {
    _id: doctor._id,
    doctorId: doctor.doctorId,
    fullName: doctor.fullName,
    specialization: doctor.specialization,
    status: doctor.status,
    qrCodeActive: doctor.qrCodeActive,
  },
});

const getClinics = asyncHandler(async (req, res) => {
  const { status, city, search } = req.query;
  const filter = {
    ...clinicFilter,
    ...buildSearchFilter(search, ['clinicName', 'clinicAddress', 'city', 'state', 'fullName', 'doctorId', 'clinicContact', 'clinicEmail']),
  };
  if (status) filter.status = status;
  if (city) filter.city = city;

  const [result, total, approved, qrActive, cities] = await Promise.all([
    paginateModel({
      model: Doctor,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['clinicName', 'city', 'status', 'createdAt', 'fullName']),
      populate: [{ path: 'agent', select: 'agentId fullName assignedRegion city' }],
      select: 'doctorId fullName specialization clinicName clinicAddress city state postalCode clinicContact clinicEmail clinicWorkingHours googleMapsLink clinicBranches status qrCodeActive agent createdAt updatedAt',
    }),
    Doctor.countDocuments(clinicFilter),
    Doctor.countDocuments({ ...clinicFilter, status: 'approved' }),
    Doctor.countDocuments({ ...clinicFilter, qrCodeActive: true }),
    Doctor.distinct('city', { ...clinicFilter, city: { $exists: true, $ne: '' } }),
  ]);

  res.json({
    items: result.items.map(toClinicItem),
    meta: result.meta,
    summary: {
      total,
      approved,
      qrActive,
      cities: cities.length,
    },
  });
});

const getClinicById = asyncHandler(async (req, res) => {
  const clinicDoctor = await findClinicDoctor(req.params.id);
  if (!clinicDoctor || !clinicDoctor.clinicName) {
    return res.status(404).json({ message: 'Clinic profile not found' });
  }

  const doctor = await Doctor.findById(clinicDoctor._id)
    .populate('agent', 'agentId fullName assignedRegion mobile city state')
    .select('doctorId fullName mobile email specialization qualification clinicName clinicAddress city state postalCode clinicContact clinicEmail clinicWorkingHours googleMapsLink clinicBranches status qrCodeActive referralCode agent createdAt updatedAt')
    .lean();

  const [qrScans, patients, paidPatients, revenue] = await Promise.all([
    QrScan.countDocuments({ doctor: doctor._id }),
    Patient.countDocuments({ referringDoctor: doctor._id }),
    Payment.countDocuments({ doctor: doctor._id, status: { $in: ['successful', 'manually_verified'] } }),
    Payment.aggregate([
      { $match: { doctor: doctor._id, status: { $in: ['successful', 'manually_verified'] } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
  ]);

  res.json({
    ...toClinicItem(doctor),
    metrics: {
      qrScans,
      patients,
      paidPatients,
      revenueGenerated: revenue[0]?.total || 0,
    },
  });
});

const updateClinic = asyncHandler(async (req, res) => {
  const doctor = await findClinicDoctor(req.params.id);
  if (!doctor || !doctor.clinicName) {
    return res.status(404).json({ message: 'Clinic profile not found' });
  }

  const updates = {};
  CLINIC_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
    }
  });

  if (updates.clinicName !== undefined && !updates.clinicName) {
    return res.status(400).json({ message: 'Clinic name cannot be empty' });
  }
  if (updates.clinicBranches !== undefined) {
    const branches = Number(updates.clinicBranches);
    if (!Number.isFinite(branches) || branches < 1 || branches > 1000) {
      return res.status(400).json({ message: 'Clinic branches must be between 1 and 1000' });
    }
    updates.clinicBranches = branches;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'No clinic fields supplied' });
  }

  const previousValue = {};
  Object.keys(updates).forEach((field) => {
    previousValue[field] = doctor[field];
    doctor[field] = updates[field];
  });
  await doctor.save();

  await writeAuditLog({
    req,
    action: 'clinic_profile_updated',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: updates,
  });

  const updated = await Doctor.findById(doctor._id)
    .populate('agent', 'agentId fullName assignedRegion city')
    .select('doctorId fullName specialization clinicName clinicAddress city state postalCode clinicContact clinicEmail clinicWorkingHours googleMapsLink clinicBranches status qrCodeActive agent createdAt updatedAt')
    .lean();

  res.json({ message: 'Clinic profile updated', clinic: toClinicItem(updated) });
});

module.exports = { getClinics, getClinicById, updateClinic };
