# Boosty Platform - Frontend

A modern React application for managing solar energy applications, investors, users, and transactions for Boosty Solar Energy Company.

## Features

- **Modern React Architecture**: Built with React 19, React Router, and modern hooks
- **Component-Based Structure**: Reusable components with consistent styling
- **State Management**: Context API for global state management
- **API Integration**: Axios-based API services with interceptors
- **Authentication**: JWT-based authentication with role-based access control
- **Responsive Design**: Tailwind CSS for responsive, mobile-first design
- **Type Safety**: JSDoc comments for better IDE support
- **Performance**: Code splitting and lazy loading for optimal performance

## Tech Stack

- **Frontend**: React 19, React Router DOM, Vite
- **Styling**: Tailwind CSS with custom components
- **HTTP Client**: Axios with interceptors
- **Date Handling**: date-fns
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Utilities**: Custom utility functions and validators

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── assets/
│       └── images/
├── src/
│   ├── api/                    # API service files
│   │   ├── index.js            # Axios configuration
│   │   ├── auth.js             # Authentication API
│   │   ├── dashboard.js         # Dashboard API
│   │   ├── investors.js         # Investor API
│   │   ├── users.js             # User API
│   │   ├── payments.js          # Payment API
│   │   ├── crm.js              # CRM API
│   │   └── reports.js           # Reports API
│   ├── components/              # Reusable components
│   │   ├── common/             # Common UI components
│   │   ├── auth/               # Authentication components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── investors/          # Investor components
│   │   ├── users/              # User components
│   │   ├── payments/           # Payment components
│   │   ├── crm/               # CRM components
│   │   └── reports/            # Report components
│   ├── context/                # React contexts
│   │   ├── AuthContext.jsx     # Authentication state
│   │   ├── AppContext.jsx      # Global app state
│   │   ├── DashboardContext.jsx # Dashboard state
│   │   ├── InvestorContext.jsx  # Investor state
│   │   ├── UserContext.jsx     # User state
│   │   ├── PaymentContext.jsx  # Payment state
│   │   ├── CRMContext.jsx       # CRM state
│   │   └── ReportContext.jsx   # Report state
│   ├── hooks/                  # Custom React hooks
│   ├── layouts/                # Layout components
│   │   ├── AuthLayout.jsx      # Authentication layout
│   │   └── DashboardLayout.jsx # Dashboard layout
│   ├── pages/                  # Page components
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── investors/          # Investor pages
│   │   ├── users/              # User pages
│   │   ├── payments/           # Payment pages
│   │   ├── crm/               # CRM pages
│   │   └── reports/            # Report pages
│   ├── routes/                 # Route definitions
│   │   └── index.js           # Main routes file
│   ├── services/               # Business logic services
│   ├── styles/                 # CSS and styling
│   │   └── index.css          # Main styles
│   ├── utils/                  # Utility functions
│   │   ├── auth.js            # Authentication utilities
│   │   ├── constants.js       # Application constants
│   │   ├── helpers.js         # Helper functions
│   │   ├── validators.js      # Form validators
│   │   ├── formatters.js      # Data formatters
│   │   ├── permissions.js     # Permission utilities
│   │   └── apiConfig.js       # API configuration
│   ├── App.jsx                 # Main App component
│   └── main.jsx                # Application entry point
├── .env.example               # Environment variables example
├── .env.local                # Local environment variables
├── .gitignore                # Git ignore file
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── tailwind.config.js        # Tailwind configuration
├── vite.config.js            # Vite configuration
└── README.md                # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API server running on port 7000

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Boosty-Platform/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:7000/api

# Application Configuration
VITE_APP_NAME=Boosty Platform
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=true
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## API Integration

The frontend is fully integrated with the backend API:

- **Base URL**: Configured via environment variables
- **Authentication**: JWT tokens with refresh mechanism
- **Error Handling**: Centralized error handling with user feedback
- **Request Interceptors**: Automatic token attachment and response handling
- **File Upload**: Support for document uploads with progress tracking

## State Management

Using React Context API for state management:

- **AuthContext**: User authentication and authorization
- **AppContext**: Global application state (theme, sidebar, notifications)
- **Module Contexts**: Dedicated contexts for each major feature
- **Custom Hooks**: Easy-to-use hooks for accessing context state

## Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Custom Components**: Reusable styled components
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Built-in theme switching support
- **Component Variants**: Consistent styling patterns

## Authentication & Authorization

- **Role-Based Access**: Different access levels (admin, manager, finance, support, user)
- **Route Protection**: Protected routes with role checking
- **Token Management**: JWT tokens with refresh mechanism
- **Permission System**: Granular permission checking

## Development Guidelines

### Code Style

- Use ES6+ features (arrow functions, destructuring, async/await)
- Follow the established naming conventions
- Write descriptive component and function names
- Use JSDoc comments for better documentation

### Component Structure

```jsx
// Component file structure
import React from 'react';
import { useContext } from 'react';

const ComponentName = () => {
  // Component logic
  
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

### API Service Structure

```javascript
// API service structure
import api from './index.js';

export const moduleAPI = {
  getAll: async (params = {}) => {
    return api.get('/endpoint', { params });
  },
  
  getById: async (id) => {
    return api.get(`/endpoint/${id}`);
  },
  
  create: async (data) => {
    return api.post('/endpoint', data);
  },
  
  update: async (id, data) => {
    return api.put(`/endpoint/${id}`, data);
  },
  
  delete: async (id) => {
    return api.delete(`/endpoint/${id}`);
  },
};
```

## Deployment

### Build for Production

```bash
npm run build
```

The build will be output to the `dist` directory.

### Environment-Specific Builds

Set the `VITE_NODE_ENV` environment variable:

```bash
# Production
VITE_NODE_ENV=production npm run build

# Development
VITE_NODE_ENV=development npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.