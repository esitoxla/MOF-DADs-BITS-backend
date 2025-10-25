import BudgetExpenditure from "../models/expenditure.model.js";
import User from "../models/users.js";

export const addExpenditure = async (req, res, next) => {
  try {
    const {
      activity,
      date,
      economicClassification,
      sourceOfFunding,
      naturalAccount,
      description,
      appropriation,
      allotment,
      allotmentBalance,
      releases,
      actualExpenditure,
      actualPayment,
    } = req.body;

    // Strictly required fields
    const requiredFields = [
      { key: "activity", value: activity },
      { key: "date", value: date },
      { key: "economicClassification", value: economicClassification },
      { key: "sourceOfFunding", value: sourceOfFunding },
      { key: "naturalAccount", value: naturalAccount },
      { key: "description", value: description },
    ];

    const missing = requiredFields.filter((f) => !f.value);
    if (missing.length > 0) {
      const error = new Error(`${missing[0].key} is required`);
      error.statusCode = 400;
      return next(error);
    }

    // Prevent duplicate entries
    const existing = await BudgetExpenditure.findOne({
      where: { activity, date },
    });
    if (existing) {
      const error = new Error(
        "Record already exists for this activity and date"
      );
      error.statusCode = 400;
      return next(error);
    }

    // Create record safely
    const expenditure = await BudgetExpenditure.create({
      activity,
      date,
      economicClassification,
      sourceOfFunding,
      naturalAccount,
      description,
      appropriation: appropriation ?? null,
      allotment: allotment ?? null,
      allotmentBalance: allotmentBalance ?? null,
      releases: releases ?? null,
      actualExpenditure: actualExpenditure ?? null,
      actualPayment: actualPayment ?? null,
    });

    res.status(201).json({
      success: true,
      message: "Expenditure record added successfully",
      expenditure,
    });
  } catch (error) {
    next(error);
  }
};


// Fetch all expenditure records
export const getAllExpenditure = async (req, res, next) => {
  try {
    const expenses = await BudgetExpenditure.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};
