import app from "./express.js";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import exportScheduler from "./services/exportScheduler.service.js";

dotenv.config();

dotenv.config();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

// ** start Server **
const server = app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`);
  
  // Wait for database connection before starting export scheduler
  const startSchedulerWhenDBReady = () => {
    if (mongoose.connection.readyState === 1) { // 1 means connected
      console.log("[DEBUG] Database is ready, starting export scheduler...");
      exportScheduler.start();
      
      // Schedule cleanup every 24 hours
      setInterval(() => {
        exportScheduler.cleanup();
      }, 24 * 60 * 60 * 1000);
    } else {
      console.log("[DEBUG] Waiting for database connection... Current state:", mongoose.connection.readyState);
      setTimeout(startSchedulerWhenDBReady, 2000); // Check every 2 seconds
    }
  };
  
  // Start the scheduler check after a short delay
  setTimeout(startSchedulerWhenDBReady, 3000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  exportScheduler.stop();
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  exportScheduler.stop();
  server.close(() => {
    console.log('Process terminated');
  });
});
