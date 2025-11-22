import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";
import exportRoutes from "./routes/export.routes.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

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
console.log("[DEBUG] Attempting to connect to MongoDB with URL:", process.env.DATABASE_URL);
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("[DEBUG] Mongodb connected Successfully!!!");
    console.log("[DEBUG] Connection state:", mongoose.connection.readyState);
  })
  .catch((error) => {
    console.error("[DEBUG] Mongodb connection error!!!:", error);
    console.error("[DEBUG] Connection state after error:", mongoose.connection.readyState);
  });

// ** Routes **
app.use("/", userRoutes); // Mount user routes
app.use("/", authRoutes); // Mount auth routes
app.use("/metrics", metricsRoutes); // Mount metrics routes
app.use("/", exportRoutes); // Mount export routes

// ** export configured App **
export default app;
