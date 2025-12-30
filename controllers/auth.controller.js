import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/users.js"

export const registerUser = async (req, res, next) => {
    const { name, email, password, username, role, organization, designation } = req.body;

    if (!name || !email || !password || !username|| !role || !organization || !designation) {
      const error = new Error("All fields required");
      error.statusCode = 400;
      return next(error);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        const error = new Error("User already exists");
        error.statusCode = 400;
        return next(error);
    }
    
     try {
       const user = await User.create(req.body);

       //Respond with success (exclude password from response)
       // A rest element must be last in a destructuring pattern.
       const { password: _, ...userData } = user.get({ plain: true });
       //.get({ plain: true }) is used to convert model instances to plain js objects since sequelize returns model instances

       //password is extracted and stored in _(unused variable)
       //Collect all the other properties (id, name, email, etc.) into userData.
       res.status(201).json({
         success: true,
         statusCode: 201,
         userData,
       });
     } catch (error) {
       next()
     }

}


export const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      const error = new Error("Username and password are required");
      error.statusCode = 400;
      return next(error);
    }

    // Find user
    const user = await User.scope("withPassword").findOne({
      where: { username },
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    // Compare password
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      const error = new Error("Incorrect password");
      error.statusCode = 401;
      return next(error);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    /* =========================
       TOKENS
    ========================== */

    // Access token (short-lived)
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    /* =========================
       COOKIES
    ========================== */

    // Access token cookie
    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Refresh token cookie (THIS FIXES YOUR BUG)
    res.cookie("refreshJwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Remove password before sending user
    const { password: _, ...userData } = user.get({ plain: true });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};




export const getUser = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    //Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      const error = new Error("Token invalid");
      error.statusCode = 401;
      return next(error);
    }

    //Find user by primary key (id)
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] }, // omit password field
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    //Return response
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};



export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword || !confirmPassword) {
      const error = new Error("All fields are required");
      error.statusCode = 400;
      return next(error);
    }

    if (newPassword !== confirmPassword) {
      const error = new Error("Passwords do not match");
      error.statusCode = 400;
      return next(error);
    }

    // Get currently logged-in user (set by your protect middleware)
    const user = await User.scope("withPassword").findByPk(req.user.id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      const error = new Error("Incorrect old password");
      error.statusCode = 401;
      return next(error);
    }

    // Update password (the pre-save hook will handle hashing)
    user.password = newPassword;
    await user.save(); // Sequelize hook will hash automatically

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};



export const logout = async (req, res, next) => {
  try {
    res.clearCookie("jwt");

    res.status(200).json({ success: true, message: "User logged out" });
  } catch (error) {
    next(error);
  }
};




export const refreshToken = async (req, res, next) => {
  const refreshToken = req.cookies.refreshJwt;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "No refresh token",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("jwt", newAccessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};
