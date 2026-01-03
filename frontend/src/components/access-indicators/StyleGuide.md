# Access Indicator Style Guide

## 1. Design Principles

### Clarity

- Access indicators should be immediately understandable at a glance
- Use consistent visual language across all components
- Provide clear feedback about what users can and cannot do

### Hierarchy

- Higher access levels should be visually more prominent
- Use size, color, and positioning to establish importance
- Maintain clear visual separation between levels

### Consistency

- Apply the same design patterns across all touchpoints
- Use consistent color coding and iconography
- Maintain uniform spacing and sizing

### Accessibility

- Ensure all indicators are screen reader friendly
- Provide keyboard navigation support
- Maintain sufficient color contrast ratios

## 2. Visual Design System

### Color Palette

#### Primary Access Colors

```css
/* Platinum - Highest Access */
--platinum-50: #f8f8f8;
--platinum-100: #e5e4e2;
--platinum-200: #d4d4d2;
--platinum-300: #bcbcba;
--platinum-400: #a3a3a1;
--platinum-500: #8b8b89;
--platinum-600: #737371;
--platinum-700: #5b5b59;
--platinum-800: #434341;
--platinum-900: #2c2c2a;

/* Gold - Administrative Access */
--gold-50: #fffbeb;
--gold-100: #fef3c7;
--gold-200: #fde68a;
--gold-300: #fcd34d;
--gold-400: #fbbf24;
--gold-500: #f59e0b;
--gold-600: #d97706;
--gold-700: #b45309;
--gold-800: #92400e;
--gold-900: #78350f;

/* Silver - Management Access */
--silver-50: #f8fafc;
--silver-100: #f1f5f9;
--silver-200: #e2e8f0;
--silver-300: #cbd5e1;
--silver-400: #94a3b8;
--silver-500: #64748b;
--silver-600: #475569;
--silver-700: #334155;
--silver-800: #1e293b;
--silver-900: #0f172a;

/* Bronze - Analyst Access */
--bronze-50: #fef7ed;
--bronze-100: #fed7aa;
--bronze-200: #fdba74;
--bronze-300: #fb923c;
--bronze-400: #f97316;
--bronze-500: #ea580c;
--bronze-600: #c2410c;
--bronze-700: #9a3412;
--bronze-800: #7c2d12;
--bronze-900: #431407;

/* Investor - Financial Access */
--investor-50: #eff6ff;
--investor-100: #dbeafe;
--investor-200: #bfdbfe;
--investor-300: #93c5fd;
--investor-400: #60a5fa;
--investor-500: #3b82f6;
--investor-600: #2563eb;
--investor-700: #1d4ed8;
--investor-800: #1e40af;
--investor-900: #1e3a8a;

/* Standard - Basic Access */
--standard-50: #f9fafb;
--standard-100: #f3f4f6;
--standard-200: #e5e7eb;
--standard-300: #d1d5db;
--standard-400: #9ca3af;
--standard-500: #6b7280;
--standard-600: #4b5563;
--standard-700: #374151;
--standard-800: #1f2937;
--standard-900: #111827;
```

#### State Colors

```css
/* Available - Full Access */
--available-50: #f0fdf4;
--available-100: #dcfce7;
--available-200: #bbf7d0;
--available-300: #86efac;
--available-400: #4ade80;
--available-500: #22c55e;
--available-600: #16a34a;
--available-700: #15803d;
--available-800: #166534;
--available-900: #14532d;

/* Limited - Partial Access */
--limited-50: #fffbeb;
--limited-100: #fef3c7;
--limited-200: #fde68a;
--limited-300: #fcd34d;
--limited-400: #fbbf24;
--limited-500: #f59e0b;
--limited-600: #d97706;
--limited-700: #b45309;
--limited-800: #92400e;
--limited-900: #78350f;

/* Restricted - No Access */
--restricted-50: #fef2f2;
--restricted-100: #fee2e2;
--restricted-200: #fecaca;
--restricted-300: #fca5a5;
--restricted-400: #f87171;
--restricted-500: #ef4444;
--restricted-600: #dc2626;
--restricted-700: #b91c1c;
--restricted-800: #991b1b;
--restricted-900: #7f1d1d;
```

