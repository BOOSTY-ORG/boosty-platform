import User from "../models/user.model.js";
import dbErrorHandler from "../helpers/dbErrorHandler.js";

/*
 ** List all users. **
*/
const list = async (_, res) => {
  try {
    const users = await User.find().select("name email updatedAt createdAt");
    res.json(users);
  } catch (err) {
    return res.status(400).json({
      error: dbErrorHandler.getErrorMessage(err),
    });
  }
};

/*
 ** Create a new user. **
*/
const create = async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    return res.status(201).json({
      message: "Successfully signed up!",
    });
  } catch (err) {
    return res.status(400).json({
      error: dbErrorHandler.getErrorMessage(err),
    });
  }
};

/*
 ** Load a user by ID and attach it to the request object. **
*/
const userByID = async (req, res, next, id) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    req.profile = user;
    next();
  } catch (err) {
    return res.status(400).json({
      error: "Could not retrieve user",
    });
  }
};

/*
 ** Read (fetch) a single user. **
*/
const read = (req, res) => {
  // `req.profile` is populated by `userByID` middleware
  return res.json(req.profile);
};

/*
 ** Update a user. **
*/
const update = async (req, res) => {
  try {
    let user = req.profile; // The existing user document
    // Update user properties from the request body
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    await user.save(); // Mongoose tracking and saving changes
    res.json(user);
  } catch (err) {
    return res.status(400).json({
      error: dbErrorHandler.getErrorMessage(err),
    });
  }
};

/*
 ** Delete a user. **
*/
const remove = async (req, res) => {
  try {
    const user = req.profile;
    const deletedUser = await user.deleteOne();
    res.json(deletedUser);
  } catch (err) {
    return res.status(400).json({
      error: dbErrorHandler.getErrorMessage(err),
    });
  }
};

export default {
  list,
  create,
  userByID,
  read,
  update,
  remove,
};
