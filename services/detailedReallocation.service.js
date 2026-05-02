import { Op } from "sequelize";
import Reallocation from "../models/reallocation.model.js";

export const getDetailedReallocationData = async ({
  year,
  quarter,
  organization,
  
}) => {
  const ranges = {
    1: { start: `${year}-01-01`, end: `${year}-03-31` },
    2: { start: `${year}-04-01`, end: `${year}-06-30` },
    3: { start: `${year}-07-01`, end: `${year}-09-30` },
    4: { start: `${year}-10-01`, end: `${year}-12-31` },
  };

  const { start, end } = ranges[quarter];

  const where = {
    createdAt: {
      // FIXED
      [Op.between]: [start, end],
    },
  };

  if (organization) {
    where.organization = organization;
  }

  // enforce GOG (optional but recommended)
  where.sourceOfFunding = "GOG";

  return Reallocation.findAll({
    where,
    order: [["createdAt", "ASC"]],
  });
};