### Typography

#### Font Hierarchy

```css
/* Access Level Labels */
.access-level-label {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 0.75rem; /* 12px */
  font-weight: 600;
  line-height: 1rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Status Labels */
.access-status-label {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 0.6875rem; /* 11px */
  font-weight: 500;
  line-height: 1rem;
  letter-spacing: 0.025em;
}

/* Tooltip Text */
.access-tooltip-text {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 0.875rem; /* 14px */
  font-weight: 400;
  line-height: 1.25rem;
}

/* Upgrade Prompt Text */
.access-upgrade-text {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 0.875rem; /* 14px */
  font-weight: 500;
  line-height: 1.25rem;
}
```

### Iconography

#### Icon Sizes

```css
/* Extra Small */
.icon-xs {
  width: 0.75rem; /* 12px */
  height: 0.75rem;
}

/* Small */
.icon-sm {
  width: 0.875rem; /* 14px */
  height: 0.875rem;
}

/* Medium */
.icon-md {
  width: 1rem; /* 16px */
  height: 1rem;
}

/* Large */
.icon-lg {
  width: 1.25rem; /* 20px */
  height: 1.25rem;
}

/* Extra Large */
.icon-xl {
  width: 1.5rem; /* 24px */
  height: 1.5rem;
}
```

#### Icon Mapping

```css
/* Access Level Icons */
.icon-platinum::before {
  content: "👑";
}
.icon-gold::before {
  content: "🛡️";
}
.icon-silver::before {
  content: "⭐";
}
.icon-bronze::before {
  content: "📊";
}
.icon-investor::before {
  content: "💰";
}
.icon-standard::before {
  content: "👤";
}

/* State Icons */
.icon-available::before {
  content: "✓";
}
.icon-limited::before {
  content: "⚠️";
}
.icon-restricted::before {
  content: "🔒";
}
.icon-hidden::before {
  content: "🚫";
}
```

### Spacing System

#### Component Spacing

```css
/* Internal Spacing */
.spacing-xs {
  margin: 0.25rem;
} /* 4px */
.spacing-sm {
  margin: 0.5rem;
} /* 8px */
.spacing-md {
  margin: 0.75rem;
} /* 12px */
.spacing-lg {
  margin: 1rem;
} /* 16px */
.spacing-xl {
  margin: 1.5rem;
} /* 24px */

/* Container Spacing */
.container-padding-sm {
  padding: 0.5rem;
} /* 8px */
.container-padding-md {
  padding: 0.75rem;
} /* 12px */
.container-padding-lg {
  padding: 1rem;
} /* 16px */
.container-padding-xl {
  padding: 1.5rem;
} /* 24px */
```

### Border Radius

#### Rounded Corners

```css
.radius-sm {
  border-radius: 0.25rem;
} /* 4px */
.radius-md {
  border-radius: 0.375rem;
} /* 6px */
.radius-lg {
  border-radius: 0.5rem;
} /* 8px */
.radius-xl {
  border-radius: 0.75rem;
} /* 12px */
.radius-full {
  border-radius: 9999px;
} /* Full circle */
```

### Shadows

#### Elevation Levels

```css
.shadow-access-indicator {
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.shadow-access-hover {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.shadow-access-active {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
```

## 3. Component Specifications

### Base Access Indicator

#### Layout Structure

```
┌─────────────────────────────────────────┐
│ [Icon Container] [Label Text]        │
│ ┌─────────────┐                     │
│ │ Level Icon  │                     │
│ └─────────────┘                     │
│ ┌─────────────┐                     │
│ │ State Icon  │                     │
│ └─────────────┘                     │
└─────────────────────────────────────────┘
```

#### Dimensions

