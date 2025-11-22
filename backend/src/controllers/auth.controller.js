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
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }
    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Email and password don't match." });
    }
    // Generate JWT
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    // Set cookie and send response
    res.cookie("t", token, { expire: new Date() + 9999 });
    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
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
