import sequelize from "../config/database.js";
import BudgetExpenditure from "../models/expenditure.model.js";
import { Op } from "sequelize";
import User from "../models/users.js";

export const getQuarterlyReport = async (req, res, next) => {
  try {
    const { year, quarter, organization, sourceOfFunding = "ALL" } = req.query;
    const user = await User.findByPk(req.user.id);

    if (!year || !quarter) {
       const error = new Error("Year and quarter are required.");
      error.statusCode = 404;
      return next(error);
    }

    // Define quarters
    const quarters = {
      1: [`${year}-01-01`, `${year}-03-31`],
      2: [`${year}-04-01`, `${year}-06-30`],
      3: [`${year}-07-01`, `${year}-09-30`],
      4: [`${year}-10-01`, `${year}-12-31`],
    };
    const [quarterStart, quarterEnd] = quarters[quarter] || [];

    // Base filter
    let where = {
      date: { [Op.between]: [quarterStart, quarterEnd] },
    };

    // Org restriction
    if (user.role !== "admin") {
      where.organization = user.organization;
    } else if (organization) {
      where.organization = organization;
    }

    // Funding source filter
    let groupBy = ["economicClassification"];
    if (sourceOfFunding !== "ALL") {
      where.sourceOfFunding = sourceOfFunding;
    } else {
      groupBy.push("sourceOfFunding"); // group by both when showing all
    }

    // Query and aggregate
    const report = await BudgetExpenditure.findAll({
      where,
      attributes: [
        "economicClassification",
        ...(sourceOfFunding === "ALL" ? ["sourceOfFunding"] : []),
        [
          sequelize.fn("SUM", sequelize.col("appropriation")),
          "totalAppropriation",
        ],
        [sequelize.fn("SUM", sequelize.col("releases")), "totalReleases"],
        [
          sequelize.fn("SUM", sequelize.col("actualExpenditure")),
          "totalExpenditure",
        ],
        [sequelize.fn("SUM", sequelize.col("actualPayment")), "totalPayment"],
      ],
      group: groupBy,
      order: [
        ["economicClassification", "ASC"],
        ...(sourceOfFunding === "ALL" ? [["sourceOfFunding", "ASC"]] : []),
      ],
    });

    // Totals
    const totals = report.reduce(
      (acc, r) => ({
        totalAppropriation:
          acc.totalAppropriation + Number(r.dataValues.totalAppropriation || 0),
        totalReleases:
          acc.totalReleases + Number(r.dataValues.totalReleases || 0),
        totalExpenditure:
          acc.totalExpenditure + Number(r.dataValues.totalExpenditure || 0),
        totalPayment: acc.totalPayment + Number(r.dataValues.totalPayment || 0),
      }),
      {
        totalAppropriation: 0,
        totalReleases: 0,
        totalExpenditure: 0,
        totalPayment: 0,
      }
    );

    res.status(200).json({
      success: true,
      organization: organization || user.organization || "All",
      sourceOfFunding,
      year,
      quarter,
      report,
      totals,
    });
  } catch (error) {
    next(error);
    // console.error("Error generating report:", error);
    // res.status(500).json({ message: "Internal Server Error" });
  }
};
