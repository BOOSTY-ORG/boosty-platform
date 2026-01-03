# Access Indicator Design System for Boosty Platform

## 1. Access Level Tiers and Visual Hierarchy

### Existing Role Hierarchy (from backend/src/services/roleManagement.service.js)

```
superadmin: 6
admin: 5
manager: 4
analyst: 3
investor: 2
user: 1
```

### Proposed Access Level Tiers for UI Indicators

#### Tier 1: Platinum (superadmin)

- **Access Level**: Full system access
- **Visual Indicator**: Platinum gradient with crown icon
- **Color**: #E5E4E2 (Platinum) with #8B7355 (Gold) accents
- **Permissions**: All system functions, user management, configuration

#### Tier 2: Gold (admin)

- **Access Level**: Administrative access
- **Visual Indicator**: Gold gradient with shield icon
- **Color**: #FFD700 (Gold) with #B8860B (Dark Gold) accents
- **Permissions**: User management, financial approvals, system configuration

#### Tier 3: Silver (manager)

- **Access Level**: Management access
- **Visual Indicator**: Silver gradient with star icon
- **Color**: #C0C0C0 (Silver) with #808080 (Gray) accents
- **Permissions**: Team management, reports, limited financial access

#### Tier 4: Bronze (analyst)

- **Access Level**: Analyst access
- **Visual Indicator**: Bronze gradient with chart icon
- **Color**: #CD7F32 (Bronze) with #8B4513 (Saddle Brown) accents
- **Permissions**: View analytics, generate reports, read-only financial data

#### Tier 5: Investor (investor)

- **Access Level**: Investor portal access
- **Visual Indicator**: Blue gradient with investment icon
- **Color**: #3B82F6 (Primary Blue) with #1E40AF (Dark Blue) accents
- **Permissions**: Personal portfolio, investments, limited reports

#### Tier 6: Standard (user)

- **Access Level**: Basic user access
- **Visual Indicator**: Gray gradient with user icon
- **Color**: #6B7280 (Gray) with #374151 (Dark Gray) accents
- **Permissions**: Basic profile, limited features

## 2. Access States

### Permission States

1. **Available** - Full access to feature
2. **Limited** - Partial access with restrictions
3. **Restricted** - No access, feature visible but disabled
4. **Hidden** - Feature not visible to user

### Visual States

- **Full Access**: Bright color, enabled state, checkmark icon
- **Limited Access**: Muted color, warning icon, tooltip explaining limitations
- **No Access**: Grayed out, lock icon, tooltip explaining restrictions
- **Upgrade Required**: Special styling with upgrade prompt

## 3. Icon System

### Access Level Icons

- **Platinum**: Crown (👑) - Ultimate authority
- **Gold**: Shield (🛡️) - Protection and admin rights
- **Silver**: Star (⭐) - Management excellence
- **Bronze**: Chart (📊) - Analytics focus
- **Investor**: Investment (💰) - Financial focus
- **Standard**: User (👤) - Basic user

### State Icons

- **Available**: Checkmark (✓)
- **Limited**: Warning triangle (⚠️)
- **Restricted**: Lock (🔒)
- **Hidden**: Eye slash (🚫)

## 4. Color Palette

### Primary Colors (matching existing Tailwind config)

```css
--platinum-primary: #e5e4e2;
--platinum-secondary: #8b7355;
--gold-primary: #ffd700;
--gold-secondary: #b8860b;
--silver-primary: #c0c0c0;
--silver-secondary: #808080;
--bronze-primary: #cd7f32;
--bronze-secondary: #8b4513;
--investor-primary: #3b82f6;
--investor-secondary: #1e40af;
--standard-primary: #6b7280;
--standard-secondary: #374151;
```

### State Colors

```css
--available: #22C55E; (success)
--limited: #F59E0B; (warning)
--restricted: #EF4444; (danger)
--hidden: #9CA3AF; (gray)
```

## 5. Typography

### Access Level Labels

