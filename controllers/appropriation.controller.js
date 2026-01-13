import LoadedData from "../models/loadedData.js";
import User from "../models/users.js";
import { fn, col } from "sequelize";

export const getAppropriationSummary = async (req, res, next) => {
  try {
    const { year, organization, sourceOfFunding = "ALL" } = req.query;

    const user = await User.findByPk(req.user.id);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    const where =
      user.role === "admin"
        ? organization && organization !== "ALL"
          ? { organization }
          : {}
        : { organization: user.organization };

    if (year) where.year = Number(year);
    if (sourceOfFunding !== "ALL") where.sourceOfFunding = sourceOfFunding;

    const rows = await LoadedData.findAll({
      where,
      attributes: [
        "economicClassification",
        "sourceOfFunding",
        [fn("SUM", col("appropriation")), "appropriation"],
      ],
      group: ["economicClassification", "sourceOfFunding"],
      order: [
        ["economicClassification", "ASC"],
        ["sourceOfFunding", "ASC"],
      ],
      raw: true,
    });

    const data = rows.reduce((acc, r) => {
      if (!acc[r.economicClassification]) {
        acc[r.economicClassification] = {
          economicClassification: r.economicClassification,
          breakdown: {},
          total: 0,
        };
      }

      acc[r.economicClassification].breakdown[r.sourceOfFunding] = Number(
        r.appropriation || 0
      );
      acc[r.economicClassification].total += Number(r.appropriation || 0);

      return acc;
    }, {});

    res.json({
      success: true,
      year,
      organization:
        user.role === "admin" ? organization || "ALL" : user.organization,
      sourceOfFunding,
      data: Object.values(data),
    });
  } catch (error) {
    next(error);
  }
};
