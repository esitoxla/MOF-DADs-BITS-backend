import User from "../models/users.js";
import { Op } from "sequelize";

// Add a new user (Admin only)
export const addUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      username,
      role,
      organization,
      designation,
      lastLogin,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !username ||
      !organization ||
      !designation
    ) {
      const error = new Error("All fields are required");
      error.statusCode = 400;
      return next(error);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error("User already exists");
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.create({
      name,
      email,
      password,
      username,
      role,
      organization,
      designation,
    });

    const { password: _, ...userData } = user.get({ plain: true });
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (Admin only)
export const getAllUsers = async (req, res, next) => {
  try {
    // Query parameters
    const { page = 1, limit = 10, search = "" } = req.query;

    const offset = (page - 1) * limit;

    // Search filter (case-insensitive)
    const whereClause = search
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { username: { [Op.like]: `%${search}%` } },
            { organization: { [Op.like]: `%${search}%` } },
            { designation: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    // Fetch users with pagination and search
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: users.length,
      totalUsers: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single user (Admin only)
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update user (Admin only)
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    await user.update(req.body);

    const { password: _, ...userData } = user.get({ plain: true });
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (Admin only)
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
