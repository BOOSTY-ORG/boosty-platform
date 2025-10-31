import express from "express";
import { userMetricsAccess, requireOwnershipOrAdmin } from "../../middleware/metrics/auth.middleware.js";
import userController from "../../controllers/metrics/user.controller.js";

const router = express.Router();

// Apply user-specific middleware
router.use(userMetricsAccess);

// User metrics endpoints
router.get('/', userController.getUserMetrics);
router.get('/list', userController.getUserList);
router.get('/activity', userController.getUserActivityMetrics);

// Individual user endpoints
router.get('/:userId', userController.getUserDetails);

// Apply ownership check for individual user data
router.use('/:userId/*', requireOwnershipOrAdmin('userId'));

export default router;