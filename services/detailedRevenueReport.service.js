import { Op, fn, col } from "sequelize";
import Revenue from "../models/revenue.model.js";


export function mapDetailedRevenueRows(rows) {
  const CATEGORY_MAP = {
    "fees/charges": "Fees/Charges",
    fines: "Fines/Forfeitures",
    "fines/forfeitures": "Fines/Forfeitures",
    interests: "Interests",
    licenses: "Licenses",
    others: "Others",
    "sale of goods and services": "Sale Of Goods and Services",
  };

  return rows.map((r) => {
    const rawCategory = r.revenue_category?.toLowerCase();

    return {
      id: r.id,
      date: r.date,

      category: CATEGORY_MAP[rawCategory] || r.revenue_category,

      projection: 0,

      actual: Number(r.actual_collection || 0),
      payment: Number(r.payment_amount || 0),

      retentionRate: r.retention_rate ?? 0,
      retention: Number(r.retention_amount || 0),

      remarks: r.remarks || "",
    };
  });
}


/**
 * INTERNAL helper – scoped only to this service file
 */
function resolveQuarterRange(year, quarter) {
  const ranges = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  };

  if (!ranges[quarter]) {
    throw new Error("Invalid quarter");
  }

  return ranges[quarter];
}

/**
 * =========================
 * SUMMARY (GROUPED) REVENUE
 * =========================
 */
export async function getQuarterlyRevenueData({ year, quarter, organization }) {
  const [startDate, endDate] = resolveQuarterRange(year, quarter);

  const where = {
    date: { [Op.between]: [startDate, endDate] },
    ...(organization && organization !== "ALL" && { organization }),
  };

  return Revenue.findAll({
    where,
    attributes: [
      [fn("LOWER", col("revenue_category")), "revenue_category"],
      [fn("SUM", col("actual_collection")), "totalActual"],
      [fn("SUM", col("payment_amount")), "totalPayment"],
      [fn("SUM", col("retention_amount")), "totalRetention"],
      [fn("MAX", col("remarks")), "remarks"],
    ],
    group: [fn("LOWER", col("revenue_category"))],
    order: [[fn("LOWER", col("revenue_category")), "ASC"]],
  });
}

/**
 * =========================
 * DETAILED (RAW) REVENUE
 * =========================
 */
export async function getDetailedRevenueData({ year, quarter, organization }) {
  const [startDate, endDate] = resolveQuarterRange(year, quarter);

  const where = {
    date: { [Op.between]: [startDate, endDate] },
    ...(organization && organization !== "ALL" && { organization }),
  };

  return Revenue.findAll({
    where,
    order: [["date", "ASC"]],
  });
  
}
