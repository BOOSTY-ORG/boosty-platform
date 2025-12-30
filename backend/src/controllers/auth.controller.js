import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import roleManagementService from '../services/roleManagement.service.js';
import encryptionService from '../services/encryption.service.js';
import auditLogService from '../services/auditLog.service.js';

dotenv.config();

const login = async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const { email, password } = req.body;
    console.log('[DEBUG] Signin attempt with email:', email);

    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('[DEBUG] JWT_SECRET is missing from environment variables');
      await auditLogService.logEvent({
        action: 'LOGIN_ATTEMPT',
        category: 'AUTHENTICATION',
        severity: 'ERROR',
        outcome: 'FAILURE',
        userId: null,
        details: {
          email,
          error: 'JWT_SECRET missing',
          clientIP,
          userAgent,
        },
      });
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Find user by email
    console.log('[DEBUG] Searching for user in database...');
    const user = await User.findOne({ email });
    console.log('[DEBUG] User found:', !!user);

    if (!user) {
      console.log('[DEBUG] User not found in database');

      // Log failed login attempt
      await auditLogService.logEvent({
        action: 'LOGIN_ATTEMPT',
        category: 'AUTHENTICATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: null,
        details: {
          email,
          error: 'User not found',
          clientIP,
          userAgent,
        },
      });

      return res.status(401).json({ error: 'User not found.' });
    }

    // Compare passwords
    console.log('[DEBUG] Comparing passwords...');
    const isMatch = await user.comparePassword(password);
    console.log('[DEBUG] Password match result:', isMatch);

    if (!isMatch) {
      console.log('[DEBUG] Passwords do not match');

      // Log failed login attempt
      await auditLogService.logEvent({
        action: 'LOGIN_ATTEMPT',
        category: 'AUTHENTICATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: user._id,
        details: {
          email,
          error: 'Invalid password',
          clientIP,
          userAgent,
        },
      });

      return res.status(401).json({ error: "Email and password don't match." });
    }

    // Get user roles and permissions
    const userRoles = await roleManagementService.getUserRoles(user._id);
    const userPermissions = await roleManagementService.getUserPermissions(
      user._id
    );

    // Generate JWT
    console.log('[DEBUG] Generating JWT token...');
    const token = jwt.sign(
      {
        _id: user._id,
        roles: userRoles,
        permissions: userPermissions,
      },
      process.env.JWT_SECRET
    );
    console.log('[DEBUG] JWT token generated successfully');

    // Set cookie and send response
    res.cookie('t', token, { expire: new Date() + 9999 });
    console.log('[DEBUG] Signin successful for user:', email);

    // Log successful login
    await auditLogService.logEvent({
      action: 'LOGIN_SUCCESS',
      category: 'AUTHENTICATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      userId: user._id,
      details: {
        email,
        clientIP,
        userAgent,
        roles: userRoles,
      },
    });

    // Prepare user response with encrypted sensitive data if needed
    const userResponse = {
      _id: user._id,
      name: encryptionService.encryptField(user.name),
      email: encryptionService.encryptField(user.email),
      roles: userRoles,
      permissions: userPermissions,
    };

    return res.json({
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('[DEBUG] Signin error:', err);
    console.error('[DEBUG] Error stack:', err.stack);

    // Log error
    await auditLogService.logEvent({
      action: 'LOGIN_ATTEMPT',
      category: 'AUTHENTICATION',
      severity: 'ERROR',
      outcome: 'FAILURE',
      userId: null,
      details: {
        email: req.body.email,
        error: err.message,
        clientIP,
        userAgent,
      },
    });

    return res.status(401).json({
      error: 'Could not sign in.',
    });
  }
};

