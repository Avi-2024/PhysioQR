const Agent = require('../../models/Agent.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const AGENT_STATUSES = ['active', 'inactive', 'suspended', 'terminated'];

const normalizeAgent = (agent) => ({
  ...agent,
  id: agent.agentId || agent._id,
});

const getAgents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {
    ...buildSearchFilter(search, ['agentId', 'fullName', 'mobile', 'email', 'city', 'state', 'assignedRegion']),
  };

  if (status && AGENT_STATUSES.includes(status)) {
    filter.status = status;
  }

  const [result, summaryRows] = await Promise.all([
    paginateModel({
      model: Agent,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'joiningDate', 'fullName', 'city', 'assignedRegion', 'status']),
      select: '-identityProof',
    }),
    Agent.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const summary = {
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    terminated: 0,
  };

  summaryRows.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(summary, row._id)) {
      summary[row._id] = Number(row.count || 0);
    }
    summary.total += Number(row.count || 0);
  });

  res.json({
    items: result.items.map(normalizeAgent),
    meta: result.meta,
    summary,
  });
});

module.exports = { getAgents };
