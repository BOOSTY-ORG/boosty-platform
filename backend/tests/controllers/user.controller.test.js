import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/express.js';

// Mock the user model
jest.mock('../../src/models/user.model.js');

describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('should return a list of users', async () => {
      const response = await request(app)
        .get('/users')
        .expect(200);

      // Add your assertions here
      expect(response.body).toBeDefined();
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      // Add your assertions here
      expect(response.body).toBeDefined();
    });
  });
});