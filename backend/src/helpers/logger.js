// Simple logger utility for the application
// In production, this could be replaced with a more sophisticated logging solution

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const logger = {
  info: (message, ...args) => {
    if (!isTest) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },

  warn: (message, ...args) => {
    if (!isTest) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },

  error: (message, ...args) => {
    if (!isTest) {
      console.error(
        `[ERROR] ${new Date().toISOString()} - ${message}`,
        ...args
      );
    }
  },

  debug: (message, ...args) => {
    if (isDevelopment && !isTest) {
      console.debug(
        `[DEBUG] ${new Date().toISOString()} - ${message}`,
        ...args
      );
    }
  },
};

export default logger;
