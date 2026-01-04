import express from 'express';
import * as userCtrl from '../controllers/user.controller.js';
import * as authCtrl from '../controllers/auth.controller.js';
import { auditLogMiddleware } from '../middleware/auditLog.middleware.js';
import { authorize } from '../middleware/roleManagement.middleware.js';
import encryptionMiddleware from '../middleware/encryption.middleware.js';

const router = express.Router();

// Apply audit logging to all user routes
router.use(auditLogMiddleware);

// Route for listing all users and creating a new user
router
  .route('/users')
  .get(authCtrl.requireSignin, userCtrl.list) // list users
  .post(authCtrl.requireSignin, userCtrl.create); // create user

// Routes for fetching, updating, and deleting a single user
router
  .route('/users/:userId')
  .get(authCtrl.requireSignin, authorize('users:read'), userCtrl.read) // read profile
  .put(
    authCtrl.requireSignin,
    authorize('users:update'),
    encryptionMiddleware.encryptRequest('user'),
    encryptionMiddleware.decryptResponse('user'),
    userCtrl.update
  ) // update profile
  .patch(
    authCtrl.requireSignin,
    authorize('users:update'),
    encryptionMiddleware.encryptRequest('user'),
    encryptionMiddleware.decryptResponse('user'),
    userCtrl.update
  ) // update profile
  .delete(authCtrl.requireSignin, authorize('users:delete'), userCtrl.remove); // delete profile

// Routes to reset user password
router
  .post('/forgot-password', authCtrl.forgotPassword)
  .post('/reset-password/:token', authCtrl.resetPassword);

// Load user
router.param('userId', userCtrl.userByID);

export default router;
