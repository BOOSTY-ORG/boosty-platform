import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_WORK_FACTOR = 10;
const userSchema = new mongoose.Schema(
  {
    // Schema definition
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Please fill a valid email address."],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [6, "Password must be at least 6 characters long."],
    },
    resetToken: { type: String },
    tokenExpiry: { type: Date },
  },
  {
    timestamps: true, // Timestamps
  }
);

// Virtual password salt stored implicitly within the hash
userSchema.virtual("passwordSalt").get(function () {
  return undefined;
});

// Pre-save Hook
userSchema.pre("save", async function (next) {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) {
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
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// toJSON Transformation
userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    // prevent password hash from returning in the response
    delete returnedObject.password;
    delete returnedObject.passwordSalt;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
