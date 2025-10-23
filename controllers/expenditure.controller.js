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

    if (
      !activity ||
      !date ||
      !economicClassification ||
      !sourceOfFunding ||
      !naturalAccount ||
      !description ||
      !appropriation ||
      !allotment ||
      !allotmentBalance 
    ) {
      const error = new Error("All fields are required");
      error.statusCode = 400;
      return next(error);
    }

    const existingExpenditure = await BudgetExpenditure.findOne({
      where: { activity, date },
    });
    if (existingExpenditure) {
      const error = new Error("Data already exist");
      error.statusCode = 400;
      return next(error);
    }

    const expenditure = await BudgetExpenditure.create({
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
