import User from '../models/user.model.js';
import { getErrorMessage } from '../helpers/dbErrorHandler.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import roleManagementService from '../services/roleManagement.service.js';
import encryptionService from '../services/encryption.service.js';
import auditLogService from '../services/auditLog.service.js';

dotenv.config();

/*
 ** List all users. **
 */
const list = async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  try {
    const { page, limit, status, search, sortBy, sortOrder } = req.query;

    // Check if user has permission to list users
    const hasPermission =
      req.auth?.permissions?.includes('users:read') ||
      req.auth?.roles?.some((role) =>
        ['admin', 'manager', 'superadmin'].includes(role)
      );

    if (!hasPermission) {
      await auditLogService.logEvent({
        action: 'USER_LIST_ACCESS_DENIED',
        category: 'AUTHORIZATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: req.auth?._id,
        details: {
          error: 'Insufficient permissions to list users',
          clientIP,
          requestedQuery: req.query,
        },
      });

      return res.status(403).json({
        error: 'Insufficient permissions to list users.',
      });
    }

    // Build query
    let query = User.find();

    // Apply filters
    if (status) {
      query = query.where('status').equals(status);
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = query.or([
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ]);
    }

    // Apply sorting
    const sortField = sortBy || 'createdAt';
    const sortOptions = {};
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
    query = query.sort(sortOptions);

    // Apply pagination
    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    // Select fields (include more fields for export)
    const users = await query
      .select(
        'name email phone address status createdAt updatedAt applications installations communications documents'
      )
      .populate('applications', 'status createdAt solarCapacity')
      .populate('installations', 'status installedAt capacity')
      .populate('communications', 'type subject sentAt status')
      .populate('documents', 'type status uploadedAt expiresAt');

    // Encrypt sensitive data in response
    const encryptedUsers = users.map((user) => ({
      ...user.toObject(),
      email: encryptionService.encryptField(user.email),
      phone: user.phone
        ? encryptionService.encryptField(user.phone)
        : user.phone,
      address: user.address
        ? encryptionService.encryptField(JSON.stringify(user.address))
        : user.address,
    }));

    // Log successful user list access
    await auditLogService.logEvent({
      action: 'USER_LIST_ACCESSED',
      category: 'DATA_OPERATIONS',
      severity: 'INFO',
      outcome: 'SUCCESS',
      userId: req.auth._id,
      details: {
        count: users.length,
        filters: { status, search, sortBy, sortOrder },
        pagination: { page, limit },
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    res.json(encryptedUsers);
  } catch (err) {
    // Log error
    await auditLogService.logEvent({
      action: 'USER_LIST_ERROR',
      category: 'DATA_OPERATIONS',
      severity: 'ERROR',
      outcome: 'FAILURE',
      userId: req.auth?._id,
      details: {
        error: err.message,
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    return res.status(400).json({
      error: getErrorMessage(err),
    });
  }
};

/*
 ** Create a new user. **
 */
const create = async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  try {
    // Check if user has permission to create users
    const hasPermission =
      req.auth?.permissions?.includes('users:create') ||
      req.auth?.roles?.some((role) =>
        ['admin', 'manager', 'superadmin'].includes(role)
      );

    if (!hasPermission) {
      await auditLogService.logEvent({
        action: 'USER_CREATE_ACCESS_DENIED',
        category: 'AUTHORIZATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: req.auth?._id,
        details: {
          error: 'Insufficient permissions to create users',
          clientIP,
          requestedUserData: { ...req.body, password: '[REDACTED]' },
        },
      });

      return res.status(403).json({
        error: 'Insufficient permissions to create users.',
      });
    }

    // Extract role from request body or assign default
    const requestedRole = req.body.role || 'user';

    // Validate role assignment
    const isValidRole = await roleManagementService.isValidRole(requestedRole);
    if (!isValidRole) {
      await auditLogService.logEvent({
        action: 'USER_CREATE_INVALID_ROLE',
        category: 'AUTHORIZATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: req.auth?._id,
        details: {
          error: 'Invalid role assignment attempted',
          requestedRole,
          clientIP,
        },
      });

      return res.status(400).json({
        error: 'Invalid role specified.',
      });
    }

    // Create new user with encrypted sensitive data
    const userData = {
      ...req.body,
      email: encryptionService.encryptField(req.body.email),
      phone: req.body.phone
        ? encryptionService.encryptField(req.body.phone)
        : undefined,
      address: req.body.address
        ? encryptionService.encryptField(JSON.stringify(req.body.address))
        : undefined,
    };

    const user = new User(userData);
    await user.save();

    // Assign role to user
    await roleManagementService.assignRoleToUser(user._id, requestedRole);

    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing from environment variables');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Get user roles and permissions
    const userRoles = await roleManagementService.getUserRoles(user._id);
    const userPermissions = await roleManagementService.getUserPermissions(
      user._id
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: user._id,
        roles: userRoles,
        permissions: userPermissions,
      },
      process.env.JWT_SECRET
    );

    // Set cookie
    res.cookie('t', token, { expire: new Date() + 9999 });

    // Log successful user creation
    await auditLogService.logEvent({
      action: 'USER_CREATED',
      category: 'DATA_OPERATIONS',
      severity: 'INFO',
      outcome: 'SUCCESS',
      userId: req.auth._id,
      targetUserId: user._id,
      details: {
        userEmail: req.body.email,
        userRole: requestedRole,
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    // Return token and user data with encrypted sensitive fields
    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: encryptionService.encryptField(user.email),
        roles: userRoles,
        permissions: userPermissions,
      },
    });
  } catch (err) {
    // Log error
    await auditLogService.logEvent({
      action: 'USER_CREATE_ERROR',
      category: 'DATA_OPERATIONS',
      severity: 'ERROR',
      outcome: 'FAILURE',
      userId: req.auth?._id,
      details: {
        error: err.message,
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    return res.status(400).json({
      error: getErrorMessage(err),
    });
  }
};

/*
 ** Load a user by ID and attach it to the request object. **
 */
const userByID = async (req, res, next, id) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }
    req.profile = user;
    next();
  } catch (err) {
    return res.status(400).json({
      error: 'Could not retrieve user',
    });
  }
};

/*
 ** Read (fetch) a single user. **
 */
const read = (req, res) => {
  // `req.profile` is populated by `userByID` middleware
  return res.json(req.profile);
};

/*
 ** Update a user. **
 */
const update = async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  try {
    const user = req.profile; // The existing user document
    const targetUserId = user._id;
    const currentUserId = req.auth._id;

    // Check if user has permission to update users (either own profile or admin)
    const isOwnProfile = targetUserId.toString() === currentUserId.toString();
    const hasPermission =
      req.auth?.permissions?.includes('users:update') ||
      req.auth?.roles?.some((role) =>
        ['admin', 'manager', 'superadmin'].includes(role)
      );

    if (!isOwnProfile && !hasPermission) {
      await auditLogService.logEvent({
        action: 'USER_UPDATE_ACCESS_DENIED',
        category: 'AUTHORIZATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: currentUserId,
        targetUserId,
        details: {
          error: 'Insufficient permissions to update user',
          clientIP,
          requestedUpdates: { ...req.body, password: '[REDACTED]' },
        },
      });

      return res.status(403).json({
        error: 'Insufficient permissions to update this user.',
      });
    }

    // Log original user data for audit
    const originalData = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
    };

    // Update user properties from the request body
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) {
      // Encrypt new email
      user.email = encryptionService.encryptField(req.body.email);
    }
    if (req.body.phone) {
      // Encrypt new phone
      user.phone = encryptionService.encryptField(req.body.phone);
    }
    if (req.body.address) {
      // Encrypt new address
      user.address = encryptionService.encryptField(
        JSON.stringify(req.body.address)
      );
    }

    // Handle role changes (admin only)
    if (req.body.role && hasPermission && !isOwnProfile) {
      const isValidRole = await roleManagementService.isValidRole(
        req.body.role
      );
      if (!isValidRole) {
        await auditLogService.logEvent({
          action: 'USER_UPDATE_INVALID_ROLE',
          category: 'AUTHORIZATION',
          severity: 'WARN',
          outcome: 'FAILURE',
          userId: currentUserId,
          targetUserId,
          details: {
            error: 'Invalid role assignment attempted',
            requestedRole: req.body.role,
            clientIP,
          },
        });

        return res.status(400).json({
          error: 'Invalid role specified.',
        });
      }

      await roleManagementService.updateUserRole(targetUserId, req.body.role);
    }

    await user.save(); // Mongoose tracking and saving changes

    // Get updated user roles and permissions
    const updatedRoles = await roleManagementService.getUserRoles(targetUserId);
    const updatedPermissions =
      await roleManagementService.getUserPermissions(targetUserId);

    // Log successful user update
    await auditLogService.logEvent({
      action: 'USER_UPDATED',
      category: 'DATA_OPERATIONS',
      severity: 'INFO',
      outcome: 'SUCCESS',
      userId: currentUserId,
      targetUserId,
      details: {
        originalData,
        updatedData: {
          name: user.name,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          role: req.body.role,
        },
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    // Prepare response with encrypted sensitive data
    const userResponse = {
      ...user.toObject(),
      email: encryptionService.encryptField(user.email),
      phone: user.phone
        ? encryptionService.encryptField(user.phone)
        : user.phone,
      address: user.address
        ? encryptionService.encryptField(user.address)
        : user.address,
      roles: updatedRoles,
      permissions: updatedPermissions,
    };

    res.json(userResponse);
  } catch (err) {
    // Log error
    await auditLogService.logEvent({
      action: 'USER_UPDATE_ERROR',
      category: 'DATA_OPERATIONS',
      severity: 'ERROR',
      outcome: 'FAILURE',
      userId: req.auth?._id,
      targetUserId: req.profile?._id,
      details: {
        error: err.message,
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    return res.status(400).json({
      error: getErrorMessage(err),
    });
  }
};

/*
 ** Delete a user. **
 */
const remove = async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  try {
    const user = req.profile;
    const targetUserId = user._id;
    const currentUserId = req.auth._id;

    // Check if user has permission to delete users (admin only)
    const hasPermission =
      req.auth?.permissions?.includes('users:delete') ||
      req.auth?.roles?.some((role) => ['admin', 'superadmin'].includes(role));

    if (!hasPermission) {
      await auditLogService.logEvent({
        action: 'USER_DELETE_ACCESS_DENIED',
        category: 'AUTHORIZATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: currentUserId,
        targetUserId,
        details: {
          error: 'Insufficient permissions to delete user',
          clientIP,
        },
      });

      return res.status(403).json({
        error: 'Insufficient permissions to delete users.',
      });
    }

    // Log user data before deletion for audit
    const userDataForAudit = {
      _id: user._id,
      name: user.name,
      email: encryptionService.encryptField(user.email),
      createdAt: user.createdAt,
      roles: await roleManagementService.getUserRoles(targetUserId),
    };

    // Remove user roles before deleting user
    await roleManagementService.removeAllRolesFromUser(targetUserId);

    const deletedUser = await user.deleteOne();

    // Log successful user deletion
    await auditLogService.logEvent({
      action: 'USER_DELETED',
      category: 'DATA_OPERATIONS',
      severity: 'WARN',
      outcome: 'SUCCESS',
      userId: currentUserId,
      targetUserId,
      details: {
        deletedUserData: userDataForAudit,
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        _id: deletedUser._id,
        name: userDataForAudit.name,
      },
    });
  } catch (err) {
    // Log error
    await auditLogService.logEvent({
      action: 'USER_DELETE_ERROR',
      category: 'DATA_OPERATIONS',
      severity: 'ERROR',
      outcome: 'FAILURE',
      userId: req.auth?._id,
      targetUserId: req.profile?._id,
      details: {
        error: err.message,
        clientIP,
        processingTime: Date.now() - startTime,
      },
    });

    return res.status(400).json({
      error: getErrorMessage(err),
    });
  }
};

export { list, create, userByID, read, update, remove };
