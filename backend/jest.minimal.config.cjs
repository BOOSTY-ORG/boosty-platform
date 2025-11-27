module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/simple-no-db.test.js',
    '<rootDir>/tests/api/crm-messaging-endpoints.test.js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};