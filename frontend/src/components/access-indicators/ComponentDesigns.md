# Access Indicator Component Designs

## 1. NavigationAccessIndicator Component

### Purpose

Displays access level indicators for sidebar menu items, showing users their access level for each navigation option.

### Props Interface

```typescript
interface NavigationAccessIndicatorProps {
  requiredLevel:
    | "platinum"
    | "gold"
    | "silver"
    | "bronze"
    | "investor"
    | "standard";
  userLevel:
    | "platinum"
    | "gold"
    | "silver"
    | "bronze"
    | "investor"
    | "standard";
  isAccessible: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}
```

### Design Specifications

#### Visual Structure

```
┌─────────────────────────────────────────┐
│ [Icon] [Label]                      │
│  🛡️    Gold                        │
│  ┌─────┐                            │
│  │ 🛡️  │                            │
│  │    ✓│                            │
│  └─────┘                            │
└─────────────────────────────────────────┘
```

#### Size Variations

- **Small (sm)**: 20x20px icon, 11px text
- **Medium (md)**: 24x24px icon, 12px text (default)
- **Large (lg)**: 28x28px icon, 14px text

#### Color States

- **Accessible**: Full color with gradient background
- **Restricted**: Grayed out with lock overlay

#### Interaction States

- **Hover**: Scale 1.05, enhanced shadow
- **Focus**: Visible focus ring
- **Disabled**: Opacity 0.6

### Implementation Code

```jsx
<NavigationAccessIndicator
  requiredLevel="gold"
  userLevel="silver"
  isAccessible={false}
  showLabel={true}
  size="md"
/>
```

---

## 2. ActionAccessIndicator Component

### Purpose

Indicates permission levels for action buttons and interactive elements throughout the application.

### Props Interface

```typescript
interface ActionAccessIndicatorProps {
  permission: "full" | "limited" | "restricted" | "hidden";
  requiredRole?: string;
  userRole?: string;
  action: string;
  size?: "sm" | "md" | "lg";
  variant?: "badge" | "overlay" | "inline";
  showUpgradePrompt?: boolean;
  onUpgradeRequest?: () => void;
}
```

### Design Specifications

#### Badge Variant

```
┌─────────────────┐
│ [Action] [Badge] │
│  Delete  🔒     │
└─────────────────┘
```

#### Overlay Variant

```
┌─────────────────┐
│ [Disabled Button]│
│ ┌─────────────┐ │
│ │🔒 Limited   │ │
│ │Upgrade needed│ │
│ └─────────────┘ │
└─────────────────┘
```

#### Inline Variant

```
┌─────────────────┐
│ [Action] [Icon] │
│  Edit     ⚠️   │
└─────────────────┘
```

### State Indicators

- **Full Access**: Green checkmark, enabled button
- **Limited Access**: Yellow warning, button enabled with tooltip
- **Restricted**: Red lock, button disabled with upgrade prompt
- **Hidden**: No visible element

### Upgrade Prompt

```jsx
const UpgradePrompt = ({ requiredLevel, currentLevel, onUpgrade }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div className="flex items-center space-x-3">
      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
      <div>
        <h4 className="text-sm font-medium text-yellow-800">
          Upgrade Required
        </h4>
        <p className="text-xs text-yellow-700">
          This feature requires {requiredLevel} level access.
        </p>
        <button
          onClick={onUpgrade}
          className="mt-2 text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
        >
          Request Access
        </button>
      </div>
    </div>
  </div>
);
```

---

## 3. HeaderAccessIndicator Component

### Purpose

Displays access level requirements for page sections and content areas.

### Props Interface

```typescript
interface HeaderAccessIndicatorProps {
  title: string;
  requiredLevel: string;
  userLevel: string;
  description?: string;
  variant?: "banner" | "compact" | "minimal";
  showActions?: boolean;
}
```

### Design Specifications

#### Banner Variant

```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Financial Reports - Gold Level Access Required       │
│                                                        │
│ View comprehensive financial analytics and reports.         │
│ [Learn More] [Request Access]                           │
└─────────────────────────────────────────────────────────────┘
```

#### Compact Variant

```
┌─────────────────────────────────────────┐
│ 📊 Analytics (Silver Required) [🔒]   │
└─────────────────────────────────────────┘
```

#### Minimal Variant

```
┌─────────────────────────────────────────┐
│ User Management [🛡️ Gold]            │
└─────────────────────────────────────────┘
```

### Visual Hierarchy

- **Icon**: Left-aligned, color-coded by level
- **Title**: Bold, primary text
- **Badge**: Right-aligned, shows required level
- **Actions**: Optional upgrade/learn more buttons

