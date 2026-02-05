import Cash from "../models/cash.model.js";
import User from "../models/users.js";

export const addCashPosition = async (req, res, next) => {
  try {
    const { as_at_date, account_name, currency, balance } = req.body;

    const user = req.user;
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    // Required fields
    const requiredFields = [
      { key: "as_at_date", value: as_at_date },
      { key: "account_name", value: account_name },
      { key: "currency", value: currency },
      { key: "balance", value: balance },
    ];

    //checking if required fields were actually sent in the request body.
    const missing = requiredFields.filter(
      (field) => field.value === undefined || field.value === null,
    );

    // if at least one required field is missing

    if (missing.length > 0) {
      // take the first missing field
      const error = new Error(`${missing[0].key} is required`);
      error.statusCode = 400;
      return next(error);
    }

    const record = await Cash.create({
      user_id: user.id,
      organization: user.organization,
      as_at_date,
      account_name,
      currency,
      balance,
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Cash position added successfully",
      record,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCashPositions = async (req, res, next) => {
  try {
    const user = req.user;
    let whereClause = {};

    // data_entry sees only their own
    if (user.role === "data_entry") {
      whereClause.user_id = user.id;
    }

    const include = [
      {
        model: User,
        attributes: ["id", "name", "organization", "role"],
        required: false,
        where:
          user.role === "admin"
            ? undefined
            : { organization: user.organization },
      },
    ];

    const records = await Cash.findAll({
      where: whereClause,
      include,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCashPosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updates = req.body;

    const record = await Cash.findByPk(id);
    if (!record) {
      const error = new Error("Cash position record not found");
      error.statusCode = 404;
      return next(error);
    }

    if (record.user_id !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to update this record");
      error.statusCode = 403;
      return next(error);
    }

    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error("You cannot edit a reviewed or approved record");
      error.statusCode = 400;
      return next(error);
    }

    // Allowed updates
    if (updates.as_at_date !== undefined)
      record.as_at_date = updates.as_at_date;
    if (updates.account_name !== undefined)
      record.account_name = updates.account_name;
    if (updates.currency !== undefined) record.currency = updates.currency;
    if (updates.balance !== undefined) record.balance = updates.balance;

    await record.save();

    res.status(200).json({
      success: true,
      message: "Cash position updated successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCashPosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await Cash.findByPk(id);
    if (!record) {
      const error = new Error("Cash position record not found");
      error.statusCode = 404;
      return next(error);
    }

    if (record.user_id !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to delete this record");
      error.statusCode = 403;
      return next(error);
    }

    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error(
        "You cannot delete a reviewed or approved record",
      );
      error.statusCode = 400;
      return next(error);
    }

    await record.destroy();

    res.status(200).json({
      success: true,
      message: "Cash position deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const reviewCashPosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body;
    const user = req.user;

    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    const cash = await Cash.findByPk(id);

    if (!cash) {
      const error = new Error("Cash position record not found");
      error.statusCode = 404;
      return next(error);
    }

    if (cash.status !== "Pending") {
      const error = new Error("Only pending records can be reviewed");
      error.statusCode = 400;
      return next(error);
    }

    cash.status = "Reviewed";
    cash.reviewedBy = user.name;
    cash.reviewedAt = new Date();
    cash.reviewComment = reviewComment || null;

    await cash.save();

    res.status(200).json({
      success: true,
      message: "Cash position reviewed successfully",
      data: cash,
    });
  } catch (error) {
    next(error);
  }
};

export const approveCashPosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await Cash.findByPk(id);
    if (!record) {
      const error = new Error("Cash position record not found");
      error.statusCode = 404;
      return next(error);
    }

    record.status = "Approved";
    record.approvedBy = user.name;
    record.approvedAt = new Date();

    await record.save();

    res.status(200).json({
      success: true,
      message: "Cash position approved successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};
