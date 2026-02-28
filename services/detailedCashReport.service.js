import { Op } from "sequelize";
import Cash from "../models/cash.model.js";

export const getDetailedCashData = async ({
  year,
  quarter,
  organization,
}) => {
  const getQuarterDateRange = (year, quarter) => {
    const ranges = {
      1: { start: `${year}-01-01`, end: `${year}-03-31` },
      2: { start: `${year}-04-01`, end: `${year}-06-30` },
      3: { start: `${year}-07-01`, end: `${year}-09-30` },
      4: { start: `${year}-10-01`, end: `${year}-12-31` },
    };

    return ranges[quarter];
  };

  const { start, end } = getQuarterDateRange(year, quarter);

  const where = {
    as_at_date: {
      [Op.between]: [start, end],
    },
  };

  if (organization) {
    where.organization = organization;
  }

  return Cash.findAll({
    where,
    order: [["as_at_date", "ASC"]],
  });
};