---

## 4. TableAccessIndicator Component

### Purpose

Shows row-level permissions and access restrictions in data tables.

### Props Interface

```typescript
interface TableAccessIndicatorProps {
  rowId: string;
  entityType: "user" | "investor" | "transaction" | "report";
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
  };
  userLevel: string;
  ownerLevel?: string;
  variant?: "column" | "overlay" | "dropdown";
}
```

### Design Specifications

#### Column Variant

```
┌─────────────────────────────────────────────────────────────┐
│ Name        | Email        | Status | Access Level | Actions │
├─────────────────────────────────────────────────────────────┤
│ John Doe    | john@...     | Active | 🛡️ Gold    │ [⚠️]  │
│ Jane Smith  | jane@...     | Active | 👤 Standard │ [🔒]  │
└─────────────────────────────────────────────────────────────┘
```

#### Overlay Variant

```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ Row Actions                      │ │
│ │ ┌─────────┐ ┌─────────┐         │ │
│ │ │ View    │ │ Edit    │         │ │
│ │ │ ✓       │ │ 🔒     │         │ │
│ │ └─────────┘ └─────────┘         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Dropdown Variant

```
┌─────────────────────────────────────────┐
│ [Actions ▼]                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ View Details                    │ │
│ │ ⚠️ Limited Edit                  │ │
│ │ 🔒 Delete (Admin only)          │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Permission Matrix

| Action | Platinum | Gold | Silver | Bronze | Investor | Standard |
| ------ | -------- | ---- | ------ | ------ | -------- | -------- |
| View   | ✓        | ✓    | ✓      | ✓      | ✓        | ✓        |
| Edit   | ✓        | ✓    | ✓      | ⚠️     | ⚠️       | 🔒       |
| Delete | ✓        | ✓    | 🔒     | 🔒     | 🔒       | 🔒       |
| Export | ✓        | ✓    | ✓      | ⚠️     | ⚠️       | 🔒       |

---

## 5. FormFieldAccessIndicator Component

### Purpose

Indicates edit permissions and field-level access restrictions in forms.

### Props Interface

```typescript
interface FormFieldAccessIndicatorProps {
  fieldName: string;
  fieldType: "input" | "select" | "textarea" | "checkbox";
  isEditable: boolean;
  requiredLevel?: string;
  userLevel?: string;
  reason?: string;
  variant?: "inline" | "tooltip" | "banner";
}
```

### Design Specifications

#### Inline Variant

```
┌─────────────────────────────────────────┐
│ Email Address [🔒]                  │
│ ┌─────────────────────────────────────┐ │
│ │ john.doe@example.com (Read-only)  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Tooltip Variant

```
┌─────────────────────────────────────────┐
│ Phone Number                         │
│ ┌─────────────────────────────────────┐ │
│ │ +1-555-0123                     │ │
│ └─────────────────────────────────────┘ │
│ [ⓘ] Hover: "Requires Gold access to edit" │
└─────────────────────────────────────────┘
```

#### Banner Variant

```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ ⚠️ Some fields require elevated    │ │
│ │    access to edit                  │ │
│ │ [Request Access] [Learn More]     │ │
│ └─────────────────────────────────────┘ │
│                                    │
│ Name: John Doe                      │
│ Email: john@example.com              │
│ Role: [🔒 Administrator (Read-only)]│
└─────────────────────────────────────────┘
```

### Field States

- **Editable**: Normal appearance, full functionality
- **Read-only**: Grayed background, disabled state
- **Hidden**: Field not visible to user
- **Conditional**: Visible based on other field values

---

## 6. AccessLevelBadge Component

### Purpose

Compact badge showing user's current access level across the application.

### Props Interface

```typescript
interface AccessLevelBadgeProps {
  level: "platinum" | "gold" | "silver" | "bronze" | "investor" | "standard";
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
  showLabel?: boolean;
  variant?: "solid" | "outline" | "gradient";
  animated?: boolean;
}
```

### Design Specifications

#### Solid Variant

```
┌─────────────┐
│ 🛡️ Gold    │
└─────────────┘
```

#### Outline Variant

```
┌─────────────┐
│ 🛡️ Gold    │
└─────────────┘
```

#### Gradient Variant

```
┌─────────────┐
│ 🛡️ Gold    │
└─────────────┘
```

### Size Variations

- **XS**: 16px height, 8px font
- **SM**: 20px height, 10px font
- **MD**: 24px height, 12px font
- **LG**: 32px height, 14px font

---

## 7. AccessTooltip Component

### Purpose

Provides detailed information about access requirements and restrictions.

### Props Interface

```typescript
interface AccessTooltipProps {
  content: ReactNode;
  requiredLevel: string;
  currentLevel: string;
  permissions: string[];
  upgradePath?: string;
  position?: "top" | "bottom" | "left" | "right";
  trigger?: "hover" | "click" | "focus";
}
```

### Design Specifications

#### Content Structure

```
┌─────────────────────────────────────────┐
│ 🛡️ Gold Access Required              │
│                                    │
│ Your access: 👤 Standard            │
│ Missing permissions:                 │
│ • User management                   │
│ • Financial approvals               │
│ • System configuration             │
│                                    │
│ [Upgrade to Gold] [Learn More]     │
└─────────────────────────────────────────┘
```

### Interactive Elements

- **Upgrade Button**: Direct link to upgrade process
- **Learn More**: Documentation about access levels
- **Dismiss**: Close tooltip

---

## 8. AccessGuard Component

### Purpose

Conditional wrapper that shows/hides content based on user permissions.

### Props Interface

```typescript
interface AccessGuardProps {
  children: ReactNode;
  requiredLevel?: string;
  requiredPermissions?: string[];
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  onAccessDenied?: () => void;
}
```

### Usage Examples

#### Basic Usage

```jsx
<AccessGuard requiredLevel="gold">
  <FinancialReports />
