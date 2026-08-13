const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Normalizes pagination values from query params.
const getPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const requestedLimit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// Builds a safe case-insensitive Mongo search filter.
const buildSearchFilter = (search, fields = []) => {
  if (!search || !fields.length) return {};

  const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escapedSearch, $options: 'i' },
    })),
  };
};

// Keeps sorting constrained to fields a model screen explicitly supports.
const buildSort = (sortBy, sortOrder, allowedFields = []) => {
  const fallback = { createdAt: -1 };
  if (!sortBy || !allowedFields.includes(sortBy)) return fallback;

  return { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
};

const paginateModel = async ({ model, filter = {}, query = {}, sort = { createdAt: -1 }, populate = [], select }) => {
  const { page, limit, skip } = getPagination(query);

  let dbQuery = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (select) dbQuery = dbQuery.select(select);
  populate.forEach((item) => {
    dbQuery = dbQuery.populate(item);
  });

  const [items, total] = await Promise.all([
    dbQuery.lean(),
    model.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

module.exports = {
  getPagination,
  buildSearchFilter,
  buildSort,
  paginateModel,
};
