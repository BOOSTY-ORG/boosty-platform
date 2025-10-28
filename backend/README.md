# Boosty Backend

This is the backend API for the Boosty platform, built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- RESTful API endpoints
- MongoDB database integration
- JWT-based authentication
- Email notifications with Nodemailer
- Comprehensive testing with Jest
- Code linting with ESLint
- Docker support for containerization

## Prerequisites

- Node.js 20.x or higher
- MongoDB 5.0 or higher
- npm or yarn

## Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Update the following variables in your `.env` file:

- `PORT`: Server port (default: 7000)
- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `JWT_EXPIRE`: JWT token expiration time
- `EMAIL_HOST`: SMTP server host
- `EMAIL_PORT`: SMTP server port
- `EMAIL_USER`: SMTP username
- `EMAIL_PASS`: SMTP password
- `CORS_ORIGIN`: Allowed CORS origins

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- Unit tests are located in the `tests/` directory
- Test files should follow the naming convention `*.test.js`
- Integration tests should be placed in appropriate subdirectories

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Formatting

The project uses Prettier for code formatting. Configuration is in `.prettierrc`.

## Docker

### Build Docker Image

```bash
docker build -t boosty-backend .
```

### Run with Docker Compose

```bash
# Development environment
docker-compose up app

# Run tests
docker-compose up test
```

## CI/CD

The backend has a dedicated CI/CD pipeline configured in `.github/workflows/backend-ci.yml` that:

- Runs tests on every push and pull request
- Performs code linting
- Generates test coverage reports
- Creates deployment artifacts for production
- Deploys to production when merged to master

## Deployment

### Using the Deployment Script

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual Deployment

1. Install production dependencies:
   ```bash
   npm ci --only=production
   ```
2. Set environment variables
3. Start the application:
   ```bash
   npm start
   ```

## API Documentation

API endpoints are documented in the route files located in `src/routes/`. The main routes are:

- `/auth` - Authentication endpoints
- `/users` - User management endpoints

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route controllers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── helpers/         # Utility functions
│   ├── express.js       # Express app configuration
│   └── server.js        # Server entry point
├── tests/               # Test files
├── scripts/             # Deployment and utility scripts
├── .env.example         # Environment variables template
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
└── package.json         # Project dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the ISC License.