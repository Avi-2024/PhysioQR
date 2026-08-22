const AuditLog = require('../../models/AuditLog.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const MAX_EXPORT_LIMIT = 5000;

const escapeCsv = (value) => {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const buildFilter = (query = {}) => {
  const filter = {};
  if (query.module) filter.module = query.module;
  if (query.action) filter.action = query.action;
  if (query.userRole) filter.userRole = query.userRole;
  if (query.recordId) filter.recordId = String(query.recordId);
  if (query.performedBy) filter.performedBy = query.performedBy;
  if (query.method) filter.method = query.method;
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }
  if (query.search) Object.assign(filter, buildSearchFilter(query.search, ['action', 'module', 'recordId', 'reason', 'path', 'requestId']));
  return filter;
};

const getAuditLogs = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const [result, total, withReason, mutationCount, roleBreakdown] = await Promise.all([
    paginateModel({
      model: AuditLog,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'action', 'module', 'userRole', 'statusCode']),
      populate: [{ path: 'performedBy', select: 'email mobile role status' }],
      select: '-previousValue -newValue -metadata',
    }),
    AuditLog.countDocuments(filter),
    AuditLog.countDocuments({ ...filter, reason: { $exists: true, $nin: ['', null] } }),
    AuditLog.countDocuments({ ...filter, method: { $in: ['POST', 'PUT', 'PATCH', 'DELETE'] } }),
    AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: '$userRole', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.json({
    items: result.items.map((item) => ({ ...item, id: item._id })),
    meta: result.meta,
    summary: {
      total,
      withReason,
      mutations: mutationCount,
      topRole: roleBreakdown[0]?._id || null,
    },
  });
});

const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id)
    .populate('performedBy', 'email mobile role status')
    .lean();
  if (!log) return res.status(404).json({ message: 'Audit log not found' });
  res.json({ ...log, id: log._id });
});

const exportAuditLogs = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv';
  if (!['csv', 'json'].includes(format)) return res.status(400).json({ message: 'format must be csv or json' });

  const limit = Math.min(Math.max(Number(req.query.limit || 1000), 1), MAX_EXPORT_LIMIT);
  const logs = await AuditLog.find(buildFilter(req.query))
    .populate('performedBy', 'email mobile role status')
    .sort(buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'action', 'module', 'userRole', 'statusCode']))
    .limit(limit)
    .lean();

  if (format === 'json') return res.json({ items: logs, meta: { total: logs.length, limit } });

  const header = ['createdAt','userRole','performedBy','action','module','recordId','reason','method','path','statusCode','ipAddress','requestId'];
  const rows = [header.join(','), ...logs.map((log) => [
    log.createdAt?.toISOString?.() || log.createdAt,
    log.userRole,
    log.performedBy?.email || log.performedBy?.mobile || log.performedBy?._id,
    log.action,
    log.module,
    log.recordId,
    log.reason,
    log.method,
    log.path,
    log.statusCode,
    log.ipAddress,
    log.requestId,
  ].map(escapeCsv).join(','))];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
  res.send(rows.join('\n'));
});

module.exports = { getAuditLogs, getAuditLogById, exportAuditLogs };
