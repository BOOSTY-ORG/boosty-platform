# Access Indicator Implementation Guide

## 1. Getting Started

### Prerequisites

- React 18+ with hooks
- Tailwind CSS configured with custom colors
- Heroicons for icons
- Existing role management system

### Installation

```bash
# Install required dependencies
npm install @heroicons/react prop-types

# Add custom colors to tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        platinum: {
          50: '#F8F8F8',
          100: '#E5E4E2',
          200: '#D4D4D2',
          300: '#BCBCBA',
          400: '#A3A3A1',
          500: '#8B8B89',
          600: '#737371',
          700: '#5B5B59',
          800: '#434341',
          900: '#2C2C2A',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        silver: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        bronze: {
          50: '#FEF7ED',
          100: '#FED7AA',
          200: '#FDBA74',
          300: '#FB923C',
          400: '#F97316',
          500: '#EA580C',
          600: '#C2410C',
          700: '#9A3412',
          800: '#7C2D12',
          900: '#431407',
        },
        investor: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        standard: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        }
      }
    }
  }
}
```

## 2. Core Components Implementation

### Base AccessIndicator Component

```jsx
// src/components/access-indicators/AccessIndicator.jsx
import React, { memo } from "react";
import PropTypes from "prop-types";
import { getLevelConfig, getStateConfig } from "./utils/accessConfig";
import { Tooltip } from "../common/Tooltip";

const AccessIndicator = memo(
  ({
    level,
    state = "available",
    size = "md",
    showLabel = true,
    showIcon = true,
    tooltip,
    className = "",
    ...props
  }) => {
    const levelConfig = getLevelConfig(level);
    const stateConfig = getStateConfig(state);
    const LevelIcon = levelConfig.icon;
    const StateIcon = stateConfig.icon;

    const sizeClasses = {
      sm: "w-5 h-5 text-xs",
      md: "w-6 h-6 text-xs",
      lg: "w-8 h-8 text-sm",
    };

    return (
      <div
        className={`inline-flex items-center space-x-2 ${className}`}
        {...props}
      >
        <Tooltip
          content={tooltip || `${levelConfig.label} - ${stateConfig.label}`}
        >
          <div
            className={`
            relative inline-flex items-center justify-center
            ${sizeClasses[size]}
            rounded-full
            ${levelConfig.bgColor}
            ${levelConfig.borderColor}
            border
            transition-all duration-200
            hover:scale-105
          `}
            role="img"
            aria-label={`${levelConfig.label} access level`}
          >
            {showIcon && (
              <LevelIcon className={`w-3/5 h-3/5 ${levelConfig.textColor}`} />
            )}

            <div
              className={`
              absolute -bottom-1 -right-1
              w-1/3 h-1/3 rounded-full
              ${stateConfig.bgColor}
              ${stateConfig.borderColor}
              border
            `}
            >
              <StateIcon className={`w-full h-full ${stateConfig.textColor}`} />
            </div>
          </div>
        </Tooltip>

        {showLabel && (
          <span
            className={`${sizeClasses[size]} ${levelConfig.textColor} font-medium`}
          >
            {levelConfig.label}
          </span>
        )}
      </div>
    );
  }
);

AccessIndicator.propTypes = {
  level: PropTypes.oneOf([
    "platinum",
    "gold",
    "silver",
    "bronze",
    "investor",
    "standard",
  ]).isRequired,
  state: PropTypes.oneOf(["available", "limited", "restricted", "hidden"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  showLabel: PropTypes.bool,
  showIcon: PropTypes.bool,
  tooltip: PropTypes.string,
  className: PropTypes.string,
};

export default AccessIndicator;
```

### Access Configuration Utility

