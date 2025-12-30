/**
 * Integration Tests for Role Management System
 *
 * This test suite covers role management service, middleware, and controllers
 * to ensure comprehensive role-based access control functionality.
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import RoleManagementService from '../src/services/roleManagement.service.js';
import {
  authenticateToken,
  requireRole,
  requirePermission,
  preventRoleEscalation,
  fetchTargetUser,
  requireOwnershipOrAdmin,
} from '../src/middleware/roleManagement.middleware.js';
import {
  getAllRoles,
  getRoleStatistics,
  assignRole,
  grantPermissions,
  revokePermissions,
  getRoleHistory,
  getUserPermissions,
} from '../src/controllers/roleManagement.controller.js';
import User from '../src/models/user.model.js';

// Mock dependencies
jest.mock('../src/helpers/logger.js');

// Test app setup
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Role management routes
  app.get('/api/roles', authenticateToken, getAllRoles);
  app.get(
    '/api/roles/statistics',
    authenticateToken,
    requireRole(['admin', 'superadmin']),
    getRoleStatistics
  );
  app.post(
    '/api/roles/users/:userId/assign',
    authenticateToken,
    requirePermission('user_management', 'update'),
    fetchTargetUser('userId'),
    preventRoleEscalation,
    assignRole
  );
  app.post(
    '/api/roles/users/:userId/permissions/grant',
    authenticateToken,
    requirePermission('user_management', 'update'),
    fetchTargetUser('userId'),
    grantPermissions
  );
  app.post(
    '/api/roles/users/:userId/permissions/revoke',
    authenticateToken,
    requirePermission('user_management', 'update'),
    fetchTargetUser('userId'),
    revokePermissions
  );
  app.get(
    '/api/roles/users/:userId/history',
    authenticateToken,
    requirePermission('user_management', 'read'),
    getRoleHistory
  );
  app.get(
    '/api/roles/users/:userId/permissions',
    authenticateToken,
    requirePermission('user_management', 'read'),
    getUserPermissions
  );

  return app;
};

// Test data
const createTestUser = async (role = 'user', permissions = []) => {
  const user = new User({
    name: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: 'hashedpassword',
    role,
    permissions,
    status: 'active',
  });
  return await user.save();
};

const generateAuthToken = (user) => {
  return jwt.sign(
    { _id: user._id, email: user.email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('Role Management System Integration Tests', () => {
  let testApp;
  let superAdminUser,
    adminUser,
    managerUser,
    analystUser,
    investorUser,
    regularUser;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri =
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/boosty-test';
    await mongoose.connect(mongoUri);
    testApp = createTestApp();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});

    // Create test users with different roles
    superAdminUser = await createTestUser('superadmin');
    adminUser = await createTestUser('admin');
    managerUser = await createTestUser('manager');
    analystUser = await createTestUser('analyst');
    investorUser = await createTestUser('investor');
    regularUser = await createTestUser('user');
  });

  describe('Role Management Service', () => {
    test('should validate role hierarchy correctly', () => {
      expect(RoleManagementService.hasRole('superadmin', 'admin')).toBe(true);
      expect(RoleManagementService.hasRole('admin', 'superadmin')).toBe(false);
      expect(
        RoleManagementService.hasRole('manager', ['admin', 'manager'])
      ).toBe(true);
      expect(
        RoleManagementService.hasRole('user', ['admin', 'manager', 'analyst'])
      ).toBe(false);
    });

    test('should check permissions correctly', () => {
      expect(
        RoleManagementService.hasPermission(
          'admin',
          'user_management',
          'create'
        )
      ).toBe(true);
      expect(
        RoleManagementService.hasPermission('user', 'user_management', 'create')
      ).toBe(false);
      expect(
        RoleManagementService.hasPermission(
          'analyst',
          'analytics_access',
          'view'
        )
      ).toBe(true);
      expect(
        RoleManagementService.hasPermission(
          'investor',
          'financial_access',
          'approve'
        )
      ).toBe(false);
    });

    test('should validate role assignment permissions', () => {
      expect(
        RoleManagementService.canAssignRole('admin', 'user', 'manager')
      ).toBe(true);
      expect(
        RoleManagementService.canAssignRole('manager', 'user', 'admin')
      ).toBe(false);
      expect(
        RoleManagementService.canAssignRole('superadmin', 'admin', 'superadmin')
      ).toBe(false);
    });

    test('should get all available roles', () => {
      const roles = RoleManagementService.getAllRoles();
      expect(roles).toContain('superadmin');
      expect(roles).toContain('admin');
      expect(roles).toContain('manager');
      expect(roles).toContain('analyst');
      expect(roles).toContain('investor');
      expect(roles).toContain('user');
    });

    test('should get role permissions', () => {
      const adminPerms = RoleManagementService.getRolePermissions('admin');
      expect(adminPerms.user_management.create).toBe(true);
      expect(adminPerms.user_management.delete).toBe(true);
      expect(adminPerms.system_configuration.modify).toBe(true);

      const userPerms = RoleManagementService.getRolePermissions('user');
      expect(userPerms.user_management.create).toBe(false);
      expect(userPerms.user_management.read).toBe(false);
    });
  });

  describe('Role Management Middleware', () => {
    test('should authenticate token and attach user', async () => {
      const token = generateAuthToken(adminUser);
      const response = await request(testApp)
        .get('/api/roles')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toBeDefined();
    });

    test('should reject requests without token', async () => {
      const response = await request(testApp).get('/api/roles');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should reject invalid tokens', async () => {
      const response = await request(testApp)
        .get('/api/roles')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('should enforce role-based access', async () => {
      const adminToken = generateAuthToken(adminUser);
      const userToken = generateAuthToken(regularUser);

      // Admin should access statistics
      const adminResponse = await request(testApp)
        .get('/api/roles/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(200);

      // Regular user should be denied
      const userResponse = await request(testApp)
        .get('/api/roles/statistics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userResponse.status).toBe(403);
      expect(userResponse.body.error.code).toBe('INSUFFICIENT_ROLE');
    });

    test('should enforce permission-based access', async () => {
      const adminToken = generateAuthToken(adminUser);
      const userToken = generateAuthToken(regularUser);

      // Admin should grant permissions
      const adminResponse = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: ['analytics_access:view'] });

      expect(adminResponse.status).toBe(200);

      // Regular user should be denied
      const userResponse = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/grant`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ permissions: ['analytics_access:view'] });

      expect(userResponse.status).toBe(403);
      expect(userResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Role Assignment Operations', () => {
    test('should assign role with proper authorization', async () => {
      const adminToken = generateAuthToken(adminUser);

      const response = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'analyst', reason: 'Promoted to analyst role' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.newRole).toBe('analyst');
    });

    test('should prevent role escalation', async () => {
      const managerToken = generateAuthToken(managerUser);

      const response = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/assign`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ newRole: 'admin', reason: 'Attempting escalation' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ROLE_ESCALATION_DENIED');
    });

    test('should prevent self-role modification to higher level', async () => {
      const adminToken = generateAuthToken(adminUser);

      const response = await request(testApp)
        .post(`/api/roles/users/${adminUser._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'superadmin', reason: 'Self escalation attempt' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ROLE_ESCALATION_DENIED');
    });

    test('should maintain role history', async () => {
      const adminToken = generateAuthToken(adminUser);

      // First assignment
      await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'analyst', reason: 'First promotion' });

      // Second assignment
      await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'manager', reason: 'Second promotion' });

      // Check history
      const historyResponse = await request(testApp)
        .get(`/api/roles/users/${regularUser._id}/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.history).toHaveLength(2);
      expect(historyResponse.body.data.history[0].previousRole).toBe('user');
      expect(historyResponse.body.data.history[0].newRole).toBe('analyst');
      expect(historyResponse.body.data.history[1].previousRole).toBe('analyst');
      expect(historyResponse.body.data.history[1].newRole).toBe('manager');
    });
  });

  describe('Permission Management', () => {
    test('should grant permissions to user', async () => {
      const adminToken = generateAuthToken(adminUser);
      const permissions = ['analytics_access:view', 'analytics_access:export'];

      const response = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.grantedPermissions).toEqual(permissions);
    });

    test('should revoke permissions from user', async () => {
      const adminToken = generateAuthToken(adminUser);

      // First grant permissions
      await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: ['analytics_access:view'] });

      // Then revoke them
      const response = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: ['analytics_access:view'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.revokedPermissions).toEqual([
        'analytics_access:view',
      ]);
    });

    test('should get user permissions including role and custom permissions', async () => {
      const adminToken = generateAuthToken(adminUser);

      // Grant custom permissions
      await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: ['custom_permission:test'] });

      // Get permissions
      const response = await request(testApp)
        .get(`/api/roles/users/${regularUser._id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('user');
      expect(response.body.data.userSpecificPermissions).toContain(
        'custom_permission:test'
      );
      expect(response.body.data.effectivePermissions).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid role assignment', async () => {
      const adminToken = generateAuthToken(adminUser);

      const response = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'invalid_role' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle missing user in role assignment', async () => {
      const adminToken = generateAuthToken(adminUser);
      const fakeUserId = new mongoose.Types.ObjectId();

      const response = await request(testApp)
        .post(`/api/roles/users/${fakeUserId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'analyst' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    test('should handle invalid permission format', async () => {
      const adminToken = generateAuthToken(adminUser);

      const response = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/grant`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: ['invalid-format'] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PERMISSION_FORMAT');
    });
  });

  describe('Security Tests', () => {
    test('should prevent privilege escalation through permission grants', async () => {
      const managerToken = generateAuthToken(managerUser);

      const response = await request(testApp)
        .post(`/api/roles/users/${regularUser._id}/permissions/grant`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ permissions: ['user_management:delete'] });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should handle inactive user access attempts', async () => {
      // Create inactive user
      const inactiveUser = await createTestUser('user');
      inactiveUser.status = 'inactive';
      await inactiveUser.save();

      const token = generateAuthToken(inactiveUser);

      const response = await request(testApp)
        .get('/api/roles')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    test('should validate token expiry', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { _id: adminUser._id, email: adminUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired
      );

      const response = await request(testApp)
        .get('/api/roles')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });
});
