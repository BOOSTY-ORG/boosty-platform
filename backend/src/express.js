import express from "express";
const cors = require("cors");
import mongoose from "mongoose";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";
import exportRoutes from "./routes/export.routes.js";
import cookieParser from "cookie-parser";
import path from "path";
require("dotenv/config");

// Since we're using CommonJS, we need to define __dirname manually
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
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Mongodb connected Successfully!!!"))
  .catch((error) => console.error({ "Mongodb connection error!!!": error }));

// ** Routes **
app.use("/", userRoutes); // Mount user routes
app.use("/", authRoutes); // Mount auth routes
app.use("/metrics", metricsRoutes); // Mount metrics routes
app.use("/", exportRoutes); // Mount export routes

// ** export configured App **
export default app;
