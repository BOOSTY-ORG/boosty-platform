import mongoose from 'mongoose';

const userNotificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },

    // Global preferences
    globalEnabled: {
      type: Boolean,
      default: true,
    },

    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      startTime: {
        type: String,
        validate: {
          validator: function (v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Time must be in HH:MM format',
        },
      },
      endTime: {
        type: String,
        validate: {
          validator: function (v) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Time must be in HH:MM format',
        },
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
    },

    // Channel preferences
    channels: {
      email: {
        enabled: {
          type: Boolean,
          default: true,
        },
        address: String,
        verified: {
          type: Boolean,
          default: false,
        },
      },
      sms: {
        enabled: {
          type: Boolean,
          default: true,
        },
        phoneNumber: String,
        verified: {
          type: Boolean,
          default: false,
        },
        countryCode: {
          type: String,
          default: '+1',
        },
      },
      inApp: {
        enabled: {
          type: Boolean,
          default: true,
        },
        sound: {
          type: Boolean,
          default: true,
        },
        vibration: {
          type: Boolean,
          default: true,
        },
      },
      pushNotification: {
        enabled: {
          type: Boolean,
          default: true,
        },
        deviceTokens: [
          {
            token: String,
            platform: {
              type: String,
              enum: ['ios', 'android', 'web'],
            },
            active: {
              type: Boolean,
              default: true,
            },
            lastUsed: Date,
          },
        ],
      },
    },

    // Category preferences
    categories: {
      welcome: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      application: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      kyc: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      payment: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      support: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      marketing: {
        enabled: {
          type: Boolean,
          default: false,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      general: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      alert: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
      reminder: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ['email', 'sms', 'in_app', 'push_notification'],
          },
        ],
      },
    },

    // Frequency limits
    frequencyLimits: {
      maxPerHour: {
        type: Number,
        default: 10,
        min: 1,
      },
      maxPerDay: {
        type: Number,
        default: 50,
        min: 1,
      },
      maxPerWeek: {
        type: Number,
        default: 200,
        min: 1,
      },
    },

    // Metadata
    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    updatedBy: {
      type: String,
      trim: true,
    },

    // Version tracking for migrations
    version: {
      type: String,
      default: '2.0.0',
      index: true,
    },

    lastMigratedAt: {
      type: Date,
    },

    // Preference inheritance and conflict resolution
    inheritance: {
      enabled: {
        type: Boolean,
        default: true,
      },
      inheritFromGlobal: {
        type: Boolean,
        default: true,
      },
      inheritFromCategory: {
        type: Boolean,
        default: true,
      },
    },

    // Notification analytics
    notificationStats: {
      totalReceived: {
        type: Number,
        default: 0,
      },
      totalRead: {
        type: Number,
        default: 0,
      },
      lastReceivedAt: {
        type: Date,
      },
      preferredChannel: {
        type: String,
        enum: ['email', 'sms', 'in_app', 'push_notification'],
        default: 'email',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
userNotificationPreferencesSchema.index({
  userId: 1,
  'channels.email.verified': 1,
});
userNotificationPreferencesSchema.index({
  userId: 1,
  'channels.sms.verified': 1,
});
userNotificationPreferencesSchema.index({
  userId: 1,
  'categories.marketing.enabled': 1,
});

// Virtuals
userNotificationPreferencesSchema.virtual('isInQuietHours').get(function () {
  if (!this.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const userTime = new Date(
    now.toLocaleString('en-US', { timeZone: this.quietHours.timezone })
  );

  const currentTime = userTime.getHours() * 60 + userTime.getMinutes();

  const [startHour, startMin] = this.quietHours.startTime
    .split(':')
    .map(Number);
  const [endHour, endMin] = this.quietHours.endTime.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime <= endTime) {
    // Same day period (e.g., 22:00 to 08:00 where start > end wraps around midnight)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Overnight period (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
});

userNotificationPreferencesSchema
  .virtual('activeDeviceTokens')
  .get(function () {
    if (!this.channels.pushNotification.deviceTokens) {
      return [];
    }
    return this.channels.pushNotification.deviceTokens.filter(
      (token) => token.active
    );
  });

userNotificationPreferencesSchema.virtual('verifiedChannels').get(function () {
  const verified = [];

  if (this.channels.email.verified) {
    verified.push('email');
  }

  if (this.channels.sms.verified) {
    verified.push('sms');
  }

  if (this.channels.inApp.enabled) {
    verified.push('in_app');
  }

  if (
    this.channels.pushNotification.enabled &&
    this.activeDeviceTokens.length > 0
  ) {
    verified.push('push_notification');
  }

  return verified;
});

// Instance methods
userNotificationPreferencesSchema.methods.isChannelEnabled = function (
  channel
) {
  return (
    this.globalEnabled &&
    this.channels[channel] &&
    this.channels[channel].enabled
  );
};

userNotificationPreferencesSchema.methods.isCategoryEnabled = function (
  category
) {
  return (
    this.globalEnabled &&
    this.categories[category] &&
    this.categories[category].enabled
  );
};

userNotificationPreferencesSchema.methods.getEnabledChannelsForCategory =
  function (category) {
    if (!this.isCategoryEnabled(category)) {
      return [];
    }

    const categoryChannels = this.categories[category].channels || [];
    return categoryChannels.filter((channel) => this.isChannelEnabled(channel));
  };

userNotificationPreferencesSchema.methods.addDeviceToken = function (
  token,
  platform
) {
  // Remove existing token for the same device
  this.channels.pushNotification.deviceTokens =
    this.channels.pushNotification.deviceTokens.filter(
      (deviceToken) => deviceToken.token !== token
    );

  // Add new token
  this.channels.pushNotification.deviceTokens.push({
    token,
    platform,
    active: true,
    lastUsed: new Date(),
  });

  return this.save();
};

userNotificationPreferencesSchema.methods.removeDeviceToken = function (token) {
  this.channels.pushNotification.deviceTokens =
    this.channels.pushNotification.deviceTokens.filter(
      (deviceToken) => deviceToken.token !== token
    );

  return this.save();
};

userNotificationPreferencesSchema.methods.deactivateDeviceToken = function (
  token
) {
  const deviceToken = this.channels.pushNotification.deviceTokens.find(
    (dt) => dt.token === token
  );

  if (deviceToken) {
    deviceToken.active = false;
    return this.save();
  }

  return Promise.resolve(this);
};

userNotificationPreferencesSchema.methods.updateEmail = function (
  email,
  verified = false
) {
  this.channels.email.address = email;
  this.channels.email.verified = verified;
  this.lastUpdated = new Date();
  return this.save();
};

userNotificationPreferencesSchema.methods.updatePhone = function (
  phone,
  verified = false
) {
  this.channels.sms.phoneNumber = phone;
  this.channels.sms.verified = verified;
  this.lastUpdated = new Date();
  return this.save();
};

userNotificationPreferencesSchema.methods.updateQuietHours = function (
  enabled,
  startTime,
  endTime,
  timezone
) {
  this.quietHours.enabled = enabled;
  if (enabled) {
    this.quietHours.startTime = startTime;
    this.quietHours.endTime = endTime;
    this.quietHours.timezone = timezone || 'UTC';
  }
  this.lastUpdated = new Date();
  return this.save();
};

userNotificationPreferencesSchema.methods.updateCategoryPreferences = function (
  category,
  enabled,
  channels
) {
  if (this.categories[category]) {
    this.categories[category].enabled = enabled;
    if (channels && Array.isArray(channels)) {
      this.categories[category].channels = channels;
    }
    this.lastUpdated = new Date();
    return this.save();
  }

  return Promise.reject(new Error(`Invalid category: ${category}`));
};

userNotificationPreferencesSchema.methods.updateFrequencyLimits = function (
  maxPerHour,
  maxPerDay,
  maxPerWeek
) {
  if (maxPerHour !== undefined) this.frequencyLimits.maxPerHour = maxPerHour;
  if (maxPerDay !== undefined) this.frequencyLimits.maxPerDay = maxPerDay;
  if (maxPerWeek !== undefined) this.frequencyLimits.maxPerWeek = maxPerWeek;

  this.lastUpdated = new Date();
  return this.save();
};

// Static methods
userNotificationPreferencesSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId });
};

