import express from 'express';
import {
  getAllRoles,
  getRoleStatistics,
  getUsersByRole,
  assignRole,
  grantPermissions,
  revokePermissions,
  getRoleHistory,
  getUserPermissions,
  getPermissionCategories,
  batchAssignRoles,
} from '../controllers/roleManagement.controller.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
  fetchTargetUser,
  preventRoleEscalation,
  canReadUsers,
  canUpdateUser,
  canViewSystemConfig,
  requireAdmin,
  requireManager,
} from '../middleware/roleManagement.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/roles - Get all available roles (authenticated users)
router.get('/', getAllRoles);

// GET /api/roles/statistics - Get role statistics (admin and above)
router.get('/statistics', requireAdmin, getRoleStatistics);

// GET /api/roles/categories - Get permission categories (authenticated users)
router.get('/categories', getPermissionCategories);

// GET /api/roles/:role/users - Get users by specific role (manager and above)
router.get('/:role/users', requireManager, getUsersByRole);

// GET /api/roles/users/:userId/permissions - Get user permissions (admin and above or self)
router.get(
  '/users/:userId/permissions',
  requirePermission('user_management', 'read'),
  getUserPermissions
);

// GET /api/roles/users/:userId/history - Get role history for a user (admin and above)
router.get(
  '/users/:userId/history',
  requirePermission('user_management', 'read'),
  getRoleHistory
);

// POST /api/roles/users/:userId/assign - Assign new role to user (admin and above)
router.post(
  '/users/:userId/assign',
  requirePermission('user_management', 'update'),
  fetchTargetUser('userId'),
  preventRoleEscalation,
  assignRole
);

// POST /api/roles/users/:userId/permissions/grant - Grant permissions to user (admin and above)
router.post(
  '/users/:userId/permissions/grant',
  requirePermission('user_management', 'update'),
  fetchTargetUser('userId'),
  grantPermissions
);

// POST /api/roles/users/:userId/permissions/revoke - Revoke permissions from user (admin and above)
router.post(
  '/users/:userId/permissions/revoke',
  requirePermission('user_management', 'update'),
  fetchTargetUser('userId'),
  revokePermissions
);

// POST /api/roles/batch-assign - Batch assign roles to multiple users (admin and above)
router.post(
  '/batch-assign',
  requirePermission('user_management', 'update'),
  batchAssignRoles
);

export default router;
