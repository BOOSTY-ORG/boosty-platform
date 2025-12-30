// Base components
export { default as AccessIndicator } from "./AccessIndicator";
export { default as AccessGuard } from "./AccessGuard";

// Specialized indicator components
export { default as NavigationAccessIndicator } from "./NavigationAccessIndicator";
export { default as ActionAccessIndicator } from "./ActionAccessIndicator";
export { default as HeaderAccessIndicator } from "./HeaderAccessIndicator";
export { default as TableAccessIndicator } from "./TableAccessIndicator";
export { default as FormFieldAccessIndicator } from "./FormFieldAccessIndicator";

// Utilities and configurations
export {
  ACCESS_LEVELS,
  ACCESS_STATES,
  PERMISSIONS,
  ROLE_MAPPING,
  getLevelConfig,
  getStateConfig,
  hasAccess,
  hasPermission,
  getAccessState,
  getPermissionState,
  mapRoleToLevel,
  getLevelFromPriority,
  cachedHasAccess,
  clearAccessCache,
} from "./utils/accessConfig";