userNotificationPreferencesSchema.statics.createDefault = function (
  userId,
  options = {}
) {
  const { email, phone, countryCode = '+1' } = options;

  const preferences = new this({
    userId,
    channels: {
      email: {
        enabled: true,
        address: email || null,
        verified: false,
      },
      sms: {
        enabled: true,
        phoneNumber: phone || null,
        verified: false,
        countryCode,
      },
      inApp: {
        enabled: true,
        sound: true,
        vibration: true,
      },
      pushNotification: {
        enabled: true,
        deviceTokens: [],
      },
    },
  });

  return preferences.save();
};

userNotificationPreferencesSchema.statics.findUsersWithChannelEnabled =
  function (channel, limit = 100) {
    const query = { globalEnabled: true };
    query[`channels.${channel}.enabled`] = true;

    if (channel === 'email') {
      query['channels.email.verified'] = true;
    } else if (channel === 'sms') {
      query['channels.sms.verified'] = true;
    } else if (channel === 'push_notification') {
      query['channels.pushNotification.deviceTokens.0'] = { $exists: true };
    }

    return this.find(query).limit(limit).populate('userId', 'name email');
  };

userNotificationPreferencesSchema.statics.findUsersForCategory = function (
  category,
  channel = null
) {
  const query = {
    globalEnabled: true,
    [`categories.${category}.enabled`]: true,
  };

  if (channel) {
    query[`categories.${category}.channels`] = channel;
    query[`channels.${channel}.enabled`] = true;

    if (channel === 'email') {
      query['channels.email.verified'] = true;
    } else if (channel === 'sms') {
      query['channels.sms.verified'] = true;
    }
  }

  return this.find(query).populate('userId', 'name email phone');
};

// toJSON transformation
userNotificationPreferencesSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const UserNotificationPreferences = mongoose.model(
  'UserNotificationPreferences',
  userNotificationPreferencesSchema
);

export default UserNotificationPreferences;
