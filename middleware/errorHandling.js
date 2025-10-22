export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;

  // Handle Sequelize Unique Constraint Error (e.g., duplicate email)
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    const fields = err.errors.map((e) => e.path).join(", ");
    message = `${fields} already exists`;
  }

  // Handle Sequelize Validation Error (e.g., notNull, type errors)
  else if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = err.errors.map((e) => e.message).join(", ");
  }

  // Optional: Handle Foreign Key Constraint Error
  else if (err.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    message = `Invalid reference: ${err.index}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};
