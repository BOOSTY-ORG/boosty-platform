import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import UserNotificationPreferences from './userNotificationPreferences.model.js';

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
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, 'Please fill a valid email address.'],
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
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    // Notification preferences reference
    notificationPreferences: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserNotificationPreferences',
      index: true,
    },
    // User type for preference defaults
    userType: {
      type: String,
      enum: ['standard', 'investor', 'admin', 'business'],
      default: 'standard',
      index: true,
    },
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

// Pre-save Hook
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

// toJSON Transformation
userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    // prevent password hash from returning in the response
    delete returnedObject.password;
    delete returnedObject.passwordSalt;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
