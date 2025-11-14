import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';

// Currency formatter
export const currencyFormatter = (currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
};

// Format currency amount
export const formatCurrency = (amount, currency = 'NGN') => {
  if (amount === null || amount === undefined) return 'N/A';
  return currencyFormatter(currency).format(amount);
};

// Format currency without symbol
export const formatCurrencyValue = (amount, currency = 'NGN') => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
  }).format(amount);
};

// Percentage formatter
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
};

// Format decimal number
export const formatDecimal = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  return parseFloat(value).toFixed(decimals);
};

// Format number with thousands separator
export const formatNumber = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-NG').format(value);
};

// Format date
export const formatDate = (date, formatString = 'PPP') => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid Date';
    return format(dateObj, formatString);
  } catch (error) {
    return 'Invalid Date';
  }
};

// Format date with time
export const formatDateTime = (date, formatString = 'PPP p') => {
  return formatDate(date, formatString);
};

// Format time only
export const formatTime = (date, formatString = 'p') => {
  return formatDate(date, formatString);
};

// Format relative time
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid Date';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    return 'Invalid Date';
  }
};

// Format date range
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';
  
  const start = formatDate(startDate, 'MMM d, yyyy');
  const end = formatDate(endDate, 'MMM d, yyyy');
  
  return `${start} - ${end}`;
};

// Format duration
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return 'N/A';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return 'N/A';
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format phone number
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return 'N/A';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a Nigerian number
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  // Check if it's a local number without country code
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+234 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Return original if format doesn't match
  return phoneNumber;
};

// Format address
export const formatAddress = (address) => {
  if (!address || typeof address !== 'object') return 'N/A';
  
  const { street, city, state, postalCode, country } = address;
  const parts = [];
  
  if (street) parts.push(street);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (postalCode) parts.push(postalCode);
  if (country) parts.push(country);
  
  return parts.join(', ');
};

// Format full name
export const formatFullName = (firstName, lastName, middleName = '') => {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(' ') || 'N/A';
};

// Format initials
export const formatInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return 'N/A';
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${firstInitial}${lastInitial}`;
};

// Format text with ellipsis
export const formatWithEllipsis = (text, maxLength = 50) => {
  if (!text) return 'N/A';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Format capitalize
export const formatCapitalize = (str) => {
  if (!str) return 'N/A';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Format title case
export const formatTitleCase = (str) => {
  if (!str) return 'N/A';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Format camel case to title case
export const formatCamelToTitle = (str) => {
  if (!str) return 'N/A';
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

// Format snake case to title case
export const formatSnakeToTitle = (str) => {
  if (!str) return 'N/A';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

// Format kebab case to title case
export const formatKebabToTitle = (str) => {
  if (!str) return 'N/A';
  return str.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

// Format status
export const formatStatus = (status) => {
  if (!status) return 'N/A';
  
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Format role
export const formatRole = (role) => {
  if (!role) return 'N/A';
  return formatTitleCase(role);
};

// Format boolean
export const formatBoolean = (value, trueText = 'Yes', falseText = 'No') => {
  if (value === null || value === undefined) return 'N/A';
  return value ? trueText : falseText;
};

// Format list
export const formatList = (items, separator = ', ') => {
  if (!Array.isArray(items)) return 'N/A';
  return items.join(separator);
};

// Format key-value pairs
export const formatKeyValue = (obj, separator = ': ') => {
  if (!obj || typeof obj !== 'object') return 'N/A';
  
  return Object.entries(obj)
    .map(([key, value]) => `${formatCamelToTitle(key)}${separator}${value}`)
    .join(', ');
};

// Format percentage with color indicator
export const formatPercentageWithColor = (value, decimals = 2) => {
  const formatted = formatPercentage(value, decimals);
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
  const sign = value > 0 ? '+' : '';
  
  return {
    text: `${sign}${formatted}`,
    color,
    isPositive: value > 0,
    isNegative: value < 0,
    isNeutral: value === 0,
  };
};

// Format change indicator
export const formatChangeIndicator = (current, previous, decimals = 2) => {
  if (current === null || previous === null) return null;
  
  const change = current - previous;
  const percentage = previous !== 0 ? (change / previous) * 100 : 0;
  
  return {
    value: formatDecimal(change, decimals),
    percentage: formatPercentage(percentage / 100, decimals),
    isPositive: change > 0,
    isNegative: change < 0,
    isNeutral: change === 0,
  };
};

// Format table cell
export const formatTableCell = (value, type = 'text') => {
  if (value === null || value === undefined) return '—';
  
  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercentage(value);
    case 'date':
      return formatDate(value);
    case 'datetime':
      return formatDateTime(value);
    case 'boolean':
      return formatBoolean(value);
    case 'phone':
      return formatPhoneNumber(value);
    case 'filesize':
      return formatFileSize(value);
    case 'ellipsis':
      return formatWithEllipsis(value);
    default:
      return value;
  }
};

// Format chart data
export const formatChartData = (data, xKey, yKey) => {
  if (!Array.isArray(data)) return [];
  
  return data.map(item => ({
    x: item[xKey],
    y: item[yKey],
    ...item,
  }));
};

// Format API response
export const formatApiResponse = (response) => {
  if (!response) return null;
  
  // Handle different response formats
  if (response.data) return response.data;
  if (response.result) return response.result;
  if (response.items) return response.items;
  
  return response;
};

// Format error message
export const formatErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  
  if (error.response?.data?.message) return error.response.data.message;
  
  if (error.response?.data?.error) return error.response.data.error;
  
  return 'An unknown error occurred';
};

// Format pagination info
export const formatPaginationInfo = (pagination) => {
  if (!pagination) return 'No data available';
  
  const { page, limit, total } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  
  return `Showing ${start}-${end} of ${total} items`;
};