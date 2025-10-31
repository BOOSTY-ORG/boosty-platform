import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
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
} from '../../../src/utils/metrics/pagination.util.js';

describe('Pagination Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('buildPagination', () => {
    it('should build pagination with valid parameters', () => {
      const page = 2;
      const limit = 10;
      
      const result = buildPagination(page, limit);
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(10); // (2-1) * 10
    });

    it('should handle default parameters', () => {
      const result = buildPagination();
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });

    it('should handle string parameters', () => {
      const page = '3';
      const limit = '15';
      
      const result = buildPagination(page, limit);
      
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
      expect(result.skip).toBe(30); // (3-1) * 15
    });

    it('should throw error for invalid page', () => {
      const page = 0;
      
      expect(() => {
        buildPagination(page);
      }).toThrow('Page must be greater than 0');
    });

    it('should throw error for invalid limit', () => {
      const limit = 0;
      
      expect(() => {
        buildPagination(1, limit);
      }).toThrow('Limit must be between 1 and 100');
    });

    it('should throw error for limit too high', () => {
      const limit = 101;
      
      expect(() => {
        buildPagination(1, limit);
      }).toThrow('Limit must be between 1 and 100');
    });
  });

  describe('buildPaginationMeta', () => {
    it('should build pagination meta', () => {
      const page = 2;
      const limit = 10;
      const total = 95;
      
      const result = buildPaginationMeta(page, limit, total);
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(95);
      expect(result.totalPages).toBe(10); // Math.ceil(95/10)
      expect(result.hasNext).toBe(true); // 2 < 10
      expect(result.hasPrev).toBe(true); // 2 > 1
      expect(result.nextPage).toBe(3);
      expect(result.prevPage).toBe(1);
    });

    it('should handle first page', () => {
      const page = 1;
      const limit = 10;
      const total = 95;
      
      const result = buildPaginationMeta(page, limit, total);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(95);
      expect(result.totalPages).toBe(10);
      expect(result.hasNext).toBe(true); // 1 < 10
      expect(result.hasPrev).toBe(false); // 1 == 1
      expect(result.nextPage).toBe(2);
      expect(result.prevPage).toBe(null);
    });

    it('should handle last page', () => {
      const page = 10;
      const limit = 10;
      const total = 95;
      
      const result = buildPaginationMeta(page, limit, total);
      
      expect(result.page).toBe(10);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(95);
      expect(result.totalPages).toBe(10);
      expect(result.hasNext).toBe(false); // 10 == 10
      expect(result.hasPrev).toBe(true); // 10 > 1
      expect(result.nextPage).toBe(null);
      expect(result.prevPage).toBe(9);
    });

    it('should handle empty results', () => {
      const page = 1;
      const limit = 10;
      const total = 0;
      
      const result = buildPaginationMeta(page, limit, total);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
      expect(result.nextPage).toBe(null);
      expect(result.prevPage).toBe(null);
    });

    it('should handle single page', () => {
      const page = 1;
      const limit = 10;
      const total = 5;
      
      const result = buildPaginationMeta(page, limit, total);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
      expect(result.nextPage).toBe(null);
      expect(result.prevPage).toBe(null);
    });
  });

  describe('buildPaginationLinks', () => {
    it('should build pagination links', () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/api/test',
        query: { filter: 'active' }
      };
      const page = 2;
      const totalPages = 10;
      
      const result = buildPaginationLinks(req, page, totalPages);
      
      expect(result.self).toBe('https://example.com/api/test?filter=active&page=2');
      expect(result.first).toBe('https://example.com/api/test?filter=active&page=1');
      expect(result.last).toBe('https://example.com/api/test?filter=active&page=10');
      expect(result.prev).toBe('https://example.com/api/test?filter=active&page=1');
      expect(result.next).toBe('https://example.com/api/test?filter=active&page=3');
    });

    it('should handle first page', () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/api/test',
        query: {}
      };
      const page = 1;
      const totalPages = 10;
      
      const result = buildPaginationLinks(req, page, totalPages);
      
      expect(result.self).toBe('https://example.com/api/test?page=1');
      expect(result.first).toBe('https://example.com/api/test?page=1');
      expect(result.last).toBe('https://example.com/api/test?page=10');
      expect(result.prev).toBeUndefined();
      expect(result.next).toBe('https://example.com/api/test?page=2');
    });

    it('should handle last page', () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/api/test',
        query: {}
      };
      const page = 10;
      const totalPages = 10;
      
      const result = buildPaginationLinks(req, page, totalPages);
      
      expect(result.self).toBe('https://example.com/api/test?page=10');
      expect(result.first).toBe('https://example.com/api/test?page=1');
      expect(result.last).toBe('https://example.com/api/test?page=10');
      expect(result.prev).toBe('https://example.com/api/test?page=9');
      expect(result.next).toBeUndefined();
    });

    it('should handle empty query', () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/api/test',
        query: {}
      };
      const page = 2;
      const totalPages = 10;
      
      const result = buildPaginationLinks(req, page, totalPages);
      
      expect(result.self).toBe('https://example.com/api/test?page=2');
      expect(result.first).toBe('https://example.com/api/test?page=1');
      expect(result.last).toBe('https://example.com/api/test?page=10');
      expect(result.prev).toBe('https://example.com/api/test?page=1');
      expect(result.next).toBe('https://example.com/api/test?page=3');
    });
  });

  describe('paginateArray', () => {
    it('should paginate array', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const page = 2;
      const limit = 3;
      
      const result = paginateArray(array, page, limit);
      
      expect(result).toEqual([4, 5, 6]); // Skip first 3, take next 3
    });

    it('should handle first page', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const page = 1;
      const limit = 3;
      
      const result = paginateArray(array, page, limit);
      
      expect(result).toEqual([1, 2, 3]); // Take first 3
    });

    it('should handle last page', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const page = 4;
      const limit = 3;
      
      const result = paginateArray(array, page, limit);
      
      expect(result).toEqual([10]); // Skip first 9, take remaining
    });

    it('should handle empty array', () => {
      const array = [];
      const page = 1;
      const limit = 3;
      
      const result = paginateArray(array, page, limit);
      
      expect(result).toEqual([]);
    });

    it('should handle page beyond array length', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const page = 5;
      const limit = 3;
      
      const result = paginateArray(array, page, limit);
      
      expect(result).toEqual([]); // Skip first 12, beyond array length
    });
  });

  describe('getPaginationInfo', () => {
    it('should get pagination info from request', () => {
      const req = {
        query: { page: 2, limit: 10 }
      };
      
      const result = getPaginationInfo(req);
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default values', () => {
      const req = {
        query: {}
      };
      
      const result = getPaginationInfo(req);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle string values', () => {
      const req = {
        query: { page: '3', limit: '15' }
      };
      
      const result = getPaginationInfo(req);
      
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });
  });

  describe('applyPaginationToQuery', () => {
    it('should apply pagination to query', () => {
      const query = {
        where: { status: 'active' }
      };
      const pagination = {
        skip: 10,
        limit: 5
      };
      
      const result = applyPaginationToQuery(query, pagination);
      
      expect(result).toEqual({
        where: { status: 'active' },
        skip: 10,
        limit: 5
      });
    });

    it('should handle query without skip', () => {
      const query = {
        where: { status: 'active' }
      };
      const pagination = {
        limit: 5
      };
      
      const result = applyPaginationToQuery(query, pagination);
      
      expect(result).toEqual({
        where: { status: 'active' },
        limit: 5
      });
    });

    it('should handle query without limit', () => {
      const query = {
        where: { status: 'active' }
      };
      const pagination = {
        skip: 10
      };
      
      const result = applyPaginationToQuery(query, pagination);
      
      expect(result).toEqual({
        where: { status: 'active' },
        skip: 10
      });
    });

    it('should handle empty query', () => {
      const query = {};
      const pagination = {
        skip: 10,
        limit: 5
      };
      
      const result = applyPaginationToQuery(query, pagination);
      
      expect(result).toEqual({
        skip: 10,
        limit: 5
      });
    });
  });

  describe('applyPaginationToAggregation', () => {
    it('should apply pagination to aggregation pipeline', () => {
      const pipeline = [
        { $match: { status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ];
      const pagination = {
        skip: 10,
        limit: 5
      };
      
      const result = applyPaginationToAggregation(pipeline, pagination);
      
      expect(result).toEqual([
        { $match: { status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $skip: 10 },
        { $limit: 5 }
      ]);
    });

    it('should handle pipeline without skip', () => {
      const pipeline = [
        { $match: { status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ];
      const pagination = {
        limit: 5
      };
      
      const result = applyPaginationToAggregation(pipeline, pagination);
      
      expect(result).toEqual([
        { $match: { status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $limit: 5 }
      ]);
    });

    it('should handle pipeline without limit', () => {
      const pipeline = [
        { $match: { status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ];
      const pagination = {
        skip: 10
      };
      
      const result = applyPaginationToAggregation(pipeline, pagination);
      
      expect(result).toEqual([
        { $match: { status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $skip: 10 }
      ]);
    });

    it('should handle empty pipeline', () => {
      const pipeline = [];
      const pagination = {
        skip: 10,
        limit: 5
      };
      
      const result = applyPaginationToAggregation(pipeline, pagination);
      
      expect(result).toEqual([
        { $skip: 10 },
        { $limit: 5 }
      ]);
    });
  });

  describe('calculateOffset', () => {
    it('should calculate offset', () => {
      const page = 3;
      const limit = 10;
      
      const result = calculateOffset(page, limit);
      
      expect(result).toBe(20); // (3-1) * 10
    });

    it('should handle first page', () => {
      const page = 1;
      const limit = 10;
      
      const result = calculateOffset(page, limit);
      
      expect(result).toBe(0); // (1-1) * 10
    });

    it('should handle zero limit', () => {
      const page = 2;
      const limit = 0;
      
      const result = calculateOffset(page, limit);
      
      expect(result).toBe(0); // (2-1) * 0
    });
  });

  describe('calculateTotalPages', () => {
    it('should calculate total pages', () => {
      const total = 95;
      const limit = 10;
      
      const result = calculateTotalPages(total, limit);
      
      expect(result).toBe(10); // Math.ceil(95/10)
    });

    it('should handle exact division', () => {
      const total = 100;
      const limit = 10;
      
      const result = calculateTotalPages(total, limit);
      
      expect(result).toBe(10); // Math.ceil(100/10)
    });

    it('should handle zero total', () => {
      const total = 0;
      const limit = 10;
      
      const result = calculateTotalPages(total, limit);
      
      expect(result).toBe(0); // Math.ceil(0/10)
    });

    it('should handle zero limit', () => {
      const total = 95;
      const limit = 0;
      
      expect(() => {
        calculateTotalPages(total, limit);
      }).toThrow();
    });
  });

  describe('isValidPage', () => {
    it('should validate valid page', () => {
      const page = 5;
      const totalPages = 10;
      
      const result = isValidPage(page, totalPages);
      
      expect(result).toBe(true); // 5 >= 1 && 5 <= 10
    });

    it('should validate page too low', () => {
      const page = 0;
      const totalPages = 10;
      
      const result = isValidPage(page, totalPages);
      
      expect(result).toBe(false); // 0 < 1
    });

    it('should validate page too high', () => {
      const page = 15;
      const totalPages = 10;
      
      const result = isValidPage(page, totalPages);
      
      expect(result).toBe(false); // 15 > 10
    });

    it('should validate first page', () => {
      const page = 1;
      const totalPages = 10;
      
      const result = isValidPage(page, totalPages);
      
      expect(result).toBe(true); // 1 >= 1 && 1 <= 10
    });

    it('should validate last page', () => {
      const page = 10;
      const totalPages = 10;
      
      const result = isValidPage(page, totalPages);
      
      expect(result).toBe(true); // 10 >= 1 && 10 <= 10
    });

    it('should handle zero total pages', () => {
      const page = 1;
      const totalPages = 0;
      
      const result = isValidPage(page, totalPages);
      
      expect(result).toBe(false); // 1 > 0
    });
  });

  describe('getDefaultPagination', () => {
    it('should return default pagination', () => {
      const result = getDefaultPagination();
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });
  });

  describe('getPaginationOptions', () => {
    it('should get pagination options from request', () => {
      const req = {
        query: { page: 3, limit: 15 }
      };
      
      const result = getPaginationOptions(req);
      
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });

    it('should use default values', () => {
      const req = {
        query: {}
      };
      
      const result = getPaginationOptions(req);
      
      expect(result.page).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    it('should handle invalid values', () => {
      const req = {
        query: { page: 0, limit: 101 }
      };
      
      const result = getPaginationOptions(req);
      
      expect(result.page).toBeUndefined(); // 0 is invalid
      expect(result.limit).toBeUndefined(); // 101 is invalid
    });

    it('should handle string values', () => {
      const req = {
        query: { page: '3', limit: '15' }
      };
      
      const result = getPaginationOptions(req);
      
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });
  });

  describe('buildCursorPagination', () => {
    it('should build cursor pagination', () => {
      const cursor = '507f1f77bcf86cd799439011';
      const limit = 10;
      
      const result = buildCursorPagination(cursor, limit);
      
      expect(result.cursor).toBe('507f1f77bcf86cd799439011');
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should handle null cursor', () => {
      const cursor = null;
      const limit = 10;
      
      const result = buildCursorPagination(cursor, limit);
      
      expect(result.cursor).toBeNull();
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should handle invalid limit', () => {
      const cursor = '507f1f77bcf86cd799439011';
      const limit = 101;
      
      expect(() => {
        buildCursorPagination(cursor, limit);
      }).toThrow('Limit must be between 1 and 100');
    });
  });

  describe('applyCursorPagination', () => {
    it('should apply cursor pagination to query', () => {
      const query = {
        where: { status: 'active' }
      };
      const cursorPagination = {
        cursor: '507f1f77bcf86cd799439011',
        limit: 10,
        hasMore: false
      };
      
      const result = applyCursorPagination(query, cursorPagination, '_id');
      
      expect(result).toEqual({
        where: { status: 'active', _id: { $gt: '507f1f77bcf86cd799439011' } },
        limit: 11 // +1 to check if there are more results
      });
    });

    it('should handle null cursor', () => {
      const query = {
        where: { status: 'active' }
      };
      const cursorPagination = {
        cursor: null,
        limit: 10,
        hasMore: false
      };
      
      const result = applyCursorPagination(query, cursorPagination, '_id');
      
      expect(result).toEqual({
        where: { status: 'active' },
        limit: 11
      });
    });

    it('should handle custom sort field', () => {
      const query = {
        where: { status: 'active' }
      };
      const cursorPagination = {
        cursor: '507f1f77bcf86cd799439011',
        limit: 10,
        hasMore: false
      };
      
      const result = applyCursorPagination(query, cursorPagination, 'createdAt');
      
      expect(result).toEqual({
        where: { status: 'active', createdAt: { $gt: '507f1f77bcf86cd799439011' } },
        limit: 11
      });
    });
  });

  describe('processCursorResults', () => {
    it('should process cursor results', () => {
      const results = [
        { _id: '507f1f77bcf86cd799439011', name: 'Item 1' },
        { _id: '507f1f77bcf86cd799439012', name: 'Item 2' },
        { _id: '507f1f77bcf86cd799439013', name: 'Item 3' }
      ];
      const limit = 2;
      
      const result = processCursorResults(results, limit);
      
      expect(result.data).toEqual([
        { _id: '507f1f77bcf86cd799439011', name: 'Item 1' },
        { _id: '507f1f77bcf86cd799439012', name: 'Item 2' }
      ]);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('507f1f77bcf86cd799439012');
    });

    it('should handle exact limit', () => {
      const results = [
        { _id: '507f1f77bcf86cd799439011', name: 'Item 1' },
        { _id: '507f1f77bcf86cd799439012', name: 'Item 2' }
      ];
      const limit = 2;
      
      const result = processCursorResults(results, limit);
      
      expect(result.data).toEqual([
        { _id: '507f1f77bcf86cd799439011', name: 'Item 1' },
        { _id: '507f1f77bcf86cd799439012', name: 'Item 2' }
      ]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle empty results', () => {
      const results = [];
      const limit = 2;
      
      const result = processCursorResults(results, limit);
      
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle single result', () => {
      const results = [
        { _id: '507f1f77bcf86cd799439011', name: 'Item 1' }
      ];
      const limit = 2;
      
      const result = processCursorResults(results, limit);
      
      expect(result.data).toEqual([
        { _id: '507f1f77bcf86cd799439011', name: 'Item 1' }
      ]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('buildPaginationResponse', () => {
    it('should build pagination response', () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/api/test',
        query: { filter: 'active' }
      };
      const data = [1, 2, 3];
      const total = 95;
      const pagination = {
        page: 2,
        limit: 10
      };
      
      const result = buildPaginationResponse(req, data, total, pagination);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.requestId).toBeDefined();
      expect(result.meta.pagination).toBeDefined();
      expect(result.meta.pagination.page).toBe(2);
      expect(result.meta.pagination.limit).toBe(10);
      expect(result.meta.pagination.total).toBe(95);
      expect(result.meta.pagination.totalPages).toBe(10);
      expect(result.meta.pagination.hasNext).toBe(true);
      expect(result.meta.pagination.hasPrev).toBe(true);
      expect(result.meta.pagination.nextPage).toBe(3);
      expect(result.meta.pagination.prevPage).toBe(1);
      expect(result.meta.links).toBeDefined();
      expect(result.meta.links.self).toBe('https://example.com/api/test?filter=active&page=2');
      expect(result.meta.links.first).toBe('https://example.com/api/test?filter=active&page=1');
      expect(result.meta.links.last).toBe('https://example.com/api/test?filter=active&page=10');
      expect(result.meta.links.prev).toBe('https://example.com/api/test?filter=active&page=1');
      expect(result.meta.links.next).toBe('https://example.com/api/test?filter=active&page=3');
    });

    it('should handle data with pagination property', () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/api/test',
        query: {}
      };
      const data = {
        data: [1, 2, 3],
        pagination: {
          page: 2,
          limit: 10,
          total: 95
        }
      };
      
      const result = buildPaginationResponse(req, data, 95);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.meta.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 95,
        totalPages: 10,
        hasNext: true,
        hasPrev: true,
        nextPage: 3,
        prevPage: 1
      });
    });

    it('should handle additional meta', () => {
      const req = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com'),
        originalUrl: '/api/test',
        query: {}
      };
      const data = [1, 2, 3];
      const total = 95;
      const pagination = {
        page: 2,
        limit: 10
      };
      const additionalMeta = {
        version: '1.0.0',
        cache: 'miss'
      };
      
      const result = buildPaginationResponse(req, data, total, pagination, additionalMeta);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.meta.version).toBe('1.0.0');
      expect(result.meta.cache).toBe('miss');
      expect(result.meta.pagination).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large page numbers', () => {
      const page = 1000000;
      const limit = 10;
      
      const result = buildPagination(page, limit);
      
      expect(result.page).toBe(1000000);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(9999990); // (1000000-1) * 10
    });

    it('should handle very large limit', () => {
      const page = 1;
      const limit = 100;
      
      const result = buildPagination(page, limit);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(result.skip).toBe(0);
    });

    it('should handle negative page numbers', () => {
      const page = -1;
      
      expect(() => {
        buildPagination(page);
      }).toThrow('Page must be greater than 0');
    });

    it('should handle negative limit', () => {
      const limit = -1;
      
      expect(() => {
        buildPagination(1, limit);
      }).toThrow('Limit must be between 1 and 100');
    });

    it('should handle floating point numbers', () => {
      const page = 2.5;
      const limit = 10.5;
      
      const result = buildPagination(page, limit);
      
      expect(result.page).toBe(2); // parseInt(2.5)
      expect(result.limit).toBe(10); // parseInt(10.5)
      expect(result.skip).toBe(10); // (2-1) * 10
    });

    it('should handle string numbers', () => {
      const page = '2';
      const limit = '10';
      
      const result = buildPagination(page, limit);
      
      expect(result.page).toBe(2); // parseInt('2')
      expect(result.limit).toBe(10); // parseInt('10')
      expect(result.skip).toBe(10); // (2-1) * 10
    });

    it('should handle non-numeric strings', () => {
      const page = 'abc';
      const limit = 'xyz';
      
      const result = buildPagination(page, limit);
      
      expect(result.page).toBeNaN(); // parseInt('abc')
      expect(result.limit).toBeNaN(); // parseInt('xyz')
      expect(result.skip).toBeNaN(); // (NaN-1) * NaN
    });
  });
});