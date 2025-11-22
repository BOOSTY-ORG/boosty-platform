const express = require("express");
const userCtrl = require("../controllers/user.controller.js");
const authCtrl = require("../controllers/auth.controller.js");

const router = express.Router();

// Route for listing all users and creating a new user
router.route("/api/users").get(userCtrl.list).post(userCtrl.create);

// Routes for fetching, updating, and deleting a single user
router
  .route("/api/users/:userId")
  .get(authCtrl.requireSignin, userCtrl.read) // read profile
  .put(authCtrl.requireSignin, authCtrl.hasAuthorization, userCtrl.update) // update profile
  .patch(authCtrl.requireSignin, authCtrl.hasAuthorization, userCtrl.update) // update profile
  .delete(authCtrl.requireSignin, authCtrl.hasAuthorization, userCtrl.remove); // delete profile

// Routes to reset user password
router
  .post("/forgot-password", authCtrl.forgotPassword)
  .post("/reset-password/:token", authCtrl.resetPassword);

// Load user
router.param("userId", userCtrl.userByID);

export default router;
