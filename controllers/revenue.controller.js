import Revenue from "../models/revenue.model.js";
import User from "../models/users.js";
import { organizationRetentionRate } from "../data/organizationRetentionRate.js";

/**
 * Helper to compute retention + payment from C and rate
 */
const computeRetentionAndPayment = (actualCollection, retentionRate) => {
  const C = Number(actualCollection);
  const rate = Number(retentionRate);

  if (Number.isNaN(C) || C < 0) {
    throw new Error("Actual collection must be a valid non-negative number");
  }

  if (Number.isNaN(rate) || rate < 0) {
    throw new Error("Invalid retention rate for this organization");
  }

  const retentionAmount = (rate / 100) * C; // E
  const paymentAmount = C - retentionAmount; // D

  return {
    C,
    retentionAmount: Number(retentionAmount.toFixed(2)),
    paymentAmount: Number(paymentAmount.toFixed(2)),
  };
};

/**
 * ADD REVENUE
 */
export const addRevenue = async (req, res, next) => {
  try {
    const {
      date,
      revenueCategory,
      actualCollection,
      budgetProjections,
      remarks,
    } = req.body;

    const user = req.user;
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    // Required fields
    const requiredFields = [
      { key: "date", value: date },
      { key: "revenueCategory", value: revenueCategory },
      { key: "actualCollection", value: actualCollection },
    ];

    const missing = requiredFields.filter((f) => !f.value && f.value !== 0);
    if (missing.length > 0) {
      const error = new Error(`${missing[0].key} is required`);
      error.statusCode = 400;
      return next(error);
    }

    // Get retention rate from organization
    const retentionRate = organizationRetentionRate[user.organization];
    if (!retentionRate && retentionRate !== 0) {
      const error = new Error(
        "Retention rate not configured for this organization"
      );
      error.statusCode = 400;
      return next(error);
    }

    // Optional: prevent duplicate revenue for same date & category in same org
    const existing = await Revenue.findOne({
      where: {
        date,
        revenue_category: revenueCategory,
        organization: user.organization,
      },
    });

    if (existing) {
      const error = new Error(
        "Revenue record already exists for this date and category"
      );
      error.statusCode = 400;
      return next(error);
    }

    // Compute amounts
    const { C, retentionAmount, paymentAmount } = computeRetentionAndPayment(
      actualCollection,
      retentionRate
    );

    const revenue = await Revenue.create({
      user_id: user.id,
      organization: user.organization,
      retention_rate: retentionRate,
      date,
      revenue_category: revenueCategory,
      actual_collection: C,
      retention_amount: retentionAmount,
      payment_amount: paymentAmount,
      budgetProjections,
      remarks: remarks ?? null,
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Revenue record added successfully",
      data: revenue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ALL REVENUE
 */
export const getAllRevenue = async (req, res, next) => {
  try {
    const user = req.user;

    let whereClause = {};

    // data_entry can only see their own records
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

    const revenues = await Revenue.findAll({
      where: whereClause,
      include,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: revenues.length,
      data: revenues,
    });
  } catch (error) {
    console.error("Error fetching revenues:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch revenues",
    });
  }
};

/**
 * UPDATE REVENUE
 */
export const updateRevenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updates = req.body;

    const record = await Revenue.findByPk(id);
    if (!record) {
      const error = new Error("Revenue record not found");
      error.statusCode = 404;
      return next(error);
    }

    // Only creator or admin can update
    if (record.user_id !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to update this record");
      error.statusCode = 403;
      return next(error);
    }

    // No editing if Reviewed / Approved
    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error("You cannot edit a reviewed or approved record");
      error.statusCode = 400;
      return next(error);
    }

    // Map camelCase from frontend to DB columns
    if (updates.date !== undefined) {
      record.date = updates.date;
    }

    if (updates.revenueCategory !== undefined) {
      record.revenue_category = updates.revenueCategory;
    }

    if (updates.remarks !== undefined) {
      record.remarks = updates.remarks;
    }

    // If actualCollection changed, recompute retention + payment
    if (updates.actualCollection !== undefined) {
      const { C, retentionAmount, paymentAmount } = computeRetentionAndPayment(
        updates.actualCollection,
        record.retention_rate
      );

      record.actual_collection = C;
      record.retention_amount = retentionAmount;
      record.payment_amount = paymentAmount;
    }

    // Ignore any direct attempts to set retention_amount / payment_amount
    await record.save();

    res.status(200).json({
      success: true,
      message: "Revenue record updated successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE REVENUE
 */
export const deleteRevenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await Revenue.findByPk(id);
    if (!record) {
      const error = new Error("Revenue record not found");
      error.statusCode = 404;
      return next(error);
    }

    // Only creator or admin can delete
    if (record.user_id !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to delete this record");
      error.statusCode = 403;
      return next(error);
    }

    // No deleting if Reviewed / Approved
    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error(
        "You cannot delete a reviewed or approved record"
      );
      error.statusCode = 400;
      return next(error);
    }

    await record.destroy();

    res.status(200).json({
      success: true,
      message: "Revenue record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * APPROVE REVENUE
 */
export const approveRevenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await Revenue.findByPk(id);
    if (!record) {
      const error = new Error("Revenue record not found");
      error.statusCode = 404;
      return next(error);
    }

    record.status = "Approved";
    record.approvedBy = user.name;
    record.approvedAt = new Date();

    await record.save();

    res.status(200).json({
      success: true,
      message: "Revenue record approved successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * REVIEW REVENUE
 */
export const reviewRevenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body;
    const user = req.user;

    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    const record = await Revenue.findByPk(id);
    if (!record) {
      const error = new Error("Revenue record not found");
      error.statusCode = 404;
      return next(error);
    }

    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error("This record has already been reviewed");
      error.statusCode = 400;
      return next(error);
    }

    record.status = "Reviewed";
    record.reviewedBy = user.name;
    record.reviewedAt = new Date();
    record.reviewComment = reviewComment || null;

    await record.save();

    res.status(200).json({
      success: true,
      message: "Revenue record reviewed successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};
