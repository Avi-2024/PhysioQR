const Patient = require('../models/Patient.model');

// Aggregate patient referral counts ONLY for doctors already scoped to the
// authenticated agent. No patient names, health data or payment data returned.
const getPatientCountsByDoctor = async (doctorIds = []) => {
  if (!doctorIds.length) return new Map();

  const counts = await Patient.aggregate([
    { $match: { referringDoctor: { $in: doctorIds } } },
    { $group: { _id: '$referringDoctor', count: { $sum: 1 } } },
  ]);

  return new Map(counts.map((item) => [String(item._id), Number(item.count) || 0]));
};

const countDoctorsWithPatients = (counts) =>
  [...counts.values()].filter((count) => count > 0).length;

module.exports = { getPatientCountsByDoctor, countDoctorsWithPatients };