```jsx
// src/components/access-indicators/utils/accessConfig.js
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
} from "@heroicons/react/24/outline";

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
  },
};

export const ACCESS_STATES = {
  available: {
    name: "available",
    label: "Available",
    icon: CheckCircleIcon,
    color: "success",
    bgColor: "bg-success-50",
    textColor: "text-success-700",
    borderColor: "border-success-200",
  },
  limited: {
    name: "limited",
    label: "Limited",
    icon: ExclamationTriangleIcon,
    color: "warning",
    bgColor: "bg-warning-50",
    textColor: "text-warning-700",
    borderColor: "border-warning-200",
  },
  restricted: {
    name: "restricted",
    label: "Restricted",
    icon: LockClosedIcon,
    color: "danger",
    bgColor: "bg-danger-50",
    textColor: "text-danger-700",
    borderColor: "border-danger-200",
  },
  hidden: {
    name: "hidden",
    label: "Hidden",
    icon: LockClosedIcon,
    color: "gray",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
  },
};

export const getLevelConfig = (level) => {
  return ACCESS_LEVELS[level] || ACCESS_LEVELS.standard;
};

export const getStateConfig = (state) => {
  return ACCESS_STATES[state] || ACCESS_STATES.restricted;
};

export const hasAccess = (userLevel, requiredLevel) => {
  const userPriority = getLevelConfig(userLevel).priority;
  const requiredPriority = getLevelConfig(requiredLevel).priority;
  return userPriority >= requiredPriority;
};

export const getAccessState = (userLevel, requiredLevel) => {
  if (!hasAccess(userLevel, requiredLevel)) {
    return "restricted";
  }
  return "available";
};
```

### AccessGuard Component

```jsx
// src/components/access-indicators/AccessGuard.jsx
import React from "react";
import PropTypes from "prop-types";
import { hasAccess, getAccessState } from "./utils/accessConfig";
import AccessDenied from "./AccessDenied";

const AccessGuard = ({
  children,
  requiredLevel,
  requiredPermissions = [],
  userLevel,
  fallback = null,
  showUpgradePrompt = true,
  onAccessDenied,
}) => {
  // Check basic level access
  if (requiredLevel && !hasAccess(userLevel, requiredLevel)) {
    if (onAccessDenied) {
      onAccessDenied({ requiredLevel, userLevel });
    }

    return (
      fallback || (
        <AccessDenied
          requiredLevel={requiredLevel}
          currentLevel={userLevel}
          showUpgradePrompt={showUpgradePrompt}
        />
      )
    );
  }

  // TODO: Add permission-based checks when implemented
  // For now, just return children if level access is granted
  return children;
};

AccessGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requiredLevel: PropTypes.string,
  requiredPermissions: PropTypes.array,
  userLevel: PropTypes.string.isRequired,
  fallback: PropTypes.node,
  showUpgradePrompt: PropTypes.bool,
  onAccessDenied: PropTypes.func,
};

export default AccessGuard;
```

## 3. Integration with Existing Components

### Update DashboardLayout.jsx

```jsx
// src/layouts/DashboardLayout.jsx
import AccessIndicator from "../components/access-indicators/AccessIndicator";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = () => {
  const { user } = useAuth();
  const userLevel = user?.role || "standard";

  const menuItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: HomeIcon,
      requiredLevel: "standard",
    },
    {
      name: "Investors",
      path: "/investors",
      icon: UserGroupIcon,
      requiredLevel: "gold",
    },
    {
      name: "Users",
      path: "/users",
      icon: UserIcon,
      requiredLevel: "gold",
    },
    {
      name: "Payments",
      path: "/payments",
      icon: CurrencyDollarIcon,
      requiredLevel: "gold",
    },
    {
      name: "Reports",
      path: "/reports",
      icon: ChartBarIcon,
      requiredLevel: "silver",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const hasAccess =
                userLevel && hasAccess(userLevel, item.requiredLevel);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`
                    group flex items-center px-3 py-3 text-sm font-medium rounded-md
                    transition-colors min-h-[44px]
                    ${
                      hasAccess
                        ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        : "text-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate flex-1">{item.name}</span>
                  <AccessIndicator
                    level={item.requiredLevel}
                    state={hasAccess ? "available" : "restricted"}
                    size="sm"
                    showLabel={false}
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
};
```

### Update Data Tables

```jsx
// src/components/common/DataTable.jsx
import AccessIndicator from "../access-indicators/AccessIndicator";
import { hasAccess } from "../access-indicators/utils/accessConfig";