- **Platinum**: 12px, font-weight 600, uppercase
- **Gold**: 12px, font-weight 600, uppercase
- **Silver**: 12px, font-weight 500, uppercase
- **Bronze**: 12px, font-weight 500, uppercase
- **Investor**: 12px, font-weight 500, title-case
- **Standard**: 12px, font-weight 400, title-case

### Status Labels

- **Available**: 11px, font-weight 500, success color
- **Limited**: 11px, font-weight 500, warning color
- **Restricted**: 11px, font-weight 500, danger color

## 6. Component Structure

### Base AccessIndicator Component

```jsx
<AccessIndicator
  level="platinum" | "gold" | "silver" | "bronze" | "investor" | "standard"
  state="available" | "limited" | "restricted" | "hidden"
  size="sm" | "md" | "lg"
  showLabel={boolean}
  showIcon={boolean}
  tooltip={string}
  className={string}
/>
```

### Specialized Components

1. **NavigationAccessIndicator** - For sidebar menu items
2. **ActionAccessIndicator** - For buttons and actions
3. **HeaderAccessIndicator** - For section headers
4. **TableAccessIndicator** - For data table rows
5. **FormFieldAccessIndicator** - For form inputs

## 7. Animation and Transitions

### Hover Effects

- Scale: 1.05 transform
- Shadow: 0 4px 12px rgba(0,0,0,0.15)
- Duration: 200ms ease-in-out

### State Changes

- Fade: opacity transition 300ms
- Slide: transform 200ms
- Color: background-color 250ms

### Loading States

- Pulse animation for pending access checks
- Skeleton loaders for content areas

## 8. Responsive Behavior

### Desktop (≥1024px)

- Full indicators with labels and icons
- Hover tooltips with detailed information
- Compact mode option for dense interfaces

### Tablet (768px - 1023px)

- Icons with abbreviated labels
- Touch-friendly target sizes (44px minimum)
- Simplified tooltips

### Mobile (<768px)

- Icon-only indicators
- Tap-to-reveal details
- Bottom sheet for access information

## 9. Accessibility Features

### Screen Reader Support

- ARIA labels for all indicators
- Live regions for dynamic access changes
- Semantic HTML structure

### Keyboard Navigation

- Tab order preservation
- Focus indicators
- Keyboard shortcuts for access level views

### Visual Accessibility

- High contrast mode support
- Reduced motion preferences
- Color-blind friendly patterns

## 10. Implementation Guidelines

### When to Use Indicators

1. **Navigation**: Show access level for menu items
2. **Actions**: Indicate permission for buttons/links
3. **Data**: Show row-level access in tables
4. **Forms**: Mark editable/readonly fields
5. **Sections**: Display section access requirements

### Placement Rules

1. **Consistent positioning** - Same location across similar components
2. **Proximity** - Close to related content
3. **Hierarchy** - More prominent for higher access levels
4. **Context** - Relevant to the content being protected

### Error Handling

1. **Access denied** - Clear messaging with upgrade options
2. **Permission changes** - Real-time UI updates
3. **Network issues** - Graceful degradation
4. **Edge cases** - Fallback displays

## 11. Testing Requirements

### Visual Testing

- Color contrast validation
- Icon visibility checks
- Responsive layout verification

### Functional Testing

- Permission enforcement
- State transitions
- User interaction flows

### Accessibility Testing

- Screen reader compatibility
- Keyboard navigation
- Color blindness simulation

## 12. Performance Considerations

### Optimization

- Lazy load indicator components
- Cache access level data
- Minimize re-renders

### Bundle Size

- Tree-shake unused indicators
- Optimize icon assets
- Code splitting by access level

## 13. Migration Strategy

### Phase 1: Core Components

- Implement base AccessIndicator
- Create specialized components
- Add to design system

### Phase 2: Integration

- Update navigation components
- Modify action buttons
- Enhance data tables

### Phase 3: Advanced Features

- Add animations
- Implement responsive behavior
- Complete accessibility features
