import LoadedData from "../models/loadedData.js";
import { fn, col } from "sequelize";

//Sum appropriations from loadedData
export async function getAppropriationTotals({ organization, user, year }) {
  const where =
    user.role === "admin"
      ? organization && organization !== "ALL"
        ? { organization }
        : {}
      : { organization: user.organization };

      if (year) {
  where.year = Number(year);
}

  return LoadedData.findAll({
    where,
    attributes: [
      "economicClassification",
      "sourceOfFunding",
      [fn("SUM", col("appropriation")), "totalAppropriation"],
    ],
    group: ["economicClassification", "sourceOfFunding"],
  });
}


