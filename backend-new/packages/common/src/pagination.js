// Normalizes pagination input with bounded defaults.
function normalizePagination({ page = 1, limit = 25 } = {}) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

// Builds a consistent paginated response envelope.
function paginatedResponse({ data, total, page, limit }) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export { normalizePagination, paginatedResponse };
