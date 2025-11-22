const User = require("../models/user.model.js");
const dbErrorHandler = require("../helpers/dbErrorHandler.js");

/*
 ** List all users. **
*/
const list = async (req, res) => {
  try {
    const { page, limit, status, search, sortBy, sortOrder } = req.query;
    
    // Build query
    let query = User.find();
    
    // Apply filters
    if (status) {
      query = query.where('status').equals(status);
    }
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = query.or([
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]);
    }
    
    // Apply sorting
    const sortField = sortBy || 'createdAt';
    const sortOptions = {};
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;
    query = query.sort(sortOptions);
    
    // Apply pagination
    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }
    
    // Select fields (include more fields for export)
    const users = await query.select(
      "name email phone address status createdAt updatedAt applications installations communications documents"
    )
    .populate('applications', 'status createdAt solarCapacity')
    .populate('installations', 'status installedAt capacity')
    .populate('communications', 'type subject sentAt status')
    .populate('documents', 'type status uploadedAt expiresAt');
    
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
    const user = req.profile; // The existing user document
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

export {
  list,
  create,
  userByID,
  read,
  update,
  remove,
};
