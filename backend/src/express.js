import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import "dotenv/config";

const app = express();

// ** Middleware **
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());

// Get current directory for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ** Database Connection **
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Mongodb connected Successfully!!!"))
  .catch((error) => console.error({ "Mongodb connection error!!!": error }));

// ** Routes **
app.use("/", userRoutes); // Mount user routes
app.use("/", authRoutes); // Mount auth routes
app.use("/metrics", metricsRoutes); // Mount metrics routes

// ** export configured App **
export default app;
