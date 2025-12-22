import app from './express.js';
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import exportScheduler from './services/exportScheduler.service.js';
import socketIOService from './services/notification/socketio.service.js';
import realtimeEventHandlerService from './services/notification/realtimeEventHandler.service.js';

dotenv.config();

dotenv.config();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

// ** start Server **
const server = app.listen(port, async () => {
  console.log(`Server is running on port: http://localhost:${port}`);

  // Initialize Socket.IO for real-time notifications
  try {
    await socketIOService.initialize(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
    console.log('[DEBUG] Socket.IO service initialized successfully');
  } catch (error) {
    console.error('[ERROR] Failed to initialize Socket.IO service:', error);
  }

  // Wait for database connection before starting services
  const startServicesWhenDBReady = () => {
    if (mongoose.connection.readyState === 1) {
      // 1 means connected
      console.log('[DEBUG] Database is ready, starting services...');
      exportScheduler.start();

      // Schedule cleanup every 24 hours
      setInterval(
        () => {
          exportScheduler.cleanup();
          socketIOService.cleanupStaleConnections();
        },
        24 * 60 * 60 * 1000
      );
    } else {
      console.log(
        '[DEBUG] Waiting for database connection... Current state:',
        mongoose.connection.readyState
      );
      setTimeout(startServicesWhenDBReady, 2000); // Check every 2 seconds
    }
  };

  // Start the services check after a short delay
  setTimeout(startServicesWhenDBReady, 3000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  exportScheduler.stop();
  await socketIOService.shutdown();
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  exportScheduler.stop();
  await socketIOService.shutdown();
  server.close(() => {
    console.log('Process terminated');
  });
});
