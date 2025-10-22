import User from "../models/users.js";
import jwt from "jsonwebtoken"

export const protectRoutes = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "User not logged in!" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token!" });
    }

    // Sequelize version of findById
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password", "createdAt", "updatedAt"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    req.user = user; // attach to request
    next(); // move to the next middleware or route
  } catch (error) {
    console.error("protectRoutes error:", error.message);
    res.status(500).json({ message: "Server error in protectRoutes" });
  }
};