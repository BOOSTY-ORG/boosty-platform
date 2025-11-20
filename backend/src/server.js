import app from "./express.js";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import exportScheduler from "./services/exportScheduler.service.js";

dotenv.config();

dotenv.config();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

// ** start Server **
const server = app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`);
  
  // Start export scheduler
  exportScheduler.start();
  
  // Schedule cleanup every 24 hours
  setInterval(() => {
    exportScheduler.cleanup();
  }, 24 * 60 * 60 * 1000);
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
