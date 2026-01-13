import LoadedData from "../models/loadedData.js";
import { fn, col } from "sequelize";

export async function getAppropriationData({
  year,
  sourceOfFunding,
  organization,
  user,
}) {
  const where = {
    year,
    ...(sourceOfFunding !== "ALL" && { sourceOfFunding }),
  };

  if (user.role !== "admin") {
    where.organization = user.organization;
  } else if (organization) {
    where.organization = organization;
  }

  return LoadedData.findAll({
    where,
    attributes: [
      "economicClassification",
      "sourceOfFunding",
      [fn("SUM", col("appropriation")), "totalAppropriation"],
    ],
    group: ["economicClassification", "sourceOfFunding"],
    raw: true,
  });
}
