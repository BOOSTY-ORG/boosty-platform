import {
  CrownIcon,
  ShieldCheckIcon,
  StarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

// Access level configurations matching the backend role hierarchy
export const ACCESS_LEVELS = {
  platinum: {
    name: "platinum",
    label: "Platinum",
    icon: CrownIcon,
    color: "platinum",
    gradient: "from-platinum-100 to-platinum-200",
    bgColor: "bg-platinum-50",
    textColor: "text-platinum-700",
    borderColor: "border-platinum-200",
    priority: 6,
    description: "Full system access with all administrative privileges",
  },
  gold: {
    name: "gold",
    label: "Gold",
    icon: ShieldCheckIcon,
    color: "gold",
    gradient: "from-gold-100 to-gold-200",
    bgColor: "bg-gold-50",
    textColor: "text-gold-700",
    borderColor: "border-gold-200",
    priority: 5,
    description: "Administrative access with user and financial management",
  },
  silver: {
    name: "silver",
    label: "Silver",
    icon: StarIcon,
    color: "silver",
    gradient: "from-silver-100 to-silver-200",
    bgColor: "bg-silver-50",
    textColor: "text-silver-700",
    borderColor: "border-silver-200",
    priority: 4,
    description: "Management access with team oversight capabilities",
  },
  bronze: {
    name: "bronze",
    label: "Bronze",
    icon: ChartBarIcon,
    color: "bronze",
    gradient: "from-bronze-100 to-bronze-200",
    bgColor: "bg-bronze-50",
    textColor: "text-bronze-700",
    borderColor: "border-bronze-200",
    priority: 3,
    description: "Analyst access with reporting and analytics capabilities",
  },
  investor: {
    name: "investor",
    label: "Investor",
    icon: CurrencyDollarIcon,
    color: "investor",
    gradient: "from-investor-100 to-investor-200",
    bgColor: "bg-investor-50",
    textColor: "text-investor-700",
    borderColor: "border-investor-200",
    priority: 2,
    description: "Investor portal access with portfolio management",
  },
  standard: {
    name: "standard",
    label: "Standard",
    icon: UserIcon,
    color: "standard",
    gradient: "from-standard-100 to-standard-200",
    bgColor: "bg-standard-50",
    textColor: "text-standard-700",
    borderColor: "border-standard-200",
    priority: 1,
    description: "Basic user access with limited features",
  },
};

// Access state configurations
export const ACCESS_STATES = {
  available: {
    name: "available",
    label: "Available",
    icon: CheckCircleIcon,
    color: "success",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    description: "Full access to this feature",
  },
  limited: {
    name: "limited",
    label: "Limited",
    icon: ExclamationTriangleIcon,
    color: "warning",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-200",
    description: "Partial access with some restrictions",
  },
  restricted: {
    name: "restricted",
    label: "Restricted",
    icon: LockClosedIcon,
    color: "danger",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    description: "No access - feature requires higher privileges",
  },
  hidden: {
    name: "hidden",
    label: "Hidden",
    icon: EyeSlashIcon,
    color: "gray",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
    description: "Feature not visible for current access level",
  },
};

// Permission mappings for different features
export const PERMISSIONS = {
  // User management
  user_view: { minLevel: "silver", description: "View user information" },
  user_edit: { minLevel: "gold", description: "Edit user information" },
  user_delete: { minLevel: "gold", description: "Delete user accounts" },
  user_create: { minLevel: "gold", description: "Create new user accounts" },

  // Financial management
  payment_view: { minLevel: "silver", description: "View payment information" },
  payment_approve: { minLevel: "gold", description: "Approve payments" },
  payment_refund: { minLevel: "gold", description: "Process refunds" },

  // Investor management
  investor_view: {
    minLevel: "silver",
    description: "View investor information",
  },
  investor_edit: { minLevel: "gold", description: "Edit investor details" },
  investor_delete: { minLevel: "gold", description: "Remove investors" },

  // Reports and analytics
  reports_view: { minLevel: "silver", description: "View reports" },
  reports_export: { minLevel: "silver", description: "Export reports" },
  analytics_advanced: { minLevel: "bronze", description: "Advanced analytics" },

  // System configuration
  system_config: { minLevel: "platinum", description: "System configuration" },
  system_logs: { minLevel: "platinum", description: "Access system logs" },

  // CRM features
  crm_view: { minLevel: "silver", description: "View CRM data" },
  crm_edit: { minLevel: "silver", description: "Edit CRM data" },
  crm_delete: { minLevel: "gold", description: "Delete CRM records" },
};

// Role mapping from backend to frontend levels
export const ROLE_MAPPING = {
  superadmin: "platinum",
  admin: "gold",
  manager: "silver",
  analyst: "bronze",
  investor: "investor",
  user: "standard",
};

// Utility functions
export const getLevelConfig = (level) => {
  return ACCESS_LEVELS[level] || ACCESS_LEVELS.standard;
};

export const getStateConfig = (state) => {
  return ACCESS_STATES[state] || ACCESS_STATES.restricted;
};

export const hasAccess = (userLevel, requiredLevel) => {
  if (!userLevel || !requiredLevel) return false;

  const userPriority = getLevelConfig(userLevel).priority;
  const requiredPriority = getLevelConfig(requiredLevel).priority;

  return userPriority >= requiredPriority;
};

export const hasPermission = (userLevel, permission) => {
  if (!userLevel || !permission || !PERMISSIONS[permission]) return false;

  const requiredLevel = PERMISSIONS[permission].minLevel;
  return hasAccess(userLevel, requiredLevel);
};

export const getAccessState = (userLevel, requiredLevel) => {
  if (!hasAccess(userLevel, requiredLevel)) {
    return "restricted";
  }
  return "available";
};

export const getPermissionState = (userLevel, permission) => {
  if (!hasPermission(userLevel, permission)) {
    return "restricted";
  }
  return "available";
};

export const mapRoleToLevel = (role) => {
  return ROLE_MAPPING[role] || "standard";
};

export const getLevelFromPriority = (priority) => {
  for (const [level, config] of Object.entries(ACCESS_LEVELS)) {
    if (config.priority === priority) {
      return level;
    }
  }
  return "standard";
};

// Cache for access checks to improve performance
const accessCache = new Map();

export const cachedHasAccess = (userLevel, requiredLevel) => {
  const cacheKey = `${userLevel}-${requiredLevel}`;

  if (accessCache.has(cacheKey)) {
    return accessCache.get(cacheKey);
  }

  const result = hasAccess(userLevel, requiredLevel);
  accessCache.set(cacheKey, result);

  // Clear cache after 5 minutes
  setTimeout(
    () => {
      accessCache.delete(cacheKey);
    },
    5 * 60 * 1000
  );

  return result;
};

export const clearAccessCache = () => {
  accessCache.clear();
};
