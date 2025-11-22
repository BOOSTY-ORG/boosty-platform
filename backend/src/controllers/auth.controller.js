import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

dotenv.config();

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("[DEBUG] Signin attempt with email:", email);
    
    // Check if JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error("[DEBUG] JWT_SECRET is missing from environment variables");
      return res.status(500).json({ error: "Server configuration error." });
    }
    
    // Find user by email
    console.log("[DEBUG] Searching for user in database...");
    const user = await User.findOne({ email });
    console.log("[DEBUG] User found:", !!user);
    
    if (!user) {
      console.log("[DEBUG] User not found in database");
      return res.status(401).json({ error: "User not found." });
    }
    
    // Compare passwords
    console.log("[DEBUG] Comparing passwords...");
    const isMatch = await user.comparePassword(password);
    console.log("[DEBUG] Password match result:", isMatch);
    
    if (!isMatch) {
      console.log("[DEBUG] Passwords do not match");
      return res.status(401).json({ error: "Email and password don't match." });
    }
    
    // Generate JWT
    console.log("[DEBUG] Generating JWT token...");
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    console.log("[DEBUG] JWT token generated successfully");
    
    // Set cookie and send response
    res.cookie("t", token, { expire: new Date() + 9999 });
    console.log("[DEBUG] Signin successful for user:", email);
    
    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("[DEBUG] Signin error:", err);
    console.error("[DEBUG] Error stack:", err.stack);
    return res.status(401).json({
      error: "Could not sign in.",
    });
  }
};

/*
 ** User forgot password. **
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "User not found!" });

  const token = crypto.randomBytes(32).toString("hex");
  user.resetToken = token;
  user.tokenExpiry = Date.now() + 3600000; // 1hr
  await user.save();

  const resetLink = `http://localhost:3000/rest-password/${token}`;

  // send email
  const transporter = nodemailer.createTransport({
    /* SMTP config */
  });
  await transporter.sendMail({
    to: user.email,
    subject: "Password Reset",
    html: `<p>Click <a href="${resetLink}>here</a> to reset your password.</p>`,
  });

  res.json({ message: "Reset link sent to email" });
};

// reset-password/:token
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetToken: token,
    tokenExpiry: { $gt: Date.now() },
  });

  if (!user)
    return res.status(400).json({ message: "invalid or expired token" });

  user.password = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.tokenExpiry = undefined;
  await user.save();

  res.json({ message: "password reset successful" });
};

const signout = (_, res) => {
  res.clearCookie("t");
  return res.status(200).json({
    message: "Signed out successfully!",
  });
};

const requireSignin = (req, res, next) => {
  const token = req.cookies.t || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token." });
  }
};

const hasAuthorization = (req, res, next) => {
  const authorized =
    req.profile &&
    req.auth &&
    req.profile._id.toString() === req.auth._id.toString();
  if (!authorized) {
    return res.status(403).json({ error: "User is not authorized." });
  }
  next();
};

export {
  signin,
  signout,
  forgotPassword,
  resetPassword,
  requireSignin,
  hasAuthorization,
};
