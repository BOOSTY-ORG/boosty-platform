// Date range utility functions for metrics

export const parseDateRange = (query) => {
  const { startDate, endDate, dateRange } = query;
  const now = new Date();
  
  if (dateRange) {
    const ranges = {
      today: {
        startDate: new Date(now.setHours(0, 0, 0, 0)),
        endDate: new Date(now.setHours(23, 59, 59, 999))
      },
      yesterday: {
        startDate: new Date(new Date().setDate(now.getDate() - 1).setHours(0, 0, 0, 0)),
        endDate: new Date(new Date().setDate(now.getDate() - 1).setHours(23, 59, 59, 999))
      },
      last_7_days: {
        startDate: new Date(now.setDate(now.getDate() - 7)),
        endDate: new Date()
      },
      last_30_days: {
        startDate: new Date(now.setDate(now.getDate() - 30)),
        endDate: new Date()
      },
      this_month: {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date()
      },
      last_month: {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0)
      },
      this_year: {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date()
      },
      last_year: {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31)
      }
    };
    
    return ranges[dateRange] || ranges.last_30_days;
  }
  
  if (startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };
  }
  
  // Default to last 30 days
  return {
    startDate: new Date(now.setDate(now.getDate() - 30)),
    endDate: new Date()
  };
};

export const validateDateRange = (startDate, endDate) => {
  if (startDate > endDate) {
    throw new Error('Start date cannot be after end date');
  }
  
  const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    throw new Error('Date range cannot exceed 365 days');
  }
  
  return true;
};

export const formatDateForDisplay = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTimeForDisplay = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getPeriodStart = (period, date = new Date()) => {
  const now = new Date(date);
  
  switch (period) {
    case 'day':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'week':
      const dayOfWeek = now.getDay();
      return new Date(now.setDate(now.getDate() - dayOfWeek));
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.setHours(0, 0, 0, 0));
  }
};

export const getPeriodEnd = (period, date = new Date()) => {
  const now = new Date(date);
  
  switch (period) {
    case 'day':
      return new Date(now.setHours(23, 59, 59, 999));
    case 'week':
      const dayOfWeek = now.getDay();
      return new Date(now.setDate(now.getDate() - dayOfWeek + 6));
    case 'month':
      return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    case 'year':
      return new Date(now.getFullYear(), 11, 31);
    default:
      return new Date(now.setHours(23, 59, 59, 999));
  }
};

export const addPeriods = (date, periods, periodType) => {
  const result = new Date(date);
  
  switch (periodType) {
    case 'days':
      result.setDate(result.getDate() + periods);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (periods * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + periods);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + periods);
      break;
    default:
      break;
  }
  
  return result;
};

export const subtractPeriods = (date, periods, periodType) => {
  return addPeriods(date, -periods, periodType);
};

export const getDaysBetween = (startDate, endDate) => {
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
};

export const getBusinessDaysBetween = (startDate, endDate) => {
  let businessDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
};

export const isDateInRanges = (date, ranges) => {
  const checkDate = new Date(date);
  
  for (const range of ranges) {
    const start = new Date(range.start);
    const end = new Date(range.end);
    
    if (checkDate >= start && checkDate <= end) {
      return true;
    }
  }
  
  return false;
};

export const getDateRangePresets = () => {
  const now = new Date();
  return [
    {
      value: 'today',
      label: 'Today',
      startDate: new Date(now.setHours(0, 0, 0, 0)),
      endDate: new Date(now.setHours(23, 59, 59, 999))
    },
    {
      value: 'yesterday',
      label: 'Yesterday',
      startDate: new Date(new Date().setDate(now.getDate() - 1).setHours(0, 0, 0, 0)),
      endDate: new Date(new Date().setDate(now.getDate() - 1).setHours(23, 59, 59, 999))
    },
    {
      value: 'last_7_days',
      label: 'Last 7 Days',
      startDate: new Date(now.setDate(now.getDate() - 7)),
      endDate: new Date()
    },
    {
      value: 'last_30_days',
      label: 'Last 30 Days',
      startDate: new Date(now.setDate(now.getDate() - 30)),
      endDate: new Date()
    },
    {
      value: 'this_month',
      label: 'This Month',
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date()
    },
    {
      value: 'last_month',
      label: 'Last Month',
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), 0)
    },
    {
      value: 'this_year',
      label: 'This Year',
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: new Date()
    },
    {
      value: 'last_year',
      label: 'Last Year',
      startDate: new Date(now.getFullYear() - 1, 0, 1),
      endDate: new Date(now.getFullYear() - 1, 11, 31)
    }
  ];
};

export const formatDuration = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
};

export const getRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
};