</AccessGuard>
```

#### Multiple Permissions

```jsx
<AccessGuard
  requiredPermissions={["user_management:edit", "financial_access:view"]}
  fallback={<AccessDenied />}
>
  <UserManagementPanel />
</AccessGuard>
```

#### Custom Fallback

```jsx
<AccessGuard
  requiredLevel="platinum"
  fallback={
    <div className="text-center py-8">
      <LockClosedIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900">Premium Feature</h3>
      <p className="text-gray-500">This feature requires Platinum access</p>
    </div>
  }
>
  <SystemConfiguration />
</AccessGuard>
```

---

## 9. Responsive Design Patterns

### Mobile Adaptations

#### Compact Mode

```
┌─────────┐
│ [🛡️]    │
└─────────┘
```

#### Icon-Only Mode

```
┌─────────┐
│ 🛡️      │
└─────────┘
```

#### Bottom Sheet

```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ Access Information               │ │
│ │                                │ │
│ │ Level: Gold                    │ │
│ │ Features:                      │ │
│ │ • User management              │ │
│ │ • Financial reports            │ │
│ │ • System settings              │ │
│ │                                │ │
│ │ [Close]                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Touch Interactions

- **Tap**: Show access details
- **Long Press**: Show upgrade options
- **Swipe**: Dismiss overlays

---

## 10. Accessibility Implementation

### ARIA Labels

```jsx
<div
  role="img"
  aria-label="Gold level access indicator"
  aria-describedby="access-tooltip"
>
  <ShieldCheckIcon />
</div>
```

### Screen Reader Support

```jsx
<span className="sr-only">
  Current access level: Gold. This feature requires Platinum level access.
  Upgrade required to use this feature.
</span>
```

### Keyboard Navigation

```jsx
<button
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      showAccessDetails();
    }
  }}
  aria-expanded={isOpen}
  aria-controls="access-details"
>
  Access Information
</button>
```

### Focus Management

```jsx
const AccessModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      // Trap focus within modal
    }
  }, [isOpen]);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-title"
    >
      {/* Modal content */}
    </div>
  );
};
```

---

## 11. Animation Specifications

### Transitions

```css
/* Fade In */
.access-indicator {
  animation: fadeIn 0.3s ease-in-out;
}

/* Scale on Hover */
.access-indicator:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease-in-out;
}

/* Pulse for Loading */
.access-indicator.loading {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Slide In for Overlays */
.access-overlay {
  animation: slideUp 0.3s ease-out;
}
```

### Keyframes

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## 12. Performance Considerations

### Lazy Loading

```jsx
const AccessIndicator = lazy(() => import("./AccessIndicator"));

// Usage with Suspense
<Suspense fallback={<div className="access-skeleton" />}>
  <AccessIndicator level="gold" />
</Suspense>;
```

### Memoization

```jsx
const MemoizedAccessIndicator = memo(
  AccessIndicator,
  (prevProps, nextProps) => {
    return (
      prevProps.level === nextProps.level &&
      prevProps.isAccessible === nextProps.isAccessible &&
      prevProps.size === nextProps.size
    );
  }
);
```

### Bundle Optimization

```jsx
// Dynamic imports for different indicator types
const NavigationIndicator = lazy(
  () => import("./indicators/NavigationIndicator")
);
const ActionIndicator = lazy(() => import("./indicators/ActionIndicator"));
```
