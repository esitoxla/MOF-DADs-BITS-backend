import BudgetExpenditure from "../models/expenditure.model.js";
import User from "../models/users.js";
import LoadedData from "../models/loadedData.js";
import sequelize from "../config/database.js";

export const addExpenditure = async (req, res, next) => {
  const t = await sequelize.transaction();

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
    } = req.body;

    const user = req.user;
    if (!user) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      throw error;
    }

    /* =========================
       REQUIRED FIELDS CHECK
    ========================== */
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

    /* =========================
       DUPLICATE CHECK
    ========================== */
    const existing = await BudgetExpenditure.findOne({
      where: { activity, date },
      transaction: t,
    });

    if (existing) {
      const error = new Error(
        "Record already exists for this activity and date"
      );
      error.statusCode = 400;
      throw error;
    }

    /* =========================
       FETCH ALLOCATION
    ========================== */
    const allocation = await LoadedData.findOne({
      where: {
        organization: user.organization,
        economicClassification,
        sourceOfFunding,
        naturalAccount,
      },
      transaction: t,
    });

    if (!allocation) {
      const error = new Error("No allocation found for this budget line");
      error.statusCode = 404;
      throw error;
    }

    const appropriation = Number(allocation.appropriation || 0);
    const allotment = Number(allocation.allotment || 0);
    const currentRelease = Number(releases || 0);

   const isGoodsAndServicesGOG =
     economicClassification === "Use of Goods and Services" &&
     sourceOfFunding === "GOG";


    /* =========================
   BALANCE LOGIC (DATA-DRIVEN)
========================== */
   let allotmentBalance = 0;
   const hasAllotment = allotment > 0;

   if (!hasAllotment) {
     if (currentRelease > appropriation) {
       throw new Error(
         "Releases cannot exceed appropriation when there is no allotment"
       );
     }
     allotmentBalance = 0;
   } else if (isGoodsAndServicesGOG) {
     const previousActualExpenditure =
       (await BudgetExpenditure.sum("actualExpenditure", {
         where: {
           organization: user.organization,
           economicClassification,
           sourceOfFunding,
           naturalAccount,
         },
         transaction: t,
       })) || 0;

     const currentActual = Number(actualExpenditure || 0);

     allotmentBalance = allotment - (previousActualExpenditure + currentActual);

     if (allotmentBalance < 0) {
       throw new Error("Actual expenditure exceeds available allotment");
     }
   } else {
     const previousReleases =
       (await BudgetExpenditure.sum("releases", {
         where: {
           organization: user.organization,
           economicClassification,
           sourceOfFunding,
           naturalAccount,
         },
         transaction: t,
       })) || 0;

     allotmentBalance = allotment - (previousReleases + currentRelease);

     if (allotmentBalance < 0) {
       throw new Error("Releases exceed available allotment balance");
     }
   }



    /* =========================
       CREATE RECORD
    ========================== */
    const expenditure = await BudgetExpenditure.create(
      {
        activity,
        date,
        economicClassification,
        sourceOfFunding,
        naturalAccount,
        description,

        appropriation,
        allotment,
        allotmentBalance,
        releases: currentRelease,
        actualExpenditure: actualExpenditure ?? null,
        actualPayment: actualPayment ?? null,

        userId: user.id,
        organization: user.organization,
      },
      { transaction: t }
    );

    await t.commit();

    res.status(201).json({
      success: true,
      message: "Expenditure record added successfully",
      expenditure,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};



// Fetch all expenditure records
export const getAllExpenditure = async (req, res, next) => {
  try {
    const user = req.user;

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

    const expenses = await BudgetExpenditure.findAll({
      where: whereClause,
      include,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    console.error("Error fetching expenditures:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch expenditures",
    });
  }
};





// Update expenditure record
export const updateExpenditure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = req.user;

    const record = await BudgetExpenditure.findByPk(id);
    if (!record) {
      const error = new Error("Expenditure record not found");
      error.statusCode = 404;
      return next(error);
    }

    // Ownership check: Only creator or admin can update
    if (record.userId !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to update this record");
      error.statusCode = 403;
      return next(error);
    }

    // Prevent editing reviewed or approved records
    if (record.status === "Reviewed" || record.status === "Approved") {
      const error = new Error("You cannot edit a reviewed or approved record");
      error.statusCode = 400;
      return next(error);
    }

    await record.update(updates);

    res.status(200).json({
      success: true,
      message: "Expenditure record updated successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};




// Delete expenditure record
export const deleteExpenditure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await BudgetExpenditure.findByPk(id);
    if (!record) {
      const error = new Error("Expenditure record not found");
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
        "You cannot delete a reviewed or approved record"
      );
      error.statusCode = 400;
      return next(error);
    }

    await record.destroy();

    res.status(200).json({
      success: true,
      message: "Expenditure record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};



// Approve expenditure record (Approver only)
export const approveExpenditure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await BudgetExpenditure.findByPk(id);
    if (!record) {
      const error = new Error("Expenditure record not found");
      error.statusCode = 404;
      return next(error);
    }

    // Approver marks record as approved
    record.status = "Approved";
    record.approvedBy = user.name;
    record.approvedAt = new Date();

    await record.save();

    res.status(200).json({
      success: true,
      message: "Expenditure record approved successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};



//  Review expenditure record (Reviewer only)
export const reviewExpenditure = async (req, res, next) => {
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

    // Fetch the expenditure record
    const record = await BudgetExpenditure.findByPk(id);

    if (!record) {
      const error = new Error("Expenditure record not found");
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
      message: "Expenditure record reviewed successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

