import Reallocation from "../models/reallocation.model.js";
import User from "../models/users.js";
import sequelize from "../config/database.js";

export const addReallocation = async (req, res, next) => {
    //declare variable later a value will be assigned to it
      let reallocationTransaction;
  try {
    const {
      activity,
      date,
      economicClassification,
      sourceOfFunding,
      naturalAccount,
      description,
      releases,
      actualExpenditure,
      actualPayment,
      appropriation,
      appropriationBalance,
      allotment,
      allotmentBalance,
      organization,
    } = req.body;

    const user = req.user;
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      throw error;
    }

    const requiredFields = [
      { key: "activity", value: activity },
      { key: "date", value: date },
      { key: "economicClassification", value: economicClassification },
      { key: "sourceOfFunding", value: sourceOfFunding },
      { key: "naturalAccount", value: naturalAccount },
      { key: "description", value: description },
    ];

    const missing = requiredFields.find((f) => !f.value);
    if (missing) {
      const error = new Error(`${missing.key} is required`);
      error.statusCode = 400;
      throw error;
    }

    // Open transaction only after validation passes
    const reallocationTransaction = await sequelize.transaction();

    /* =========================
       DUPLICATE CHECK
    ========================== */
    const existing = await Reallocation.findOne({
      where: { activity, date },
      transaction: reallocationTransaction,
    });

    if (existing) {
      const error = new Error(
        "Record already exists for this activity and date",
      );
      error.statusCode = 400;
      throw error;
    }

    const reallocation = await Reallocation.create(
      {
        activity,
        date,
        economicClassification,
        sourceOfFunding,
        naturalAccount,
        description,
        appropriation,
        appropriationBalance,
        allotment,
        allotmentBalance,
        releases,
        actualExpenditure,
        actualPayment,
        userId: user.id,
        organization: user.organization,
      },
      { transaction: reallocationTransaction },
    );

    await reallocationTransaction.commit();

    res.status(201).json({
      success: true,
      message: "Reallocation record added successfully",
      reallocation,
    });
  } catch (error) {
     if (reallocationTransaction) {
       await reallocationTransaction.rollback();
     }
    next(error);
  }
};

//Fetch all records
export const getAllReallocation = async (req, res, next) => {
    try {
      const user = req.user;

      // Ensure the user is authenticated
      if (!user) {
        const error = new Error("Unauthorized: User not found.");
        error.statusCode = 401;
        return next(error);
      }

      // Base filter
      let whereClause = {};

      // Data entry users should only see their own records
      if (user.role === "data_entry") {
        whereClause.userId = user.id;
      }

      // Build include clause dynamically
      const include = [
        {
          model: User,
          attributes: ["id", "name", "organization", "role"],
          required: false, // ensures we join User table
          where:
            user.role === "admin"
              ? undefined // admin sees all
              : { organization: user.organization }, // filter by organization
        },
      ];

      const records = await Reallocation.findAll({
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
      next(error)
    }
}


// Update record
export const updateReallocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updates = req.body || {};

    // Ensure the user is authenticated
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    const record = await Reallocation.findByPk(id);
    if (!record) {
      const error = new Error("Reallocation record not found");
      error.statusCode = 404;
      return next(error);
    }

    // Authorization
    if (record.userId !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to update this record");
      error.statusCode = 403;
      return next(error);
    }

    // Prevent editing finalized records (if applicable)
    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error("You cannot edit a reviewed or approved record");
      error.statusCode = 400;
      return next(error);
    }

    // =========================
    // MERGE VALUES FIRST
    // =========================
    const appropriation = Number(
      updates.appropriation ?? record.appropriation ?? 0,
    );

    const actualExpenditure = Number(
      updates.actualExpenditure ?? record.actualExpenditure ?? 0,
    );

    const allotment = Number(updates.allotment ?? record.allotment ?? 0);

    const actualPayment = Number(
      updates.actualPayment ?? record.actualPayment ?? 0,
    );

    // =========================
    // COMPUTE BALANCES
    // =========================
    const appropriationBalance = appropriation - actualExpenditure;
    const allotmentBalance = allotment - actualPayment;

    // =========================
    // FINAL UPDATE OBJECT
    // =========================
    const updatedData = {
      activity: updates.activity ?? record.activity,
      date: updates.date ?? record.date,
      economicClassification:
        updates.economicClassification ?? record.economicClassification,
      sourceOfFunding: updates.sourceOfFunding ?? record.sourceOfFunding,
      naturalAccount: updates.naturalAccount ?? record.naturalAccount,
      description: updates.description ?? record.description,

      appropriation,
      appropriationBalance,

      allotment,
      allotmentBalance,

      releases: Number(updates.releases ?? record.releases ?? 0),
      actualExpenditure,
      actualPayment,
    };

    // Apply update
    await record.update(updatedData);

    res.status(200).json({
      success: true,
      message: "Reallocation record updated successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};


// Delete Reallocation record
export const deleteReallocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Ensure the user is authenticated
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    const record = await Reallocation.findByPk(id);
    if (!record) {
      const error = new Error("Reallocation record not found");
      error.statusCode = 404;
      return next(error);
    }

    // Ownership check: Only creator or admin can delete
    if (record.userId !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to delete this record");
      error.statusCode = 403;
      return next(error);
    }

    // Prevent deleting reviewed or approved records
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
      message: "Reallocation record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};




//  Review Reallocation record (Reviewer only)
export const reviewReallocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body; // optional comment from frontend
    const user = req.user; // reviewer info from auth middleware

    // Ensure the user is authenticated
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    // Fetch the Reallocation record
    const record = await Reallocation.findByPk(id);

    if (!record) {
      const error = new Error("Reallocation record not found");
      error.statusCode = 404;
      return next(error);
    }

    // Prevent re-review if already reviewed or approved
    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error("This record has already been reviewed");
      error.statusCode = 400;
      return next(error);
    }

    // Update record fields
    record.status = "Reviewed";
    record.reviewedBy = user.name;
    record.reviewedAt = new Date();
    record.reviewComment = reviewComment || null;

    await record.save();

    // Send back updated record
    res.status(200).json({
      success: true,
      message: "Reallocation record reviewed successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};




// Approve Reallocation record (Approver only)
export const approveReallocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    const record = await Reallocation.findByPk(id);
    if (!record) {
      const error = new Error("Reallocation record not found");
      error.statusCode = 404;
      return next(error);
    }

    //Must be reviewed first
    if (record.status !== "Reviewed") {
      const error = new Error("Only reviewed records can be approved");
      error.statusCode = 400;
      return next(error);
    }

    //Prevent double approval
    if (record.status === "Approved") {
      const error = new Error("This record is already approved");
      error.statusCode = 400;
      return next(error);
    }

      //Optional: prevent self-approval
    // if (record.userId === user.id) {
    //   const error = new Error("You cannot approve your own record");
    //   error.statusCode = 400;
    //   return next(error);
    // }

    // Approver marks record as approved
    record.status = "Approved";
    record.approvedBy = user.name;
    record.approvedAt = new Date();

    await record.save();

    res.status(200).json({
      success: true,
      message: "Reallocation record approved successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};