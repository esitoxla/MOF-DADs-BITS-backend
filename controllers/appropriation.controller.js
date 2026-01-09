import LoadedData from "../models/loadedData.js";
import User from "../models/users.js";
import { fn, col } from "sequelize";

export const getAppropriationSummary = async (req, res, next) => {
  try {
    const { year, organization, sourceOfFunding = "ALL" } = req.query;

    const user = await User.findByPk(req.user.id);

    //  Security: non-admins cannot request ALL orgs
    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    //  Resolve organization scope
    const where =
      user.role === "admin"
        ? organization && organization !== "ALL"
          ? { organization }
          : {}
        : { organization: user.organization };

    // Year filter
    if (year) {
      where.year = Number(year);
    }

    // Funding filter
    if (sourceOfFunding !== "ALL") {
      where.sourceOfFunding = sourceOfFunding;
    }

    const data = await LoadedData.findAll({
      where,
      attributes: [
        "economicClassification",
        "sourceOfFunding",
        [fn("SUM", col("appropriation")), "totalAppropriation"],
      ],
      group: ["economicClassification", "sourceOfFunding"],
      order: [
        ["economicClassification", "ASC"],
        ["sourceOfFunding", "ASC"],
      ],
    });

    const totals = data.reduce(
      (acc, row) => {
        acc.totalAppropriation += Number(
          row.dataValues.totalAppropriation || 0
        );
        return acc;
      },
      { totalAppropriation: 0 }
    );


    return res.json({
      success: true,
      year: year || null,
      organization:
        user.role === "admin" ? organization || "ALL" : user.organization,
      sourceOfFunding,
      data,
      totals,
    });
  } catch (error) {
    console.error("Appropriation summary error:", error);
    next(error);
  }
};
