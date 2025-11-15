# Boosty Platform

A comprehensive MERN stack application for Boosty, a solar energy company platform targeting Nigeria and West Africa. This admin dashboard and CRM system enables management of solar energy applications, investors, users, and transactions.

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Getting Started](#getting-started)
  - [Starting Both Frontend and Backend Concurrently (Recommended)](#starting-both-frontend-and-backend-concurrently-recommended)
  - [Starting Only the Backend](#starting-only-the-backend)
  - [Starting Only the Frontend](#starting-only-the-frontend)
- [Environment Setup](#environment-setup)
  - [Backend Environment Variables](#backend-environment-variables)
  - [Frontend Environment Variables](#frontend-environment-variables)
- [Available Scripts](#available-scripts)
  - [Root Scripts](#root-scripts)
  - [Backend Scripts](#backend-scripts)
  - [Frontend Scripts](#frontend-scripts)
- [Default Ports and URLs](#default-ports-and-urls)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Development Workflow](#development-workflow)

## Project Overview

Boosty Platform is an AI-powered solar energy management system that allows:

- Users to apply for solar energy systems funded by investors
- Repayment calculations based on creditworthiness
- AI-powered cost calculations based on household appliances
- Admin dashboard for managing investors, solving user problems, and handling payments
- Comprehensive CRM functionality for customer relationship management

The platform consists of:

- **Backend**: Node.js/Express API with MongoDB (ES modules)
- **Frontend**: React application with Vite
- **Database**: MongoDB with Mongoose ODM

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (running locally or MongoDB Atlas connection)
- [Git](https://git-scm.com/) for version control

### System Requirements

- Operating System: Windows 10+, macOS 10.15+, or Linux
- Memory: Minimum 4GB RAM (8GB recommended)
- Storage: Minimum 2GB free space
- Network: Internet connection for npm package installation

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Boosty-Platform
   ```

2. **Install root dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. **Set up environment variables** (see [Environment Setup](#environment-setup) section)

6. **Ensure MongoDB is running** on your system or update the connection string in your backend environment variables

## Getting Started

### Starting Both Frontend and Backend Concurrently (Recommended)

This is the easiest way to start the entire application for development:

```bash
npm run dev
```

This command will:
- Start the backend server on port 7000
- Start the frontend development server on port 3000
- Automatically reload when changes are made to either frontend or backend code

### Starting Only the Backend

To run only the backend server:

```bash
cd backend
npm run dev
```

Or for production:
```bash
cd backend
npm start
```

The backend will be available at `http://localhost:7000`

### Starting Only the Frontend

To run only the frontend development server:

```bash
cd frontend
npm run dev
```

For production build:
```bash
cd frontend
npm run build
npm run preview
```

The frontend will be available at `http://localhost:3000` (development) or `http://localhost:4173` (preview)

## Environment Setup

### Backend Environment Variables

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit the `.env` file with your configuration:

   ```env
   # Server Configuration
   PORT=7000
   NODE_ENV=development

   # Database Configuration
   DATABASE_URL=mongodb://localhost:27017/boosty

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d

   # Email Configuration (if using nodemailer)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password

   # Other Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

### Frontend Environment Variables

1. Copy the example environment file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit the `.env` file with your configuration. Key variables include:

   ```env
   # API Configuration
   VITE_API_BASE_URL=http://localhost:7000/api

   # WebSocket Configuration
   VITE_WS_URL=ws://localhost:7000

   # Application Configuration
   VITE_APP_NAME=Boosty Platform
   VITE_APP_VERSION=1.0.0
   VITE_APP_DESCRIPTION=Solar Energy Management Platform

   # Environment
   VITE_NODE_ENV=development

   # Feature Flags
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_DEBUG=true
   VITE_ENABLE_MOCK_DATA=false

   # Default Configuration
   VITE_DEFAULT_THEME=light
   VITE_DEFAULT_CURRENCY=NGN
   VITE_DEFAULT_TIMEZONE=Africa/Lagos
   ```

## Available Scripts

### Root Scripts

These scripts are available from the root directory:

```bash
npm run dev          # Start both frontend and backend concurrently
```

### Backend Scripts

Available in the `backend/` directory:

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run build        # Build for production
npm run build-client # Build frontend from backend directory
```

### Frontend Scripts

Available in the `frontend/` directory:

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test             # Run tests
```

## Default Ports and URLs

| Service | Default Port | URL | Description |
|---------|--------------|-----|-------------|
| Backend API | 7000 | http://localhost:7000 | Express server and API endpoints |
| Frontend Dev | 3000 | http://localhost:3000 | Vite development server |
| Frontend Preview | 4173 | http://localhost:4173 | Production build preview |
| MongoDB | 27017 | mongodb://localhost:27017 | Database connection |

### API Endpoints

- Authentication: `/auth/*`
- Users: `/users/*`
- Metrics: `/metrics/*`
- Dashboard: `/api/dashboard/*`

## Project Structure

```
Boosty-Platform/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── utils/           # Utility functions
│   │   └── server.js        # Entry point
│   ├── tests/               # Test files
│   └── scripts/             # Utility scripts
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── api/             # API service functions
│   │   ├── context/         # React contexts
│   │   ├── utils/           # Utility functions
│   │   └── main.jsx         # Entry point
│   └── public/              # Static assets
├── docs/                    # Documentation
└── README.md               # This file
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Error: `EADDRINUSE: address already in use :::7000`
   - Solution: Kill the process using the port or change the PORT in your .env file
   ```bash
   # Find and kill process on port 7000 (Windows)
   netstat -ano | findstr :7000
   taskkill /PID <PID> /F

   # Find and kill process on port 7000 (macOS/Linux)
   lsof -ti:7000 | xargs kill -9
   ```

2. **MongoDB connection failed**
   - Error: `MongoNetworkError: failed to connect to server`
   - Solution: Ensure MongoDB is running or update DATABASE_URL in your .env file

3. **Module not found errors**
   - Error: `Error: Cannot find module 'module-name'`
   - Solution: Run `npm install` in the appropriate directory (root, backend, or frontend)

4. **CORS errors**
   - Error: `Access to fetch at 'http://localhost:7000' from origin 'http://localhost:3000' has been blocked by CORS policy`
   - Solution: Ensure CORS_ORIGIN in backend .env matches your frontend URL

5. **Environment variables not loading**
   - Error: Configuration values showing as undefined
   - Solution: Verify .env files exist in correct directories and have proper formatting

### Debug Mode

Enable debug mode by setting these environment variables:

```env
# Backend
NODE_ENV=development

# Frontend
VITE_ENABLE_DEBUG=true
```

### Logs

- Backend logs appear in the terminal where the server is running
- Frontend logs appear in the browser console and Vite dev server terminal
- For detailed API logs, use browser developer tools Network tab

## Development Workflow

### Recommended Workflow

1. **Start with the concurrent development server:**
   ```bash
   npm run dev
   ```

2. **Make changes to your code**
   - Frontend changes will auto-reload in the browser
   - Backend changes will auto-restart the server

3. **Run tests before committing:**
   ```bash
   # Backend tests
   cd backend && npm test

   # Frontend tests
   cd frontend && npm test
   ```

4. **Lint your code:**
   ```bash
   # Backend linting
   cd backend && npm run lint:fix

   # Frontend linting
   cd frontend && npm run lint
   ```

### Code Style

- Use ES6+ features (arrow functions, destructuring, async/await)
- Follow the existing code style and patterns
- Use 2 spaces for indentation
- Use single quotes for strings
- Include semicolons at the end of statements

### Git Workflow

1. Create feature branches from `develop`
2. Make small, atomic commits with descriptive messages
3. Test your changes before creating pull requests
4. Ensure all tests pass and code is properly linted

### Database Management

- Use MongoDB Compass or Studio 3T for database visualization
- Seed data can be generated using scripts in `backend/scripts/`
- Always backup production data before making schema changes

### API Development

- Follow RESTful conventions
- Use proper HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Return consistent JSON response format
- Handle errors appropriately with proper status codes
- Use middleware for authentication, validation, and rate limiting

### Frontend Development

- Use functional components with hooks
- Follow the existing component structure
- Use Tailwind CSS for styling
- Implement proper error boundaries
- Use React Router for navigation
- Manage state with appropriate patterns (Context API, local state, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the package.json file for details.
