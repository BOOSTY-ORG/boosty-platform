// MongoDB initialization script for Boosty Platform
// This script creates the initial database structure and users

// Switch to the application database
db = db.getSiblingDB('boosty_prod');

// Create application user with read/write permissions
db.createUser({
  user: 'boosty_user',
  pwd: 'boosty_password', // Change this in production
  roles: [
    {
      role: 'readWrite',
      db: 'boosty_prod'
    }
  ]
});

// Create collections with validation schemas
// Users collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        role: {
          enum: ['admin', 'manager', 'user']
        },
        isActive: {
          bsonType: 'bool'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Investors collection
db.createCollection('investors', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'investmentAmount'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        investmentAmount: {
          bsonType: 'number',
          minimum: 0
        },
        investmentDate: {
          bsonType: 'date'
        },
        status: {
          enum: ['pending', 'active', 'completed', 'cancelled']
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Solar Applications collection
db.createCollection('solarapplications', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'propertyType'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        propertyType: {
          enum: ['residential', 'commercial', 'industrial']
        },
        status: {
          enum: ['pending', 'approved', 'rejected', 'completed']
        },
        applicationDate: {
          bsonType: 'date'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Transactions collection
db.createCollection('transactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'amount', 'type'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        amount: {
          bsonType: 'number'
        },
        type: {
          enum: ['investment', 'payment', 'refund', 'withdrawal']
        },
        status: {
          enum: ['pending', 'completed', 'failed', 'cancelled']
        },
        transactionDate: {
          bsonType: 'date'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// KYC Documents collection
db.createCollection('kycdocuments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'documentType'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        documentType: {
          enum: ['passport', 'driver_license', 'national_id', 'utility_bill', 'bank_statement']
        },
        documentUrl: {
          bsonType: 'string'
        },
        status: {
          enum: ['pending', 'approved', 'rejected', 'expired']
        },
        expiryDate: {
          bsonType: 'date'
        },
        uploadedAt: {
          bsonType: 'date'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Communication Templates collection
db.createCollection('communicationtemplates', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'subject', 'body'],
      properties: {
        name: {
          bsonType: 'string'
        },
        type: {
          enum: ['email', 'sms', 'push']
        },
        subject: {
          bsonType: 'string'
        },
        body: {
          bsonType: 'string'
        },
        isActive: {
          bsonType: 'bool'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create indexes for better query performance
// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ createdAt: -1 });

// Investors indexes
db.investors.createIndex({ userId: 1 });
db.investors.createIndex({ investmentDate: -1 });
db.investors.createIndex({ status: 1 });

// Solar Applications indexes
db.solarapplications.createIndex({ userId: 1 });
db.solarapplications.createIndex({ applicationDate: -1 });
db.solarapplications.createIndex({ status: 1 });
db.solarapplications.createIndex({ propertyType: 1 });

// Transactions indexes
db.transactions.createIndex({ userId: 1 });
db.transactions.createIndex({ transactionDate: -1 });
db.transactions.createIndex({ type: 1 });
db.transactions.createIndex({ status: 1 });

// KYC Documents indexes
db.kycdocuments.createIndex({ userId: 1 });
db.kycdocuments.createIndex({ documentType: 1 });
db.kycdocuments.createIndex({ status: 1 });
db.kycdocuments.createIndex({ expiryDate: 1 });

// Communication Templates indexes
db.communicationtemplates.createIndex({ type: 1 });
db.communicationtemplates.createIndex({ isActive: 1 });

// Insert default admin user (change password in production)
db.users.insertOne({
  email: 'admin@boosty.com',
  password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq9w5GS', // Password: admin123
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert default communication templates
db.communicationtemplates.insertMany([
  {
    name: 'Welcome Email',
    type: 'email',
    subject: 'Welcome to Boosty Platform',
    body: 'Dear {{name}},\n\nWelcome to Boosty Platform! We are excited to have you on board.\n\nBest regards,\nBoosty Team',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'KYC Approval',
    type: 'email',
    subject: 'Your KYC Documents Have Been Approved',
    body: 'Dear {{name}},\n\nYour KYC documents have been successfully approved. You can now access all platform features.\n\nBest regards,\nBoosty Team',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Investment Confirmation',
    type: 'email',
    subject: 'Investment Confirmation',
    body: 'Dear {{name}},\n\nYour investment of {{amount}} has been successfully processed.\n\nBest regards,\nBoosty Team',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('MongoDB initialization completed successfully!');