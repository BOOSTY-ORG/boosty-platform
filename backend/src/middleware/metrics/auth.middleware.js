import jwt from "jsonwebtoken";
import User from "../../models/user.model.js";

export const requireMetricsAuth = async (req, res, next) => {
  try {
    const token = req.cookies.t || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication token is required"
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('role email name');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid authentication token"
        }
      });
    }

    req.auth = decoded;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_ERROR",
        message: "Authentication failed"
      }
    });
  }
};

export const requireMetricsRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Insufficient permissions to access this resource"
        }
      });
    }
    next();
  };
};

export const requireAdminRole = requireMetricsRole(['admin', 'superadmin']);
export const requireManagerRole = requireMetricsRole(['admin', 'manager', 'superadmin']);
export const requireAnalystRole = requireMetricsRole(['admin', 'manager', 'analyst', 'superadmin']);
export const requireInvestorRole = requireMetricsRole(['admin', 'manager', 'analyst', 'investor', 'superadmin']);

// Role-based access control for different endpoint types
export const dashboardAccess = requireManagerRole;
export const investorMetricsAccess = requireAnalystRole;
export const userMetricsAccess = requireManagerRole;
export const transactionMetricsAccess = requireAnalystRole;
export const kycMetricsAccess = requireManagerRole;
export const reportingAccess = requireManagerRole;
export const analyticsAccess = requireAnalystRole;

// Check if user can access their own data (for investors)
export const requireOwnershipOrAdmin = (resourceField = 'userId') => {
  return (req, res, next) => {
    const isOwner = req.auth && req.auth._id.toString() === req[resourceField]?.toString();
    const isAdmin = req.user && ['admin', 'manager', 'superadmin'].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message: "You can only access your own data"
        }
      });
    }
    next();
  };
};