```css
/* Small Size */
.access-indicator-sm {
  width: 1.25rem; /* 20px */
  height: 1.25rem;
}

/* Medium Size (Default) */
.access-indicator-md {
  width: 1.5rem; /* 24px */
  height: 1.5rem;
}

/* Large Size */
.access-indicator-lg {
  width: 1.75rem; /* 28px */
  height: 1.75rem;
}
```

#### State Indicator Positioning

```css
.state-indicator {
  position: absolute;
  bottom: -0.25rem; /* -4px */
  right: -0.25rem; /* -4px */
  width: 0.75rem; /* 12px */
  height: 0.75rem;
  border: 2px solid white;
}
```

### Navigation Indicators

#### Sidebar Integration

```css
.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.75rem; /* 12px */
  min-height: 2.75rem; /* 44px for touch targets */
  border-radius: 0.375rem; /* 6px */
  transition: all 0.2s ease-in-out;
}

.nav-item:hover {
  transform: translateX(0.25rem); /* 4px */
}

.nav-indicator {
  margin-left: auto;
  flex-shrink: 0;
}
```

### Action Button Indicators

#### Button States

```css
.btn-access-available {
  background-color: var(--available-500);
  color: white;
  border: 1px solid var(--available-600);
  cursor: pointer;
}

.btn-access-limited {
  background-color: var(--limited-500);
  color: white;
  border: 1px solid var(--limited-600);
  cursor: pointer;
}

.btn-access-restricted {
  background-color: var(--gray-100);
  color: var(--gray-400);
  border: 1px solid var(--gray-300);
  cursor: not-allowed;
  opacity: 0.6;
}
```

### Table Indicators

#### Row-Level Permissions

```css
.table-access-cell {
  position: relative;
  padding-right: 2.5rem; /* Space for indicator */
}

.table-access-indicator {
  position: absolute;
  right: 0.75rem; /* 12px */
  top: 50%;
  transform: translateY(-50%);
}
```

### Form Field Indicators

#### Field States

```css
.form-field-available {
  border-color: var(--available-500);
  background-color: white;
}

.form-field-limited {
  border-color: var(--limited-500);
  background-color: var(--limited-50);
}

.form-field-restricted {
  border-color: var(--restricted-500);
  background-color: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
}
```

## 4. Responsive Design

### Breakpoint System

```css
/* Mobile */
@media (max-width: 767px) {
  .access-indicator {
    width: 1.25rem; /* Smaller on mobile */
    height: 1.25rem;
  }

  .access-label {
    display: none; /* Hide labels on mobile */
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .access-indicator {
    width: 1.5rem;
    height: 1.5rem;
  }

  .access-label {
    font-size: 0.6875rem; /* Smaller text */
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .access-indicator {
    width: 1.5rem;
    height: 1.5rem;
  }

  .access-label {
    font-size: 0.75rem;
  }
}
```

### Touch Targets

```css
/* Minimum touch target size */
.touch-target {
  min-width: 2.75rem; /* 44px */
  min-height: 2.75rem;
  padding: 0.5rem; /* 8px */
}

/* Mobile-specific spacing */
@media (pointer: coarse) {
  .access-indicator {
    padding: 0.75rem; /* Larger tap area */
  }
}
```

## 5. Animation Guidelines

### Transition Properties

```css
.access-indicator {
  transition:
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out,
    background-color 0.25s ease-in-out,
    border-color 0.25s ease-in-out;
}

.access-indicator:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-access-hover);
}

.access-indicator:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-access-active);
}
```

### Loading States

