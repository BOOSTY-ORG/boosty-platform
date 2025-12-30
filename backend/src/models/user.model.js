import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import UserNotificationPreferences from './userNotificationPreferences.model.js';
import RoleManagementService from '../services/roleManagement.service.js';
import encryptionService from '../services/encryption.service.js';
import {
  encryptDatabaseFields,
  decryptDatabaseFields,
} from '../middleware/encryption.middleware.js';

const SALT_WORK_FACTOR = 10;
const userSchema = new mongoose.Schema(
  {
    // Schema definition
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
    },
    email: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, 'Please fill a valid email address.'],
      set: function (value) {
        // Store original value for validation before encryption
        this._originalEmail = value;
        return value;
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [6, 'Password must be at least 6 characters long.'],
    },
    resetToken: { type: String },
    tokenExpiry: { type: Date },
    // Related data for exports
    applications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SolarApplication',
      },
    ],
    installations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Installation',
      },
    ],
    communications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Communication',
      },
    ],
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KYCDocument',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'active',
    },
    phone: {
      type: mongoose.Schema.Types.Mixed,
      trim: true,
      set: function (value) {
        this._originalPhone = value;
        return value;
      },
    },
    address: {
      street: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalAddress = this._originalAddress || {};
          this._originalAddress.street = value;
          return value;
        },
      },
      city: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalAddress = this._originalAddress || {};
          this._originalAddress.city = value;
          return value;
        },
      },
      state: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalAddress = this._originalAddress || {};
          this._originalAddress.state = value;
          return value;
        },
      },
      postalCode: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalAddress = this._originalAddress || {};
          this._originalAddress.postalCode = value;
          return value;
        },
      },
      country: {
        type: mongoose.Schema.Types.Mixed,
        set: function (value) {
          this._originalAddress = this._originalAddress || {};
          this._originalAddress.country = value;
          return value;
        },
      },
    },
    // Notification preferences reference
    notificationPreferences: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserNotificationPreferences',
      index: true,
    },
    // User type for preference defaults (legacy field for backward compatibility)
    userType: {
      type: String,
      enum: ['standard', 'investor', 'admin', 'business'],
      default: 'standard',
      index: true,
    },
    // Explicit role field for role-based access control
    role: {
      type: String,
      enum: ['user', 'investor', 'analyst', 'manager', 'admin', 'superadmin'],
      default: 'user',
      index: true,
    },
    // Granular permissions array for additional access control
    permissions: [
      {
        type: String,
        // Format: "category:action" (e.g., "user_management:create")
        validate: {
          validator: function (v) {
            return /^[\w_]+:[\w_]+$/.test(v);
          },
          message: 'Permission must be in format "category:action"',
        },
      },
    ],
    // Role history tracking
    roleHistory: [
      {
        previousRole: {
          type: String,
          enum: [
            'user',
            'investor',
            'analyst',
            'manager',
            'admin',
            'superadmin',
          ],
        },
        newRole: {
          type: String,
          enum: [
            'user',
            'investor',
            'analyst',
            'manager',
            'admin',
            'superadmin',
          ],
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],
    // Notification settings
    notificationSettings: {
      // Legacy fields for backward compatibility
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true, // Timestamps
  }
);

// Virtual password salt stored implicitly within the hash
userSchema.virtual('passwordSalt').get(function () {
  return undefined;
});

// Pre-save Hook for encryption
userSchema.pre('save', encryptDatabaseFields('user'));

// Pre-save Hook for password hashing
userSchema.pre('save', async function (next) {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    // Hash the password along with the salt
    const hashedPassword = await bcrypt.hash(user.password, salt);
    // Replace the plain text password with the hashed one
    user.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance Method for Authentication
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    console.log('[DEBUG] Comparing password for user:', this.email);
    console.log('[DEBUG] Has stored password hash:', !!this.password);
    console.log('[DEBUG] Candidate password provided:', !!candidatePassword);

    const result = await bcrypt.compare(candidatePassword, this.password);
    console.log('[DEBUG] bcrypt.compare result:', result);

    return result;
  } catch (error) {
    console.error('[DEBUG] Password comparison error:', error);
    return false;
  }
};

// Instance methods for notification preferences
userSchema.methods.getNotificationPreferences = async function () {
  try {
    if (this.notificationPreferences) {
      const { default: UserNotificationPreferences } = await import(
        './userNotificationPreferences.model.js'
      );
      return await UserNotificationPreferences.findById(
        this.notificationPreferences
      );
    } else {
      // Create preferences if they don't exist
      const { default: NotificationPreferencesService } = await import(
        '../services/notification/notificationPreferences.service.js'
      );
      const preferencesService = new NotificationPreferencesService();

      const preferences = await preferencesService.createDefaultPreferences(
        this._id.toString(),
        {
          email: this.email,
          phone: this.phone,
          userType: this.userType || 'standard',
        }
      );

      this.notificationPreferences = preferences._id;
      await this.save();

      return preferences;
    }
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    throw new Error('Failed to get notification preferences');
  }
};

userSchema.methods.updateNotificationPreferences = async function (updates) {
  try {
    const { default: NotificationPreferencesService } = await import(
      '../services/notification/notificationPreferences.service.js'
    );
    const preferencesService = new NotificationPreferencesService();

    return await preferencesService.updatePreferences(
      this._id.toString(),
      updates
    );
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw new Error('Failed to update notification preferences');
  }
};

userSchema.methods.isNotificationChannelEnabled = async function (channel) {
  try {
    const { default: NotificationPreferencesService } = await import(
      '../services/notification/notificationPreferences.service.js'
    );
    const preferencesService = new NotificationPreferencesService();

    return await preferencesService.isChannelEnabled(
      this._id.toString(),
      channel
    );
  } catch (error) {
    console.error('Failed to check notification channel:', error);
    return false;
  }
};

userSchema.methods.isNotificationCategoryEnabled = async function (category) {
  try {
    const { default: NotificationPreferencesService } = await import(
      '../services/notification/notificationPreferences.service.js'
    );
    const preferencesService = new NotificationPreferencesService();

    return await preferencesService.isCategoryEnabled(
      this._id.toString(),
      category
    );
  } catch (error) {
    console.error('Failed to check notification category:', error);
    return false;
  }
};

// Instance methods for role management
userSchema.methods.hasRole = function (requiredRoles) {
  // Static import to avoid async issues in schema methods
  return RoleManagementService.hasRole(this.role, requiredRoles);
};

userSchema.methods.hasPermission = function (category, action) {
  // Static import to avoid async issues in schema methods
  return RoleManagementService.hasPermission(this.role, category, action);
};

userSchema.methods.getPermissions = async function () {
  return RoleManagementService.getRolePermissions(this.role);
};

userSchema.methods.assignRole = async function (
  newRole,
  changedBy,
  reason = ''
) {
  return await RoleManagementService.assignRole(
    this._id,
    newRole,
    changedBy,
    reason
  );
};

userSchema.methods.grantPermissions = async function (permissions, grantedBy) {
  return await RoleManagementService.grantPermissions(
    this._id,
    permissions,
    grantedBy
  );
};

userSchema.methods.revokePermissions = async function (permissions, revokedBy) {
  return await RoleManagementService.revokePermissions(
    this._id,
    permissions,
    revokedBy
  );
};

// Static methods for notification preferences
userSchema.statics.findWithNotificationPreferences = function (
  filter = {},
  options = {}
) {
  return this.find(filter)
    .populate('notificationPreferences')
    .setOptions(options);
};

userSchema.statics.findOneWithNotificationPreferences = function (
  filter = {},
  options = {}
) {
  return this.findOne(filter)
    .populate('notificationPreferences')
    .setOptions(options);
};

// Pre-save middleware to create notification preferences
userSchema.pre('save', async function (next) {
  const user = this;

  // Only create preferences if user is new and doesn't have preferences yet
  if (user.isNew && !user.notificationPreferences) {
    try {
      // Check if preferences already exist
      const existingPrefs = await UserNotificationPreferences.findOne({
        userId: user._id,
      });

      if (!existingPrefs) {
        // Import NotificationPreferencesService dynamically to avoid circular dependency
        const { default: NotificationPreferencesService } = await import(
          '../services/notification/notificationPreferences.service.js'
        );
        const preferencesService = new NotificationPreferencesService();

        // Create default preferences
        const preferences = await preferencesService.createDefaultPreferences(
          user._id.toString(),
          {
            email: user.email,
            phone: user.phone,
            userType: user.userType || 'standard',
          }
        );

        user.notificationPreferences = preferences._id;
      }
    } catch (error) {
      console.error('Failed to create notification preferences:', error);
      // Don't fail user creation, just log the error
    }
  }

  next();
});

// Pre-save middleware for role management and backward compatibility
userSchema.pre('save', async function (next) {
  const user = this;

  // Handle role migration from userType to role field
  if (user.isNew || user.isModified('userType')) {
    // If role is not set but userType is, migrate userType to role
    if (!user.role && user.userType) {
      const userTypeToRoleMap = {
        standard: 'user',
        investor: 'investor',
        admin: 'admin',
        business: 'user', // Default business users to 'user' role
      };

      user.role = userTypeToRoleMap[user.userType] || 'user';
    }
  }

  // Ensure role is always set
  if (!user.role) {
    user.role = 'user';
  }

  // Log role changes
  if (user.isModified('role') && !user.isNew) {
    try {
      // Get the original document to compare
      const originalDoc = await this.constructor.findById(this._id);
      if (originalDoc && originalDoc.role !== user.role) {
        // Add to role history if not already present
        const roleHistory = user.roleHistory || [];
        roleHistory.push({
          previousRole: originalDoc.role,
          newRole: user.role,
          changedBy: user._id, // Self-change for now
          changedAt: new Date(),
          reason: 'Role migration',
        });
        user.roleHistory = roleHistory;
      }
    } catch (error) {
      console.error('Error in role migration pre-save:', error);
      // Don't fail the save, just log the error
    }
  }

  next();
});

// Post-save middleware to migrate legacy notification settings
userSchema.post('save', async function (doc) {
  const user = doc;

  // Only migrate if user has legacy settings and no modern preferences
  if (
    user.isModified &&
    (user.isModified('notificationSettings') ||
      user.isModified('emailNotifications'))
  ) {
    try {
      const existingPrefs = await UserNotificationPreferences.findOne({
        userId: user._id,
      });

      if (existingPrefs && user.notificationSettings) {
        // Import services dynamically to avoid circular dependency
        const { default: NotificationPreferencesService } = await import(
          '../services/notification/notificationPreferences.service.js'
        );
        const preferencesService = new NotificationPreferencesService();

        // Migrate legacy settings to new preferences
        const updates = {};

        if (user.notificationSettings.emailNotifications !== undefined) {
          updates.channels = {
            ...updates.channels,
            email: {
              enabled: user.notificationSettings.emailNotifications,
            },
          };
        }

        if (user.notificationSettings.smsNotifications !== undefined) {
          updates.channels = {
            ...updates.channels,
            sms: {
              enabled: user.notificationSettings.smsNotifications,
            },
          };
        }

        if (user.notificationSettings.pushNotifications !== undefined) {
          updates.channels = {
            ...updates.channels,
            pushNotification: {
              enabled: user.notificationSettings.pushNotifications,
            },
          };
        }

        if (user.notificationSettings.marketingEmails !== undefined) {
          updates.categories = {
            ...updates.categories,
            marketing: {
              enabled: user.notificationSettings.marketingEmails,
            },
          };
        }

        if (Object.keys(updates).length > 0) {
          await preferencesService.updatePreferences(
            user._id.toString(),
            updates
          );
        }
      }
    } catch (error) {
      console.error('Failed to migrate legacy notification settings:', error);
      // Don't fail user update, just log the error
    }
  }
});

// Post-find middleware for decryption
userSchema.post('find', decryptDatabaseFields('user'));
userSchema.post('findOne', decryptDatabaseFields('user'));
userSchema.post('findOneAndUpdate', decryptDatabaseFields('user'));

// toJSON Transformation
userSchema.set('toJSON', {
  transform: async (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    // prevent password hash from returning in the response
    delete returnedObject.password;
    delete returnedObject.passwordSalt;

    // Decrypt sensitive fields for JSON output
    try {
      if (returnedObject.email?.encrypted) {
        returnedObject.email = await encryptionService.decryptField(
          returnedObject.email,
          'user',
          'email'
        );
      }
      if (returnedObject.phone?.encrypted) {
        returnedObject.phone = await encryptionService.decryptField(
          returnedObject.phone,
          'user',
          'phone'
        );
      }
      if (returnedObject.address) {
        for (const [field, value] of Object.entries(returnedObject.address)) {
          if (value?.encrypted) {
            returnedObject.address[field] =
              await encryptionService.decryptField(
                value,
                'user',
                `address.${field}`
              );
          }
        }
      }
    } catch (error) {
      console.error('Error decrypting user data for JSON output:', error);
    }

    return returnedObject;
  },
});

// Static methods for encryption-aware queries
userSchema.statics.findByEmail = async function (email) {
  try {
    // Encrypt the email for comparison
    const encryptedEmail = await encryptionService.encryptField(
      email,
      'user',
      'email'
    );
    return this.findOne({ email: encryptedEmail });
  } catch (error) {
    console.error('Error finding user by encrypted email:', error);
    throw error;
  }
};

userSchema.statics.findByPhone = async function (phone) {
  try {
    // Encrypt the phone for comparison
    const encryptedPhone = await encryptionService.encryptField(
      phone,
      'user',
      'phone'
    );
    return this.findOne({ phone: encryptedPhone });
  } catch (error) {
    console.error('Error finding user by encrypted phone:', error);
    throw error;
  }
};

// Instance methods for working with encrypted data
userSchema.methods.getDecryptedEmail = async function () {
  try {
    if (this.email?.encrypted) {
      return await encryptionService.decryptField(this.email, 'user', 'email');
    }
    return this.email;
  } catch (error) {
    console.error('Error decrypting email:', error);
    return null;
  }
};

userSchema.methods.getDecryptedPhone = async function () {
  try {
    if (this.phone?.encrypted) {
      return await encryptionService.decryptField(this.phone, 'user', 'phone');
    }
    return this.phone;
  } catch (error) {
    console.error('Error decrypting phone:', error);
    return null;
  }
};

userSchema.methods.getDecryptedAddress = async function () {
  try {
    const decryptedAddress = {};
    if (this.address) {
      for (const [field, value] of Object.entries(this.address)) {
        if (value?.encrypted) {
          decryptedAddress[field] = await encryptionService.decryptField(
            value,
            'user',
            `address.${field}`
          );
        } else {
          decryptedAddress[field] = value;
        }
      }
    }
    return decryptedAddress;
  } catch (error) {
    console.error('Error decrypting address:', error);
    return this.address;
  }
};

// Validation for encrypted fields
userSchema.pre('validate', async function (next) {
  try {
    // Validate email using original value
    if (this._originalEmail) {
      const emailRegex = /.+@.+\..+/;
      if (!emailRegex.test(this._originalEmail)) {
        this.invalidate('email', 'Please fill a valid email address.');
      }
    }

    // Validate phone using original value if provided
    if (this._originalPhone && this._originalPhone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(this._originalPhone.trim())) {
        this.invalidate('phone', 'Please provide a valid phone number.');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

export default User;
