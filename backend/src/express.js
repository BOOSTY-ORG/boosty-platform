import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import exportRoutes from './routes/export.routes.js';
import paymentRoutes from './routes/payment/payment.routes.js';
import payoutRoutes from './routes/payment/payout.routes.js';
import webhookRoutes from './routes/payment/webhook.routes.js';
import roiAnalyticsRoutes from './routes/roiAnalytics.routes.js';
import payoutAnalyticsRoutes from './routes/payoutAnalytics.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import notificationWebhookRoutes from './routes/notificationWebhook.routes.js';
import userNotificationPreferencesRoutes from './routes/userNotificationPreferences.routes.js';
import notificationRealtimeRoutes from './routes/notificationRealtime.routes.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Since we're using ES modules, we need to define __dirname manually
const __filename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(__filename);

const app = express();

// ** Middleware **
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(currentDirname, '../uploads')));

// ** Database Connection **
console.log(
  '[DEBUG] Attempting to connect to MongoDB with URL:',
  process.env.DATABASE_URL
);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      // Enhanced connection pooling configuration
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      maxPoolSize: 50, // Increased pool size for better concurrency
      minPoolSize: 5, // Minimum connections to maintain
      maxIdleTimeMS: 30000, // Keep connections alive for 30 seconds
      waitQueueTimeoutMS: 5000, // Wait 5 seconds before timeout
      retryWrites: true,
      w: 'majority',
      readPreference: 'secondaryPreferred', // Distribute read operations
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 10000, // 10 seconds write timeout
      },
      // Enable connection monitoring
      monitorCommands: true,
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      // Enable compression for better performance
      compressors: ['zstd', 'snappy', 'zlib'],
    });

    console.log('[DEBUG] MongoDB connected Successfully!!!');
    console.log('[DEBUG] Connection state:', mongoose.connection.readyState);
    console.log('[DEBUG] Connected to database:', conn.connection.name);

    // Set up connection monitoring
    setupConnectionMonitoring();

    return true;
  } catch (error) {
    console.error('[DEBUG] MongoDB connection error!!!:', error.message);
    console.error(
      '[DEBUG] Connection state after error:',
      mongoose.connection.readyState
    );

    // Exponential backoff retry strategy
    const retryDelay = Math.min(
      5000 * Math.pow(2, connectionRetryCount),
      30000
    );
    console.log(`[DEBUG] Retrying database connection in ${retryDelay}ms...`);
    setTimeout(() => {
      connectionRetryCount++;
      connectDB();
    }, retryDelay);

    return false;
  }
};

// Connection retry counter for exponential backoff
let connectionRetryCount = 0;

// Enhanced connection monitoring
const setupConnectionMonitoring = () => {
  // Monitor connection pool events
  mongoose.connection.on('connected', () => {
    console.log('[DEBUG] MongoDB connection established');
    connectionRetryCount = 0; // Reset retry counter on successful connection
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DEBUG] MongoDB connection error:', err);
    // Implement circuit breaker pattern
    if (connectionRetryCount >= 5) {
      console.error(
        '[DEBUG] Max connection retries reached, implementing circuit breaker'
      );
      setTimeout(() => {
        connectionRetryCount = 0; // Reset after cooldown period
        connectDB();
      }, 60000); // Wait 1 minute before retrying
    }
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DEBUG] MongoDB disconnected');
    // Attempt reconnection with exponential backoff
    const retryDelay = Math.min(
      1000 * Math.pow(2, connectionRetryCount),
      10000
    );
    setTimeout(() => {
      connectionRetryCount++;
      connectDB();
    }, retryDelay);
  });

  // Monitor connection pool health
  setInterval(() => {
    const poolStats = mongoose.connection.pool;
    if (poolStats) {
      console.log('[DEBUG] Connection Pool Stats:', {
        totalConnections: poolStats.totalConnectionCount,
        availableConnections: poolStats.readyState,
        waitingConnections: poolStats.waitingQueueLength,
      });
    }
  }, 30000); // Check every 30 seconds

  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('[DEBUG] Received SIGINT, closing database connection...');
    await mongoose.connection.close();
    console.log('[DEBUG] Database connection closed');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[DEBUG] Received SIGTERM, closing database connection...');
    await mongoose.connection.close();
    console.log('[DEBUG] Database connection closed');
    process.exit(0);
  });
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('[DEBUG] Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('[DEBUG] Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[DEBUG] Mongoose disconnected from MongoDB');
});

// Initial connection attempt
connectDB();

// ** Routes **
app.use('/api', userRoutes); // Mount user routes
app.use('/api', authRoutes); // Mount auth routes
app.use('/api/metrics', metricsRoutes); // Mount metrics routes
app.use('/api', exportRoutes); // Mount export routes
app.use('/api/payments', paymentRoutes); // Mount payment routes
app.use('/api/payouts', payoutRoutes); // Mount payout routes
app.use('/api/webhooks', webhookRoutes); // Mount payment webhook routes
app.use('/api/notifications', notificationRoutes); // Mount notification routes
app.use('/api/webhooks', notificationWebhookRoutes); // Mount notification webhook routes
app.use('/api/users', userNotificationPreferencesRoutes); // Mount user notification preferences routes
app.use('/api/notifications/realtime', notificationRealtimeRoutes); // Mount real-time notification routes
app.use('/api/roi-analytics', roiAnalyticsRoutes); // Mount ROI analytics routes
app.use('/api/payout-analytics', payoutAnalyticsRoutes); // Mount payout analytics routes

// ** export configured App **
export default app;
