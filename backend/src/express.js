const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user.routes.js");
const authRoutes = require("./routes/auth.routes.js");
const metricsRoutes = require("./routes/metrics.routes.js");
const exportRoutes = require("./routes/export.routes.js");
const cookieParser = require("cookie-parser");
const path = require("path");
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
module.exports = app;
