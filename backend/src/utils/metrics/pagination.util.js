// Pagination utility functions for metrics

export const buildPagination = (page = 1, limit = 20) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  
  // Validate pagination parameters
  if (pageNum < 1) {
    throw new Error('Page must be greater than 0');
  }
  
  if (limitNum < 1 || limitNum > 100) {
    throw new Error('Limit must be between 1 and 100');
  }
  
  const skip = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    skip
  };
};

export const buildPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

export const buildPaginationLinks = (req, page, totalPages) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
  const query = { ...req.query };
  
  // Remove pagination from query for building links
  delete query.page;
  delete query.limit;
  
  const queryString = Object.keys(query).length > 0 
    ? '?' + Object.keys(query).map(key => `${key}=${encodeURIComponent(query[key])}`).join('&')
    : '';
  
  const links = {
    self: `${baseUrl}${queryString ? queryString + '&' : '?'}page=${page}`,
    first: `${baseUrl}${queryString ? queryString + '&' : '?'}page=1`,
    last: `${baseUrl}${queryString ? queryString + '&' : '?'}page=${totalPages}`
  };
  
  if (page > 1) {
    links.prev = `${baseUrl}${queryString ? queryString + '&' : '?'}page=${page - 1}`;
  }
  
  if (page < totalPages) {
    links.next = `${baseUrl}${queryString ? queryString + '&' : '?'}page=${page + 1}`;
  }
  
  return links;
};

export const paginateArray = (array, page, limit) => {
  const { skip } = buildPagination(page, limit);
  return array.slice(skip, skip + limit);
};

export const getPaginationInfo = (req, total) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  return buildPaginationMeta(page, limit, total);
};

export const applyPaginationToQuery = (query, pagination) => {
  if (pagination.skip !== undefined) {
    query = query.skip(pagination.skip);
  }
  
  if (pagination.limit !== undefined) {
    query = query.limit(pagination.limit);
  }
  
  return query;
};

export const applyPaginationToAggregation = (pipeline, pagination) => {
  if (pagination.skip !== undefined) {
    pipeline.push({ $skip: pagination.skip });
  }
  
  if (pagination.limit !== undefined) {
    pipeline.push({ $limit: pagination.limit });
  }
  
  return pipeline;
};

export const calculateOffset = (page, limit) => {
  return (page - 1) * limit;
};

export const calculateTotalPages = (total, limit) => {
  return Math.ceil(total / limit);
};

export const isValidPage = (page, totalPages) => {
  return page >= 1 && page <= totalPages;
};

export const getDefaultPagination = () => {
  return {
    page: 1,
    limit: 20,
    skip: 0
  };
};

export const getPaginationOptions = (req) => {
  const options = {};
  
  if (req.query.page) {
    const page = parseInt(req.query.page);
    if (page > 0) {
      options.page = page;
    }
  }
  
  if (req.query.limit) {
    const limit = parseInt(req.query.limit);
    if (limit > 0 && limit <= 100) {
      options.limit = limit;
    }
  }
  
  return buildPagination(options.page, options.limit);
};

export const buildCursorPagination = (cursor, limit = 20) => {
  const limitNum = parseInt(limit) || 20;
  
  if (limitNum < 1 || limitNum > 100) {
    throw new Error('Limit must be between 1 and 100');
  }
  
  return {
    cursor,
    limit: limitNum,
    hasMore: false
  };
};

export const applyCursorPagination = (query, cursorPagination, sortField = '_id') => {
  if (cursorPagination.cursor) {
    query = query.where(sortField).gt(cursorPagination.cursor);
  }
  
  query = query.limit(cursorPagination.limit + 1); // +1 to check if there are more results
  
  return query;
};

export const processCursorResults = (results, limit) => {
  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, -1) : results;
  const nextCursor = data.length > 0 ? data[data.length - 1]._id : null;
  
  return {
    data,
    hasMore,
    nextCursor
  };
};

export const buildPaginationResponse = (req, data, total, pagination = null) => {
  const meta = {
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
  
  if (pagination) {
    meta.pagination = buildPaginationMeta(pagination.page, pagination.limit, total);
    meta.links = buildPaginationLinks(req, pagination.page, meta.pagination.totalPages);
  }
  
  return {
    success: true,
    data,
    meta
  };
};

const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export default {
  buildPagination,
  buildPaginationMeta,
  buildPaginationLinks,
  paginateArray,
  getPaginationInfo,
  applyPaginationToQuery,
  applyPaginationToAggregation,
  calculateOffset,
  calculateTotalPages,
  isValidPage,
  getDefaultPagination,
  getPaginationOptions,
  buildCursorPagination,
  applyCursorPagination,
  processCursorResults,
  buildPaginationResponse
};