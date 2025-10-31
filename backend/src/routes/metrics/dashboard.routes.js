import express from "express";
import { dashboardAccess } from "../../middleware/metrics/auth.middleware.js";
import dashboardController from "../../controllers/metrics/dashboard.controller.js";

const router = express.Router();

// Apply dashboard-specific middleware
router.use(dashboardAccess);

// Dashboard overview metrics
router.get('/overview', dashboardController.getDashboardOverview);

// Real-time metrics
router.get('/realtime', dashboardController.getRealtimeMetrics);

export default router;