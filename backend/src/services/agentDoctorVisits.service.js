const ClinicVisit = require('../models/ClinicVisit.model');

// Only the current Agent's visit records linked to their own doctors count.
// Unlinked visits remain included in the Agent's overall visits total, not in
// any individual doctor's visit total.
const getClinicVisitCountsByDoctor = async ({ agentId, doctorIds = [] }) => {
  if (!agentId || !doctorIds.length) return new Map();

  const counts = await ClinicVisit.aggregate([
    { $match: { agent: agentId, doctor: { $in: doctorIds } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  return new Map(counts.map((row) => [String(row._id), Number(row.count) || 0]));
};

module.exports = { getClinicVisitCountsByDoctor };
