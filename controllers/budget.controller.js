import LoadedData from "../models/loadedData.js";
import BudgetExpenditure from "../models/expenditure.model.js";
import sequelize from "../config/database.js";

/**
 * GET /api/budget/natural-accounts
 * Fetch natural accounts dynamically based on:
 * - organization
 * - economic classification
 * - source of funding
 */
export const getNaturalAccounts = async (req, res, next) => {
  try {
    const { eco, fund } = req.query;
    const user = req.user;

    if (!eco || !fund) {
      const error = new Error("eco and fund query parameters are required");
      error.statusCode = 400;
      return next(error);
    }

    const organization = user.organization;

    const results = await LoadedData.findAll({
      attributes: ["naturalAccount"],
      where: {
        organization,
        economicClassification: eco.trim(),
        sourceOfFunding: fund.trim(),
      },
      group: ["naturalAccount"], // avoid duplicates
    });

    res.status(200).json({
      success: true,
      naturalAccounts: results.map((row) => row.naturalAccount),
    });
  } catch (error) {
    next(error);
  }
};


/**
 * GET /api/budget/values
 * Fetch appropriation, allotment, and running balance based on:
 * - economic classification
 * - source of funding
 * - natural account
 * - organization
 */
export const getBudgetValues = async (req, res, next) => {
  try {
    const { eco, fund, account } = req.query;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!eco || !fund || !account) {
      return res.status(400).json({
        success: false,
        message: "eco, fund and account are required",
      });
    }

    const allocation = await LoadedData.findOne({
      where: {
        organization: user.organization,
        economicClassification: eco.trim(),
        sourceOfFunding: fund.trim(),
        naturalAccount: account.trim(),
      },
    });

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: "No allocation found",
      });
    }

    const { appropriation, allotment } = allocation;

    const totalReleases = await BudgetExpenditure.sum("releases", {
      where: {
        organization: user.organization,
        economicClassification: eco.trim(),
        sourceOfFunding: fund.trim(),
        naturalAccount: account.trim(),
      },
    });

    const balance = allotment - (totalReleases || 0);

    res.status(200).json({
      success: true,
      data: {
        appropriation,
        allotment,
        balance,
      },
    });
  } catch (err) {
    next(err);
  }
};


