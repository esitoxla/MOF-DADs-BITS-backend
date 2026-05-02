import Reallocation from "../models/reallocation.model.js";
import { Op, fn, col } from "sequelize";

export const getReallocationSummaryData = async ({
  start_date,
  end_date,
  organization,
  sourceOfFunding,
}) => {
  const where = {
    createdAt: {
      // FIXED
      [Op.between]: [start_date, end_date],
    },
  };

  //  FIXED organization handling
  if (organization && organization !== "ALL") {
    where.organization = organization;
  }

  //  already correct
  if (sourceOfFunding && sourceOfFunding !== "ALL") {
    where.sourceOfFunding = sourceOfFunding;
  }

  return Reallocation.findAll({
    where,
    attributes: [
      "economicClassification",
      "sourceOfFunding",

      [fn("SUM", col("amountReallocated")), "totalReallocated"],
      [fn("SUM", col("amountReleased")), "totalReleased"],
      [fn("SUM", col("actualExpenditure")), "totalExpenditure"],
      [fn("SUM", col("actualPayment")), "totalPayment"],
    ],
    group: ["economicClassification", "sourceOfFunding"],
    order: [["economicClassification", "ASC"]],
    raw: true,
  });
};

export const groupReallocationSummary = (rows) => {
  const formatted = {};

  rows.forEach((row) => {
    const key = row.economicClassification || "Unknown";
    const fund = row.sourceOfFunding || "Unknown";

    if (!formatted[key]) {
      formatted[key] = {
        title: key,
        GOG: { reallocated: 0, released: 0, expenditure: 0, payment: 0 },
        IGF: { reallocated: 0, released: 0, expenditure: 0, payment: 0 },
        DPF: { reallocated: 0, released: 0, expenditure: 0, payment: 0 },
      };
    }

    // Prevent crash if unexpected funding type
    if (!formatted[key][fund]) {
      formatted[key][fund] = {
        reallocated: 0,
        released: 0,
        expenditure: 0,
        payment: 0,
      };
    }

    formatted[key][fund] = {
      reallocated: Number(row.totalReallocated || 0),
      released: Number(row.totalReleased || 0),
      expenditure: Number(row.totalExpenditure || 0),
      payment: Number(row.totalPayment || 0),
    };
  });

  return Object.values(formatted);
};

export const totalReallocationSummary = (grouped) => {
  return grouped.reduce(
    (totals, row) => {
      ["GOG", "IGF", "DPF"].forEach((fund) => {
        const data = row[fund] || {}; 

        totals.reallocated += data.reallocated || 0;
        totals.released += data.released || 0;
        totals.expenditure += data.expenditure || 0;
        totals.payment += data.payment || 0;
      });

      return totals;
    },
    {
      reallocated: 0,
      released: 0,
      expenditure: 0,
      payment: 0,
    },
  );
};