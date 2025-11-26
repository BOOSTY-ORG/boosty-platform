# SignIn Component

A comprehensive authentication component that provides separate sign-in experiences for admin and user roles.

## Components

### SignIn (Default Export)
The main component that renders either AdminSignIn or UserSignIn based on the `type` prop.

**Props:**
- `type` (string): Determines which sign-in variant to render. Accepts `'admin'` or `'user'`. Defaults to `'user'`.

**Example:**
```jsx
import SignIn from '@/components/auth/SignIn';

// Render Admin SignIn
<SignIn type="admin" />

// Render User SignIn (default)
<SignIn type="user" />
<SignIn /> // Also renders User SignIn
```

### AdminSignIn (Named Export)
A specialized sign-in form for administrators with additional security features.

**Features:**
- Admin Email field
- Admin Password field with show/hide toggle
- Admin ID field for additional authentication
- "Remember this device" checkbox
- "Need help?" link
- Security notice box with warning icon
- Circular back button with border

**Styling:**
- Uses primary color scheme (blue-500)
- Security notice in amber color scheme
- Hover effects on all interactive elements
- Focus states for accessibility

### UserSignIn (Named Export)
A streamlined sign-in form for regular users.

**Features:**
- Email field
- Password field with show/hide toggle
- "Remember me" checkbox
- "Forgot Password?" link
- "Don't have an account? Sign Up" link at the bottom
- Simple back button with arrow

**Styling:**
- Uses primary color scheme (blue-500)
- Hover effects on all interactive elements
- Focus states for accessibility

## Implementation Details

### State Management
The component uses React's built-in `useState` for managing:
- Form data (email, password, adminId)
- Validation errors
- Password visibility toggle
- Remember device checkbox state
- Loading state during form submission

### Validation
Uses the existing validators from `src/utils/validators.js`:
- `validateEmail` for email fields
- `validatePassword` for password fields
- `validateRequired` for the Admin ID field

### Authentication
Integrates with the existing `AuthContext`:
- Uses `login` function from `useAuth` hook
- Handles authentication errors
- Redirects to dashboard on successful login
- Includes role information in login request

### Navigation
- Back buttons navigate to `/auth/roles`
- "Need help?" links to `/auth/help`
- "Forgot Password?" links to `/auth/forgot-password`
- "Sign Up" links to `/auth/register`

### Icons
All icons are imported from `lucide-react`:
- `ArrowLeft` for Admin back button
- `ChevronLeft` for User back button
- `Eye` / `EyeOff` for password visibility toggle
- `AlertCircle` for error messages and security notice

## Usage in the Application

### Login Page Integration
The SignIn component is used in `src/pages/auth/Login.jsx`:
```jsx
import SignIn from '../../components/auth/SignIn.jsx';

const Login = () => {
  const [userRole, setUserRole] = useState('user');
  
  // ... role detection logic ...
  
  return <SignIn type={userRole} />;
};
```

### Role Selection
The Roles page (`src/pages/auth/Roles.jsx`) navigates to the Login page with a role parameter:
```jsx
// For admin login
navigate('/auth/login?role=admin');

// For user login
navigate('/auth/login?role=user');
```

## Styling

### Color Scheme
- Primary colors: Uses the `primary` color palette from Tailwind config (blue-500)
- Security notices: Uses `warning` color palette (amber)
- Error states: Uses `danger` color palette (red)

### Responsive Design
- Mobile-first approach
- Responsive grid layouts
- Touch-friendly button sizes
- Proper spacing for different screen sizes

### Transitions
- Smooth hover effects
- Color transitions on interactive elements
- Loading states with spinning animation

## Testing

A test page is available at `/test/signin` that renders both AdminSignIn and UserSignIn components side by side for comparison and testing.

## File Structure
```
src/components/auth/
├── SignIn.jsx        # Main component implementation
├── index.js          # Export definitions
└── README.md         # This documentation
```

## Dependencies
- React (for component structure and hooks)
- React Router (for navigation)
- Lucide React (for icons)
- AuthContext (for authentication)
- Validators utility (for form validation)