```css
@keyframes access-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.access-indicator-loading {
  animation: access-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### State Changes

```css
@keyframes access-fade-in {
  from {
    opacity: 0;
    transform: translateY(0.25rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.access-indicator-enter {
  animation: access-fade-in 0.3s ease-out;
}
```

## 6. Accessibility Standards

### Color Contrast

```css
/* Ensure minimum contrast ratios */
.access-indicator {
  /* Light text on dark backgrounds - 4.5:1 ratio */
  color: white;
  background-color: var(--gold-500);
}

.access-indicator-light {
  /* Dark text on light backgrounds - 4.5:1 ratio */
  color: var(--gray-900);
  background-color: var(--gold-100);
}
```

### Focus States

```css
.access-indicator:focus {
  outline: 2px solid var(--investor-500);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}

.access-indicator:focus:not(:focus-visible) {
  outline: none; /* Hide outline if focus-visible is supported */
}
```

### Screen Reader Support

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Announce dynamic changes */
.access-announcement {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .access-indicator {
    transition: none;
    animation: none;
  }

  .access-indicator:hover {
    transform: none;
  }
}
```

## 7. Usage Patterns

### Do's

#### ✅ Clear Visual Hierarchy

```jsx
<AccessIndicator level="platinum" size="lg" />
<AccessIndicator level="gold" size="md" />
<AccessIndicator level="silver" size="sm" />
```

#### ✅ Consistent Placement

```jsx
<div className="flex items-center justify-between">
  <h2>User Management</h2>
  <AccessIndicator level="gold" />
</div>
```

#### ✅ Meaningful Tooltips

```jsx
<AccessIndicator
  level="gold"
  tooltip="Gold access required for user management"
/>
```

#### ✅ Accessible Markup

```jsx
<div
  role="img"
  aria-label="Gold level access indicator"
  aria-describedby="access-tooltip"
>
  <AccessIndicator level="gold" />
</div>
```

### Don'ts

#### ❌ Inconsistent Sizing

```jsx
// Bad
<AccessIndicator level="gold" size="lg" />
<AccessIndicator level="silver" size="sm" />

// Good
<AccessIndicator level="gold" size="md" />
<AccessIndicator level="silver" size="md" />
```

#### ❌ Color-Only Information

```jsx
// Bad
<div className="bg-gold-500">Gold Access</div>

// Good
<div className="flex items-center">
  <AccessIndicator level="gold" />
  <span>Gold Access</span>
</div>
```

#### ❌ Missing Labels

```jsx
// Bad
<AccessIndicator level="gold" showLabel={false} />

// Good
<AccessIndicator level="gold" showLabel={true} />
```

#### ❌ Ignoring Mobile

```jsx
// Bad
<div className="fixed right-4 top-4">
  <AccessIndicator level="gold" />
</div>

// Good
<div className="fixed right-4 top-4 md:right-8 md:top-8">
  <AccessIndicator level="gold" size="sm md:md" />
</div>
```

## 8. Testing Guidelines

### Visual Testing Checklist

- [ ] All access levels are visually distinct
- [ ] Color contrast meets WCAG AA standards
- [ ] Icons are clear and recognizable
- [ ] Text is legible at all sizes
- [ ] Hover states are clear and functional
- [ ] Focus states are visible and accessible

### Functional Testing Checklist

- [ ] Click/tap targets meet minimum size requirements
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces access level changes
- [ ] Tooltips display correctly
- [ ] Responsive behavior works across breakpoints
- [ ] Performance is acceptable (no lag)

### Accessibility Testing Checklist

- [ ] All indicators have proper ARIA labels
- [ ] Color is not the only indicator of state
- [ ] Reduced motion preferences are respected
- [ ] High contrast mode works correctly
- [ ] Focus management is logical
- [ ] Screen reader navigation is logical

## 9. Maintenance Guidelines

### Regular Reviews

- Quarterly review of color contrast ratios
- Annual accessibility audit
- User feedback collection on clarity
- Performance monitoring and optimization

### Update Process

1. Test changes against all access levels
2. Verify responsive behavior
3. Conduct accessibility testing
4. Update documentation
5. Communicate changes to development team

### Version Control

- Tag all design system updates
- Maintain changelog of visual changes
- Document deprecated patterns
- Provide migration guides for breaking changes

This comprehensive style guide ensures consistent, accessible, and maintainable access indicators across the Boosty Platform.
