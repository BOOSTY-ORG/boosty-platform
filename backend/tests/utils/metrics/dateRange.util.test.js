import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  parseDateRange,
  validateDateRange,
  formatDateForDisplay,
  formatDateTimeForDisplay,
  getPeriodStart,
  getPeriodEnd,
  addPeriods,
  subtractPeriods,
  getDaysBetween,
  getBusinessDaysBetween,
  isDateInRanges,
  getDateRangePresets,
  formatDuration,
  getRelativeTime
} from '../../../src/utils/metrics/dateRange.util.js';

describe('Date Range Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('parseDateRange', () => {
    it('should parse date range with startDate and endDate', () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      const query = { startDate, endDate };
      const result = parseDateRange(query);
      
      expect(result.startDate).toEqual(new Date(startDate));
      expect(result.endDate).toEqual(new Date(endDate));
    });

    it('should parse preset date ranges', () => {
      const query = { dateRange: 'last_30_days' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(now);
    });

    it('should return default date range when no parameters provided', () => {
      const query = {};
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(now);
    });

    it('should handle today preset correctly', () => {
      const query = { dateRange: 'today' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now);
      expectedStartDate.setHours(0, 0, 0, 0);
      
      const expectedEndDate = new Date(now);
      expectedEndDate.setHours(23, 59, 59, 999);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(expectedEndDate);
    });

    it('should handle yesterday preset correctly', () => {
      const query = { dateRange: 'yesterday' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      
      const expectedStartDate = new Date(yesterday);
      expectedStartDate.setHours(0, 0, 0, 0);
      
      const expectedEndDate = new Date(yesterday);
      expectedEndDate.setHours(23, 59, 59, 999);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(expectedEndDate);
    });

    it('should handle this_month preset correctly', () => {
      const query = { dateRange: 'this_month' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(now);
    });

    it('should handle last_month preset correctly', () => {
      const query = { dateRange: 'last_month' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const expectedEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(expectedEndDate);
    });

    it('should handle this_year preset correctly', () => {
      const query = { dateRange: 'this_year' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now.getFullYear(), 0, 1);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(now);
    });

    it('should handle last_year preset correctly', () => {
      const query = { dateRange: 'last_year' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now.getFullYear() - 1, 0, 1);
      const expectedEndDate = new Date(now.getFullYear() - 1, 11, 31);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(expectedEndDate);
    });

    it('should return default for invalid preset', () => {
      const query = { dateRange: 'invalid_preset' };
      const result = parseDateRange(query);
      
      const now = new Date();
      const expectedStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(now);
    });
  });

  describe('validateDateRange', () => {
    it('should validate valid date range', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = validateDateRange(startDate, endDate);
      
      expect(result).toBe(true);
    });

    it('should throw error for invalid date range (start > end)', () => {
      const startDate = new Date('2023-01-31');
      const endDate = new Date('2023-01-01');
      
      expect(() => {
        validateDateRange(startDate, endDate);
      }).toThrow('Start date cannot be after end date');
    });

    it('should throw error for date range exceeding 365 days', () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2023-01-02'); // 367 days
      
      expect(() => {
        validateDateRange(startDate, endDate);
      }).toThrow('Date range cannot exceed 365 days');
    });

    it('should validate exactly 365 days', () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2023-01-01'); // 365 days
      
      const result = validateDateRange(startDate, endDate);
      
      expect(result).toBe(true);
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date for display', () => {
      const date = new Date('2023-01-15');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('Jan 15, 2023');
    });

    it('should handle different date formats', () => {
      const date = new Date('2023-12-25');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('Dec 25, 2023');
    });
  });

  describe('formatDateTimeForDisplay', () => {
    it('should format date and time for display', () => {
      const date = new Date('2023-01-15T14:30:00');
      const result = formatDateTimeForDisplay(date);
      
      expect(result).toBe('Jan 15, 2023, 2:30 PM');
    });

    it('should handle different date and time formats', () => {
      const date = new Date('2023-12-25T09:15:30');
      const result = formatDateTimeForDisplay(date);
      
      expect(result).toBe('Dec 25, 2023, 9:15 AM');
    });
  });

  describe('getPeriodStart', () => {
    it('should get start of day period', () => {
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodStart('day', date);
      
      const expected = new Date('2023-01-15T00:00:00');
      expect(result).toEqual(expected);
    });

    it('should get start of week period', () => {
      // Sunday, January 15, 2023
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodStart('week', date);
      
      const expected = new Date('2023-01-15T00:00:00');
      expect(result).toEqual(expected);
    });

    it('should get start of month period', () => {
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodStart('month', date);
      
      const expected = new Date('2023-01-01T00:00:00');
      expect(result).toEqual(expected);
    });

    it('should get start of quarter period', () => {
      const date = new Date('2023-02-15T14:30:00');
      const result = getPeriodStart('quarter', date);
      
      const expected = new Date('2023-01-01T00:00:00');
      expect(result).toEqual(expected);
    });

    it('should get start of year period', () => {
      const date = new Date('2023-06-15T14:30:00');
      const result = getPeriodStart('year', date);
      
      const expected = new Date('2023-01-01T00:00:00');
      expect(result).toEqual(expected);
    });

    it('should return current date for invalid period', () => {
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodStart('invalid', date);
      
      const expected = new Date('2023-01-15T00:00:00');
      expect(result).toEqual(expected);
    });
  });

  describe('getPeriodEnd', () => {
    it('should get end of day period', () => {
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodEnd('day', date);
      
      const expected = new Date('2023-01-15T23:59:59.999');
      expect(result).toEqual(expected);
    });

    it('should get end of week period', () => {
      // Sunday, January 15, 2023
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodEnd('week', date);
      
      const expected = new Date('2023-01-21T23:59:59.999');
      expect(result).toEqual(expected);
    });

    it('should get end of month period', () => {
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodEnd('month', date);
      
      const expected = new Date('2023-01-31T23:59:59.999');
      expect(result).toEqual(expected);
    });

    it('should get end of quarter period', () => {
      const date = new Date('2023-02-15T14:30:00');
      const result = getPeriodEnd('quarter', date);
      
      const expected = new Date('2023-03-31T23:59:59.999');
      expect(result).toEqual(expected);
    });

    it('should get end of year period', () => {
      const date = new Date('2023-06-15T14:30:00');
      const result = getPeriodEnd('year', date);
      
      const expected = new Date('2023-12-31T23:59:59.999');
      expect(result).toEqual(expected);
    });

    it('should return current date for invalid period', () => {
      const date = new Date('2023-01-15T14:30:00');
      const result = getPeriodEnd('invalid', date);
      
      const expected = new Date('2023-01-15T23:59:59.999');
      expect(result).toEqual(expected);
    });
  });

  describe('addPeriods', () => {
    it('should add days to date', () => {
      const date = new Date('2023-01-15');
      const result = addPeriods(date, 5, 'days');
      
      const expected = new Date('2023-01-20');
      expect(result).toEqual(expected);
    });

    it('should add weeks to date', () => {
      const date = new Date('2023-01-15');
      const result = addPeriods(date, 2, 'weeks');
      
      const expected = new Date('2023-01-29');
      expect(result).toEqual(expected);
    });

    it('should add months to date', () => {
      const date = new Date('2023-01-15');
      const result = addPeriods(date, 3, 'months');
      
      const expected = new Date('2023-04-15');
      expect(result).toEqual(expected);
    });

    it('should add years to date', () => {
      const date = new Date('2023-01-15');
      const result = addPeriods(date, 2, 'years');
      
      const expected = new Date('2025-01-15');
      expect(result).toEqual(expected);
    });

    it('should handle negative periods', () => {
      const date = new Date('2023-01-15');
      const result = addPeriods(date, -5, 'days');
      
      const expected = new Date('2023-01-10');
      expect(result).toEqual(expected);
    });

    it('should return original date for invalid period type', () => {
      const date = new Date('2023-01-15');
      const result = addPeriods(date, 5, 'invalid');
      
      expect(result).toEqual(date);
    });
  });

  describe('subtractPeriods', () => {
    it('should subtract days from date', () => {
      const date = new Date('2023-01-15');
      const result = subtractPeriods(date, 5, 'days');
      
      const expected = new Date('2023-01-10');
      expect(result).toEqual(expected);
    });

    it('should subtract weeks from date', () => {
      const date = new Date('2023-01-15');
      const result = subtractPeriods(date, 2, 'weeks');
      
      const expected = new Date('2023-01-01');
      expect(result).toEqual(expected);
    });

    it('should subtract months from date', () => {
      const date = new Date('2023-01-15');
      const result = subtractPeriods(date, 3, 'months');
      
      const expected = new Date('2022-10-15');
      expect(result).toEqual(expected);
    });

    it('should subtract years from date', () => {
      const date = new Date('2023-01-15');
      const result = subtractPeriods(date, 2, 'years');
      
      const expected = new Date('2021-01-15');
      expect(result).toEqual(expected);
    });

    it('should handle negative periods', () => {
      const date = new Date('2023-01-15');
      const result = subtractPeriods(date, -5, 'days');
      
      const expected = new Date('2023-01-20');
      expect(result).toEqual(expected);
    });

    it('should return original date for invalid period type', () => {
      const date = new Date('2023-01-15');
      const result = subtractPeriods(date, 5, 'invalid');
      
      expect(result).toEqual(date);
    });
  });

  describe('getDaysBetween', () => {
    it('should calculate days between dates', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const result = getDaysBetween(startDate, endDate);
      
      expect(result).toBe(30);
    });

    it('should handle same day', () => {
      const startDate = new Date('2023-01-15');
      const endDate = new Date('2023-01-15');
      
      const result = getDaysBetween(startDate, endDate);
      
      expect(result).toBe(0);
    });

    it('should handle negative days', () => {
      const startDate = new Date('2023-01-31');
      const endDate = new Date('2023-01-01');
      
      const result = getDaysBetween(startDate, endDate);
      
      expect(result).toBe(-30);
    });
  });

  describe('getBusinessDaysBetween', () => {
    it('should calculate business days between dates', () => {
      // Monday, January 2, 2023 to Friday, January 6, 2023
      const startDate = new Date('2023-01-02');
      const endDate = new Date('2023-01-06');
      
      const result = getBusinessDaysBetween(startDate, endDate);
      
      expect(result).toBe(5); // Mon, Tue, Wed, Thu, Fri
    });

    it('should exclude weekends', () => {
      // Saturday, January 7, 2023 to Sunday, January 8, 2023
      const startDate = new Date('2023-01-07');
      const endDate = new Date('2023-01-08');
      
      const result = getBusinessDaysBetween(startDate, endDate);
      
      expect(result).toBe(0); // Sat, Sun
    });

    it('should handle mixed weekdays and weekends', () => {
      // Thursday, January 5, 2023 to Wednesday, January 11, 2023
      const startDate = new Date('2023-01-05');
      const endDate = new Date('2023-01-11');
      
      const result = getBusinessDaysBetween(startDate, endDate);
      
      expect(result).toBe(5); // Thu, Fri, Mon, Tue, Wed
    });
  });

  describe('isDateInRanges', () => {
    it('should check if date is in ranges', () => {
      const date = new Date('2023-01-15');
      const ranges = [
        { start: new Date('2023-01-01'), end: new Date('2023-01-10') },
        { start: new Date('2023-01-20'), end: new Date('2023-01-30') }
      ];
      
      const result = isDateInRanges(date, ranges);
      
      expect(result).toBe(false);
    });

    it('should return true if date is in any range', () => {
      const date = new Date('2023-01-05');
      const ranges = [
        { start: new Date('2023-01-01'), end: new Date('2023-01-10') },
        { start: new Date('2023-01-20'), end: new Date('2023-01-30') }
      ];
      
      const result = isDateInRanges(date, ranges);
      
      expect(result).toBe(true);
    });

    it('should handle empty ranges', () => {
      const date = new Date('2023-01-15');
      const ranges = [];
      
      const result = isDateInRanges(date, ranges);
      
      expect(result).toBe(false);
    });

    it('should handle edge cases', () => {
      const date = new Date('2023-01-01');
      const ranges = [
        { start: new Date('2023-01-01'), end: new Date('2023-01-01') }
      ];
      
      const result = isDateInRanges(date, ranges);
      
      expect(result).toBe(true);
    });
  });

  describe('getDateRangePresets', () => {
    it('should return date range presets', () => {
      const now = new Date('2023-01-15T12:00:00');
      
      // Mock Date.now to return a fixed time
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => now.getTime());
      
      try {
        const presets = getDateRangePresets();
        
        expect(presets).toHaveLength(8);
        
        // Verify today preset
        const todayPreset = presets.find(p => p.value === 'today');
        expect(todayPreset).toBeDefined();
        expect(todayPreset.label).toBe('Today');
        expect(todayPreset.startDate).toEqual(new Date('2023-01-15T00:00:00'));
        expect(todayPreset.endDate).toEqual(new Date('2023-01-15T23:59:59.999'));
        
        // Verify yesterday preset
        const yesterdayPreset = presets.find(p => p.value === 'yesterday');
        expect(yesterdayPreset).toBeDefined();
        expect(yesterdayPreset.label).toBe('Yesterday');
        expect(yesterdayPreset.startDate).toEqual(new Date('2023-01-14T00:00:00'));
        expect(yesterdayPreset.endDate).toEqual(new Date('2023-01-14T23:59:59.999'));
        
        // Verify last_7_days preset
        const last7DaysPreset = presets.find(p => p.value === 'last_7_days');
        expect(last7DaysPreset).toBeDefined();
        expect(last7DaysPreset.label).toBe('Last 7 Days');
        expect(last7DaysPreset.startDate).toEqual(new Date('2023-01-08T12:00:00'));
        expect(last7DaysPreset.endDate).toEqual(now);
        
        // Verify this_month preset
        const thisMonthPreset = presets.find(p => p.value === 'this_month');
        expect(thisMonthPreset).toBeDefined();
        expect(thisMonthPreset.label).toBe('This Month');
        expect(thisMonthPreset.startDate).toEqual(new Date('2023-01-01T00:00:00'));
        expect(thisMonthPreset.endDate).toEqual(now);
        
        // Verify last_month preset
        const lastMonthPreset = presets.find(p => p.value === 'last_month');
        expect(lastMonthPreset).toBeDefined();
        expect(lastMonthPreset.label).toBe('Last Month');
        expect(lastMonthPreset.startDate).toEqual(new Date('2022-12-01T00:00:00'));
        expect(lastMonthPreset.endDate).toEqual(new Date('2022-12-31T23:59:59.999'));
        
        // Verify this_year preset
        const thisYearPreset = presets.find(p => p.value === 'this_year');
        expect(thisYearPreset).toBeDefined();
        expect(thisYearPreset.label).toBe('This Year');
        expect(thisYearPreset.startDate).toEqual(new Date('2023-01-01T00:00:00'));
        expect(thisYearPreset.endDate).toEqual(now);
        
        // Verify last_year preset
        const lastYearPreset = presets.find(p => p.value === 'last_year');
        expect(lastYearPreset).toBeDefined();
        expect(lastYearPreset.label).toBe('Last Year');
        expect(lastYearPreset.startDate).toEqual(new Date('2022-01-01T00:00:00'));
        expect(lastYearPreset.endDate).toEqual(new Date('2022-12-31T23:59:59.999'));
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });
  });

  describe('formatDuration', () => {
    it('should format duration in days', () => {
      const milliseconds = 5 * 24 * 60 * 60 * 1000; // 5 days
      
      const result = formatDuration(milliseconds);
      
      expect(result).toBe('5 days');
    });

    it('should format duration in hours', () => {
      const milliseconds = 3 * 60 * 60 * 1000; // 3 hours
      
      const result = formatDuration(milliseconds);
      
      expect(result).toBe('3 hours');
    });

    it('should format duration in minutes', () => {
      const milliseconds = 45 * 60 * 1000; // 45 minutes
      
      const result = formatDuration(milliseconds);
      
      expect(result).toBe('45 minutes');
    });

    it('should format duration in seconds', () => {
      const milliseconds = 30 * 1000; // 30 seconds
      
      const result = formatDuration(milliseconds);
      
      expect(result).toBe('30 seconds');
    });

    it('should handle pluralization correctly', () => {
      const milliseconds = 2 * 24 * 60 * 60 * 1000; // 2 days
      
      const result = formatDuration(milliseconds);
      
      expect(result).toBe('2 days');
    });

    it('should handle zero duration', () => {
      const milliseconds = 0;
      
      const result = formatDuration(milliseconds);
      
      expect(result).toBe('0 seconds');
    });
  });

  describe('getRelativeTime', () => {
    it('should format relative time in days', () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      
      const result = getRelativeTime(past);
      
      expect(result).toBe('5 days ago');
    });

    it('should format relative time in hours', () => {
      const past = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      
      const result = getRelativeTime(past);
      
      expect(result).toBe('3 hours ago');
    });

    it('should format relative time in minutes', () => {
      const past = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
      
      const result = getRelativeTime(past);
      
      expect(result).toBe('45 minutes ago');
    });

    it('should format relative time in seconds', () => {
      const past = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      
      const result = getRelativeTime(past);
      
      expect(result).toBe('30 seconds ago');
    });

    it('should handle pluralization correctly', () => {
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      
      const result = getRelativeTime(past);
      
      expect(result).toBe('2 days ago');
    });

    it('should handle zero time', () => {
      const past = new Date();
      
      const result = getRelativeTime(past);
      
      expect(result).toBe('0 seconds ago');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date strings', () => {
      const startDate = 'invalid-date';
      const endDate = '2023-01-31';
      
      const query = { startDate, endDate };
      const result = parseDateRange(query);
      
      expect(result.startDate).toBeInstanceOf(Date);
      expect(isNaN(result.startDate.getTime())).toBe(true);
      expect(result.endDate).toEqual(new Date(endDate));
    });

    it('should handle null dates', () => {
      const startDate = null;
      const endDate = '2023-01-31';
      
      const query = { startDate, endDate };
      const result = parseDateRange(query);
      
      expect(result.startDate).toBeInstanceOf(Date);
      expect(isNaN(result.startDate.getTime())).toBe(true);
      expect(result.endDate).toEqual(new Date(endDate));
    });

    it('should handle undefined dates', () => {
      const startDate = undefined;
      const endDate = '2023-01-31';
      
      const query = { startDate, endDate };
      const result = parseDateRange(query);
      
      expect(result.startDate).toBeInstanceOf(Date);
      expect(isNaN(result.startDate.getTime())).toBe(true);
      expect(result.endDate).toEqual(new Date(endDate));
    });

    it('should handle leap years', () => {
      const startDate = new Date('2020-02-28');
      const endDate = new Date('2020-03-01');
      
      const result = getDaysBetween(startDate, endDate);
      
      expect(result).toBe(2); // Feb 28, Feb 29
    });

    it('should handle date crossing year boundary', () => {
      const startDate = new Date('2022-12-31');
      const endDate = new Date('2023-01-01');
      
      const result = getDaysBetween(startDate, endDate);
      
      expect(result).toBe(1);
    });

    it('should handle date crossing month boundary', () => {
      const startDate = new Date('2023-01-31');
      const endDate = new Date('2023-02-01');
      
      const result = getDaysBetween(startDate, endDate);
      
      expect(result).toBe(1);
    });

    it('should handle date crossing week boundary', () => {
      // Sunday to Monday
      const startDate = new Date('2023-01-08');
      const endDate = new Date('2023-01-09');
      
      const result = getBusinessDaysBetween(startDate, endDate);
      
      expect(result).toBe(1); // Monday only
    });

    it('should handle date crossing multiple boundaries', () => {
      // Friday of one year to Monday of next year
      const startDate = new Date('2022-12-30');
      const endDate = new Date('2023-01-02');
      
      const result = getBusinessDaysBetween(startDate, endDate);
      
      expect(result).toBe(2); // Fri, Mon
    });
  });
});