const DataTable = ({ data, columns, userLevel, rowLevelPermissions = {} }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.title}
                {column.requiredLevel && (
                  <AccessIndicator
                    level={column.requiredLevel}
                    state={
                      hasAccess(userLevel, column.requiredLevel)
                        ? "available"
                        : "restricted"
                    }
                    size="sm"
                    showLabel={false}
                    className="ml-2"
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => {
                const canEdit = rowLevelPermissions[row.id]?.canEdit || false;
                const canDelete =
                  rowLevelPermissions[row.id]?.canDelete || false;

                return (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {column.render
                      ? column.render(row, { canEdit, canDelete, userLevel })
                      : row[column.key]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## 4. Context Provider Setup

### AccessContext

```jsx
// src/context/AccessContext.jsx
import React, { createContext, useContext, useMemo } from "react";
import {
  getLevelConfig,
  hasAccess,
} from "../components/access-indicators/utils/accessConfig";

const AccessContext = createContext({});

export const AccessProvider = ({ children, user }) => {
  const userLevel = user?.role || "standard";
  const levelConfig = getLevelConfig(userLevel);

  const value = useMemo(
    () => ({
      userLevel,
      levelConfig,
      hasAccess: (requiredLevel) => hasAccess(userLevel, requiredLevel),
      can: (permission) => {
        // TODO: Implement permission-based checks
        return true;
      },
    }),
    [userLevel, levelConfig]
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within an AccessProvider");
  }
  return context;
};
```

### Integration with AuthProvider

```jsx
// src/context/AuthContext.jsx
import { AccessProvider } from "./AccessContext";

const AuthProvider = ({ children }) => {
  // ... existing auth logic

  return (
    <AccessProvider user={user}>
      {/* existing provider content */}
    </AccessProvider>
  );
};
```

## 5. Custom Hooks

### useAccess Hook

```jsx
// src/hooks/useAccess.js
import { useAccess } from "../context/AccessContext";

export const useAccess = () => {
  const { userLevel, levelConfig, hasAccess, can } = useAccess();

  return {
    userLevel,
    levelConfig,
    hasAccess,
    can,
    isPlatinum: userLevel === "platinum",
    isGold: userLevel === "gold",
    isSilver: userLevel === "silver",
    isBronze: userLevel === "bronze",
    isInvestor: userLevel === "investor",
    isStandard: userLevel === "standard",
    isAdminOrAbove: hasAccess("gold"),
    isManagerOrAbove: hasAccess("silver"),
    isAnalystOrAbove: hasAccess("bronze"),
  };
};
```

### useAccessIndicator Hook

```jsx
// src/hooks/useAccessIndicator.js
import { useAccess } from "../context/AccessContext";
import { getAccessState } from "../components/access-indicators/utils/accessConfig";

export const useAccessIndicator = (requiredLevel) => {
  const { userLevel, hasAccess } = useAccess();
  const state = getAccessState(userLevel, requiredLevel);
  const isAccessible = hasAccess(requiredLevel);

  return {
    level: requiredLevel,
    state,
    isAccessible,
    userLevel,
    tooltip: isAccessible
      ? `You have ${requiredLevel} level access`
      : `Requires ${requiredLevel} level access. Your current level: ${userLevel}`,
  };
};
```

## 6. Testing Strategy

### Unit Tests

```jsx
// src/components/access-indicators/__tests__/AccessIndicator.test.jsx
import { render, screen } from "@testing-library/react";
import AccessIndicator from "../AccessIndicator";

describe("AccessIndicator", () => {
  it("renders with correct level and state", () => {
    render(<AccessIndicator level="gold" state="available" />);

    expect(screen.getByLabelText("Gold access level")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("shows correct icon for each level", () => {
    const { rerender } = render(<AccessIndicator level="platinum" />);
    expect(screen.getByLabelText("Platinum access level")).toBeInTheDocument();

    rerender(<AccessIndicator level="gold" />);
    expect(screen.getByLabelText("Gold access level")).toBeInTheDocument();

    // ... test other levels
  });

  it("applies correct size classes", () => {
    const { rerender } = render(<AccessIndicator level="gold" size="sm" />);
    expect(screen.getByLabelText("Gold access level")).toHaveClass("w-5 h-5");

    rerender(<AccessIndicator level="gold" size="lg" />);
    expect(screen.getByLabelText("Gold access level")).toHaveClass("w-8 h-8");
  });

  it("is accessible", () => {
    render(<AccessIndicator level="gold" tooltip="Gold level access" />);

    const indicator = screen.getByLabelText("Gold access level");
    expect(indicator).toHaveAttribute("role", "img");
    expect(indicator).toHaveAttribute("aria-label", "Gold access level");
  });
});
```

### Integration Tests

```jsx
// src/components/access-indicators/__tests__/AccessGuard.test.jsx
import { render, screen } from "@testing-library/react";
import AccessGuard from "../AccessGuard";

describe("AccessGuard", () => {
  it("renders children when user has access", () => {
    render(
      <AccessGuard requiredLevel="gold" userLevel="platinum">
        <div>Protected Content</div>
      </AccessGuard>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("shows fallback when user lacks access", () => {
    render(
      <AccessGuard requiredLevel="gold" userLevel="standard">
        <div>Protected Content</div>
      </AccessGuard>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
  });

  it("calls onAccessDenied when access is denied", () => {
    const onAccessDenied = jest.fn();

    render(
      <AccessGuard
        requiredLevel="gold"
        userLevel="standard"
        onAccessDenied={onAccessDenied}
      >
        <div>Protected Content</div>
      </AccessGuard>
    );

    expect(onAccessDenied).toHaveBeenCalledWith({
      requiredLevel: "gold",
      userLevel: "standard",
    });
  });
});
```

## 7. Performance Optimization

### Memoization

```jsx
// src/components/access-indicators/MemoizedAccessIndicator.jsx
import { memo } from "react";
import AccessIndicator from "./AccessIndicator";

export default memo(AccessIndicator, (prevProps, nextProps) => {
  return (
    prevProps.level === nextProps.level &&
    prevProps.state === nextProps.state &&
    prevProps.size === nextProps.size &&
    prevProps.showLabel === nextProps.showLabel &&
    prevProps.showIcon === nextProps.showIcon
  );
});
```

### Lazy Loading

```jsx
// src/components/access-indicators/LazyAccessComponents.jsx
import { lazy } from "react";

export const NavigationAccessIndicator = lazy(
  () => import("./NavigationAccessIndicator")
);
export const ActionAccessIndicator = lazy(
  () => import("./ActionAccessIndicator")
);
export const TableAccessIndicator = lazy(
  () => import("./TableAccessIndicator")
);
```

## 8. Migration Steps

### Phase 1: Core Infrastructure

1. Set up color palette in Tailwind config
2. Create base AccessIndicator component
3. Implement access configuration utilities
4. Set up AccessContext and custom hooks
5. Add basic unit tests

### Phase 2: Navigation Integration

1. Update DashboardLayout with access indicators
2. Modify menu items to show access levels
3. Add AccessGuard to protected routes
4. Test navigation flows

### Phase 3: Component Integration

1. Update data tables with row-level indicators
2. Add form field indicators
3. Implement action button states
4. Create section header indicators

### Phase 4: Advanced Features

1. Add upgrade prompts and flows
2. Implement permission-based restrictions
3. Add analytics for access requests
4. Complete accessibility testing

### Phase 5: Polish & Optimization

1. Add animations and transitions
2. Optimize performance
3. Complete comprehensive testing
4. Documentation and training

## 9. Troubleshooting

### Common Issues

#### Icons Not Displaying

```jsx
// Ensure Heroicons is properly imported
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

// Check if icon components are properly referenced
const config = {
  gold: {
    icon: ShieldCheckIcon, // Not 'ShieldCheckIcon'
    // ...
  },
};
```

#### Colors Not Applying

```jsx
// Check tailwind.config.js for custom colors
module.exports = {
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#FFFBEB",
          // ... other shades
        },
      },
    },
  },
};

// Ensure class names match the config
className = "bg-gold-50 text-gold-700";
```

#### Access Context Not Working

```jsx
// Ensure AccessProvider wraps the app
<AccessProvider user={user}>
  <App />
</AccessProvider>;

// Check hook usage
const { hasAccess } = useAccess(); // Not useAccessContext()
```

### Debug Tools

```jsx
// Add debug mode to AccessIndicator
const AccessIndicator = ({ level, debug = false, ...props }) => {
  if (debug) {
    console.log("AccessIndicator:", {
      level,
      config: getLevelConfig(level),
      userLevel: getCurrentUserLevel(),
    });
  }
  // ... rest of component
};
```

## 10. Best Practices

### Do's

- Always provide meaningful tooltips
- Use consistent sizing across components
- Implement proper ARIA labels
- Test with different user levels
- Provide clear upgrade paths
- Use semantic HTML elements
- Implement keyboard navigation
- Test with screen readers

### Don'ts

- Don't hardcode access levels in components
- Don't ignore mobile responsiveness
- Don't skip error handling
- Don't use color alone for status indication
- Don't forget to test edge cases
- Don't ignore performance implications
- Don't skip accessibility testing
- Don't break existing functionality

This implementation guide provides a comprehensive roadmap for integrating access indicators throughout the Boosty Platform while maintaining consistency, accessibility, and performance.
