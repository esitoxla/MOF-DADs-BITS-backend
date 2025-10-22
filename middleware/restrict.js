// authorization middleware
export const restrict = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      const error = new Error("Please log in");
      error.statusCode = 403; // Forbidden
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error("You are not authorized");
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};