/*
 ** User forgot password. **
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'User not found!' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.tokenExpiry = Date.now() + 3600000; // 1hr
  await user.save();

  const resetLink = `http://localhost:3000/rest-password/${token}`;

  // send email
  const transporter = nodemailer.createTransport({
    /* SMTP config */
  });
  await transporter.sendMail({
    to: user.email,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetLink}>here</a> to reset your password.</p>`,
  });

  res.json({ message: 'Reset link sent to email' });
};

// reset-password/:token
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetToken: token,
    tokenExpiry: { $gt: Date.now() },
  });

  if (!user)
    return res.status(400).json({ message: 'invalid or expired token' });

  user.password = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.tokenExpiry = undefined;
  await user.save();

  res.json({ message: 'password reset successful' });
};

const logout = async (req, res) => {
  try {
    const userId = req.auth?._id;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Clear cookie
    res.clearCookie('t');

    // Log logout event
    if (userId) {
      await auditLogService.logEvent({
        action: 'LOGOUT',
        category: 'AUTHENTICATION',
        severity: 'INFO',
        outcome: 'SUCCESS',
        userId,
        details: {
          clientIP,
          userAgent,
        },
      });
    }

    return res.status(200).json({
      message: 'Signed out successfully!',
    });
  } catch (err) {
    console.error('[DEBUG] Logout error:', err);
    return res.status(500).json({
      error: 'Could not sign out.',
    });
  }
};

const requireSignin = async (req, res, next) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const token = req.cookies.t || req.headers.authorization?.split(' ')[1];
    if (!token) {
      await auditLogService.logEvent({
        action: 'AUTHENTICATION_CHECK',
        category: 'AUTHENTICATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId: null,
        details: {
          error: 'No token provided',
          path: req.path,
          method: req.method,
          clientIP,
          userAgent,
        },
      });
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = decoded;

    // Add user roles and permissions to request
    req.auth.roles = decoded.roles || [];
    req.auth.permissions = decoded.permissions || [];

    // Log successful authentication check
    await auditLogService.logEvent({
      action: 'AUTHENTICATION_CHECK',
      category: 'AUTHENTICATION',
      severity: 'DEBUG',
      outcome: 'SUCCESS',
      userId: decoded._id,
      details: {
        path: req.path,
        method: req.method,
        clientIP,
        userAgent,
        processingTime: Date.now() - startTime,
      },
    });

    next();
  } catch (err) {
    await auditLogService.logEvent({
      action: 'AUTHENTICATION_CHECK',
      category: 'AUTHENTICATION',
      severity: 'WARN',
      outcome: 'FAILURE',
      userId: null,
      details: {
        error: err.message,
        path: req.path,
        method: req.method,
        clientIP,
        userAgent,
      },
    });
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

const hasAuthorization = async (req, res, next) => {
  try {
    const userId = req.auth?._id;
    const clientIP = req.ip || req.connection.remoteAddress;

    const authorized =
      req.profile &&
      req.auth &&
      req.profile._id.toString() === req.auth._id.toString();

    if (!authorized) {
      await auditLogService.logEvent({
        action: 'AUTHORIZATION_CHECK',
        category: 'AUTHORIZATION',
        severity: 'WARN',
        outcome: 'FAILURE',
        userId,
        details: {
          error: 'User not authorized',
          targetUserId: req.profile?._id,
          path: req.path,
          method: req.method,
          clientIP,
        },
      });
      return res.status(403).json({ error: 'User is not authorized.' });
    }

    // Log successful authorization
    await auditLogService.logEvent({
      action: 'AUTHORIZATION_CHECK',
      category: 'AUTHORIZATION',
      severity: 'DEBUG',
      outcome: 'SUCCESS',
      userId,
      details: {
        targetUserId: req.profile._id,
        path: req.path,
        method: req.method,
        clientIP,
      },
    });

    next();
  } catch (err) {
    console.error('[DEBUG] Authorization error:', err);
    return res.status(500).json({ error: 'Authorization check failed.' });
  }
};

export {
  login,
  logout,
  forgotPassword,
  resetPassword,
  requireSignin,
  hasAuthorization,
};
