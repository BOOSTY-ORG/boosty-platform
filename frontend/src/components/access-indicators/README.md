# Access Indicators System

This directory contains a comprehensive access control system for the Boosty Platform UI that provides visual indicators for user permissions and access levels.

## Overview

The access indicators system helps users understand their access level and what features they can interact with based on their role. It provides visual feedback through icons, colors, and tooltips.

## Components

### Core Components

#### AccessIndicator

The base component that displays an access level with optional state indicator.

```jsx
import AccessIndicator from "./access-indicators/AccessIndicator";

<AccessIndicator
  level="gold"
  state="available"
  size="md"
  showLabel={true}
  showIcon={true}
  showStateIcon={true}
  tooltip="Gold level access"
  animated={false}
  responsive={true}
/>;
```

#### NavigationAccessIndicator

Used for navigation menu items to indicate access level requirements.

```jsx
import NavigationAccessIndicator from "./access-indicators/NavigationAccessIndicator";

<NavigationAccessIndicator
  requiredLevel="silver"
  userLevel={userLevel}
  showLabel={false}
  size="sm"
  disabled={false}
/>;
```

#### ActionAccessIndicator

Wraps action buttons to show permission states.

```jsx
import ActionAccessIndicator from "./access-indicators/ActionAccessIndicator";

<ActionAccessIndicator
  permission="user_edit"
  action="edit user"
  userLevel={userLevel}
  variant="badge" // or 'overlay', 'inline', 'button'
  showUpgradePrompt={true}
  onUpgradeRequest={handleRequestUpgrade}
  fallback={<div>Access denied</div>}
>
  <button>Edit User</button>
</ActionAccessIndicator>;
```

#### HeaderAccessIndicator

Used for section headers to indicate access requirements.

```jsx
import HeaderAccessIndicator from "./access-indicators/HeaderAccessIndicator";

<HeaderAccessIndicator
  title="User Management"
  subtitle="Manage user accounts and permissions"
  requiredLevel="bronze"
  userLevel={userLevel}
  showLevelBadge={true}
/>;
```

#### TableAccessIndicator

Provides row-level permission indicators for data tables.

```jsx
import TableAccessIndicator from "./access-indicators/TableAccessIndicator";

<TableAccessIndicator
  rowId="user_123"
  entityType="user"
  permissions={{
    canView: true,
    canEdit: false,
    canDelete: false,
    canExport: true,
  }}
  userLevel={userLevel}
  variant="dropdown" // or 'column', 'overlay'
  onView={(id) => navigate(`/users/${id}`)}
  onEdit={(id) => navigate(`/users/${id}/edit`)}
  onDelete={(id) => handleDelete(id)}
  onExport={(id) => handleExport(id)}
/>;
```

#### FormFieldAccessIndicator

Wraps form fields to indicate edit permissions.

```jsx
import FormFieldAccessIndicator from "./access-indicators/FormFieldAccessIndicator";

<FormFieldAccessIndicator
  fieldName="Admin Notes"
  fieldType="textarea"
  isEditable={true}
  requiredLevel="gold"
  userLevel={userLevel}
  variant="inline" // or 'tooltip', 'banner'
  reason="Only Gold and Platinum users can edit admin notes"
>
  <textarea placeholder="Enter admin notes" />
</FormFieldAccessIndicator>;
```

#### AccessGuard

Wrapper component that conditionally renders content based on access level.

```jsx
import AccessGuard from "./access-indicators/AccessGuard";

<AccessGuard
  requiredLevel="silver"
  userLevel={userLevel}
  fallback={<div>Access denied</div>}
  showUpgradePrompt={true}
  onAccessDenied={handleAccessDenied}
  accessDeniedVariant="default" // or 'compact', 'minimal'
>
  <div>Protected content</div>
</AccessGuard>;
```

## Hooks and Context

### useAccessLevel Hook

Provides access level information and permission checking functions.

```jsx
import { useAccessLevel } from "../hooks/useAccessLevel";

const {
  userLevel,
  hasPermission,
  canAccess,
  getPermissionState,
  getAccessState,
} = useAccessLevel();

// Check specific permission
if (hasPermission("user_edit")) {
  // User can edit
}

// Check access level
if (canAccess("gold")) {
  // User has gold or higher access
}
```

### AccessContext

Provides access level context to the application.

