const Doctor = require('../../models/Doctor.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const getDoctors = asyncHandler(async (req, res) => {
  const { status, agent, revenueModel, kycStatus, search } = req.query;

  const filter = {
    ...buildSearchFilter(search, [
      'doctorId',
      'fullName',
      'mobile',
      'email',
      'clinicName',
      'city',
      'state',
      'specialization',
      'medicalRegNumber',
    ]),
  };

  if (status) filter.status = status;
  if (agent) filter.agent = agent;
  if (revenueModel) filter.revenueModel = revenueModel;
  if (kycStatus) filter.kycStatus = kycStatus;

  const [result, total, approved, pendingApproval, documentsRequired, suspended] = await Promise.all([
    paginateModel({
      model: Doctor,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, [
        'createdAt',
        'fullName',
        'city',
        'status',
        'approvedPatientFee',
        'approvalDate',
      ]),
      populate: [{ path: 'agent', select: 'agentId fullName assignedRegion' }],
      select: '-bankAccountNumber -panNumber -identityProof -addressProof -medicalRegDoc -cancelledCheque -kycDocuments',
    }),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: 'approved' }),
    Doctor.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
    Doctor.countDocuments({ status: 'documents_required' }),
    Doctor.countDocuments({ status: 'suspended' }),
  ]);

  res.json({
    items: result.items.map((doctor) => ({
      ...doctor,
      id: doctor.doctorId || doctor._id,
    })),
    meta: result.meta,
    summary: {
      total,
      approved,
      pendingApproval,
      documentsRequired,
      suspended,
    },
  });
});

module.exports = {
  getDoctors,
};
