import express from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import { auditLogMiddleware } from '../middleware/auditLog.middleware.js';

const router = express.Router();

// Apply audit logging to authentication routes
router.use(auditLogMiddleware);

router.route('/auth/login').post(authCtrl.login);
router.route('/auth/logout').get(authCtrl.logout);

export default router;
