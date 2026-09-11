import User from "../models/users.js";
import { resolveOrganizationScope } from "../utils/resolveOrganizationScope.js";
import {
  getDashboardAnalyticsData,
  parseDashboardPeriod,
} from "../services/analytics.service.js";

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const {
      organization,
      period,
      economicClassification,
      sourceOfFunding,
      revenueCategory,
      currencyType,
    } = req.query;

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not logged in",
      });
    }

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    const { organization: resolvedOrg, isAll } = resolveOrganizationScope({
      user,
      organization,
    });

    const parsedPeriod = parseDashboardPeriod(period);

    const data = await getDashboardAnalyticsData({
      user,
      organization: resolvedOrg,
      period: parsedPeriod,
      economicClassification,
      sourceOfFunding,
      revenueCategory,
      currencyType,
    });

    res.json({
      success: true,
      organization: isAll ? "ALL" : resolvedOrg,
      period: {
        year: parsedPeriod.year,
        quarters: parsedPeriod.quarters,
        start: parsedPeriod.start,
        end: parsedPeriod.end,
      },
      ...data,
    });
  } catch (err) {
    next(err);
  }
};
