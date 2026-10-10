/**
 * Helper to compute pagination skip, limit, and response metadata
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getPaginationMeta = (totalRecords, page, limit) => {
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  return {
    currentPage: page,
    pageSize: limit,
    totalRecords,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  getPagination,
  getPaginationMeta,
};