```jsx
import AccessProvider from "../context/AccessContext";

// Wrap your app with AccessProvider
<AccessProvider>
  <App />
</AccessProvider>;
```

## Access Levels

The system supports the following access levels (from lowest to highest):

1. **Standard** - Basic access for regular users
2. **Investor** - Access for investors
3. **Bronze** - Entry-level admin access
4. **Silver** - Intermediate admin access
5. **Gold** - Advanced admin access
6. **Platinum** - Full system access

## Styling

The components use Tailwind CSS with custom colors defined in `tailwind.config.js`:

- `platinum` - Purple/indigo colors
- `gold` - Yellow/amber colors
- `silver` - Gray/slate colors
- `bronze` - Orange/amber colors
- `investor` - Blue colors
- `standard` - Green colors

## Responsive Design

All components are fully responsive with:

- Mobile-first design approach
- Adaptive sizing for different screen sizes
- Touch-friendly interaction areas
- Proper focus management for keyboard navigation

## Accessibility Features

The components include comprehensive accessibility support:

- ARIA labels and roles
- Keyboard navigation support
- Screen reader announcements
- Focus management
- High contrast colors
- Semantic HTML structure

## Integration Examples

### Dashboard Layout Integration

```jsx
import NavigationAccessIndicator from './access-indicators/NavigationAccessIndicator';

// In navigation menu
<NavigationAccessIndicator
  requiredLevel="bronze"
  userLevel={userLevel}
/>

// In user profile section
<div className="flex items-center space-x-2">
  <span className="text-sm">Current Level:</span>
  <AccessIndicator
    level={userLevel}
    size="sm"
    showLabel={true}
  />
</div>
```

### Table Integration

```jsx
import TableAccessIndicator from "./access-indicators/TableAccessIndicator";

<Table
  columns={columns}
  data={users}
  RowActionsComponent={({ row }) => (
    <TableAccessIndicator
      rowId={row.id}
      entityType="user"
      permissions={getRowPermissions(row, userLevel)}
      userLevel={userLevel}
      variant="dropdown"
      onView={(id) => navigate(`/users/${id}`)}
      onEdit={(id) => navigate(`/users/${id}/edit`)}
      onDelete={(id) => handleDelete(id)}
    />
  )}
/>;
```

### Form Integration

```jsx
import FormFieldAccessIndicator from "./access-indicators/FormFieldAccessIndicator";

<FormFieldAccessIndicator
  fieldName="Role"
  fieldType="select"
  requiredLevel="silver"
  userLevel={userLevel}
  variant="tooltip"
>
  <select>
    <option value="user">User</option>
    <option value="admin">Admin</option>
  </select>
</FormFieldAccessIndicator>;
```

## Testing

A comprehensive test component is available at `AccessIndicatorTest.jsx` that demonstrates all components and their variations. To use it:

```jsx
import AccessIndicatorTest from "./access-indicators/AccessIndicatorTest";

// In your test route or development environment
<AccessIndicatorTest />;
```

## Best Practices

1. **Always use AccessGuard** for protected content rather than manual checks
2. **Provide meaningful tooltips** that explain why access is restricted
3. **Use appropriate variants** for different UI contexts (badge, overlay, etc.)
4. **Include upgrade prompts** when access is denied
5. **Test with different user levels** to ensure proper behavior
6. **Use semantic HTML** and ARIA attributes for accessibility
7. **Consider mobile experience** with responsive design

## Migration Guide

To migrate existing UI components to use the access indicators system:

1. Identify the access level required for each feature
2. Wrap protected content with `AccessGuard`
3. Add `NavigationAccessIndicator` to navigation items
4. Replace action buttons with `ActionAccessIndicator`
5. Add `TableAccessIndicator` to table rows
6. Wrap form fields with `FormFieldAccessIndicator`
7. Test thoroughly with different user levels

## Troubleshooting

### Common Issues

1. **Components not showing correct access state**
   - Ensure `AccessProvider` wraps your app
   - Check that `userLevel` is properly set
   - Verify permission mappings in `accessConfig.js`

2. **Responsive design issues**
   - Check Tailwind responsive prefixes (sm:, md:, lg:)
   - Ensure proper viewport meta tags
   - Test on actual mobile devices

3. **Accessibility issues**
   - Verify ARIA labels are descriptive
   - Test keyboard navigation
   - Check screen reader announcements

For more detailed information, see the design documents in this directory.
