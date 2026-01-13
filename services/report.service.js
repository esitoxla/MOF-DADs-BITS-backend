import BudgetExpenditure from "../models/expenditure.model.js";
import Revenue from "../models/revenue.model.js";
import User from "../models/users.js";
import { Op, fn, col } from "sequelize";



export async function getQuarterlyReportData({
  year,
  quarter,
  sourceOfFunding,
  organization,
  user,
}) {
  const quarters = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  };

  const [start, end] = quarters[quarter];

  const where = {
    createdAt: { [Op.between]: [start, end] }, // 
  };

  if (sourceOfFunding !== "ALL") {
    where.sourceOfFunding = sourceOfFunding;
  }

  return await BudgetExpenditure.findAll({
    where,
    attributes: [
      "economicClassification",
      "sourceOfFunding",
      [fn("SUM", col("releases")), "totalReleases"],
      [fn("SUM", col("actualExpenditure")), "totalExpenditure"],
      [fn("SUM", col("actualPayment")), "totalPayment"],
    ],
    group: ["economicClassification", "sourceOfFunding"],
    order: [["economicClassification", "ASC"]],
    raw: true,
  });
}





// Helper: Group DB results like UI table structure
export function groupEconomicData(report, selectedSource) {
  const map = new Map();

  report.forEach((item) => {
    const econ = item.economicClassification;
    const source = item.sourceOfFunding;

    if (!map.has(econ)) {
      map.set(econ, {
        title: econ,
        totalBudget: 0,
        amountReleased: 0,
        actualExpenditure: 0,
        actualPayments: 0,
        projection: 0,
        breakdown: [],
      });
    }

    const parent = map.get(econ);

    // Add breakdown row only for the selected source OR all sources
    parent.breakdown.push({
      source,
      totalBudget: Number(item.dataValues.totalAppropriation || 0),
      amountReleased: Number(item.dataValues.totalReleases || 0),
      actualExpenditure: Number(item.dataValues.totalExpenditure || 0),
      actualPayments: Number(item.dataValues.totalPayment || 0),
      projection: 0,
    });

    // Sum parent totals
    parent.totalBudget += Number(item.dataValues.totalAppropriation || 0);
    parent.amountReleased += Number(item.dataValues.totalReleases || 0);
    parent.actualExpenditure += Number(item.dataValues.totalExpenditure || 0);
    parent.actualPayments += Number(item.dataValues.totalPayment || 0);
  });

  return Array.from(map.values());
}



export function sortByEconomicOrder(arr) {
  const desiredOrder = [
    "Compensation of Employees",
    "Use of Goods and Services",
    "Capital Expenditure",
  ];

  return arr.sort(
    (a, b) => desiredOrder.indexOf(a.title) - desiredOrder.indexOf(b.title)
  );
}


export function sortFundingSources(breakdown) {
  const order = ["GoG", "IGF", "DPF"];

  return breakdown.sort(
    (a, b) => order.indexOf(a.source) - order.indexOf(b.source)
  );
}



// =======================
// REVENUE REPORT SECTION
// =======================

//Fetch the right revenue records from the database
export async function getQuarterlyRevenueData({
  year,
  quarter,
  organization,
  user,
}) {
  const quarters = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  };

  const [start, end] = quarters[quarter];

  const where = {
    date: { [Op.between]: [start, end] },
    ...(organization && { organization }), // null = ALL
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




//Group and reshape them into rows your table understands
//This converts DB raw data → your React table format.
export function groupRevenueData(records) {
  const CATEGORY_MAP = {
    "fees/charges": "Fees/Charges",
    fines: "Fines/Forfeitures",
    "fines/forfeitures": "Fines/Forfeitures",
    interests: "Interests",
    licenses: "Licenses",
    others: "Others",
    "sale of goods and services": "Sale Of Goods and Services",
  };

  return records.map((row) => {
    const rawCategory = row.revenue_category?.toLowerCase();

    // C (Actual collection)
    const actual = Number(row.dataValues.totalActual || 0);

    // D (Payment to CF)
    const payment = Number(row.dataValues.totalPayment || 0);

    // E (Retention)
    const retention = Number(row.dataValues.totalRetention || 0);

    return {
      category: CATEGORY_MAP[rawCategory] || row.revenue_category,

      // B — Budget / projection (not stored yet)
      projection: 0,

      // C
      actual,

      // D
      payment,

      // E
      retention,

      // Projection at Dec (temporary business rule)
      projectionDec: actual,

      remarks: row.dataValues.remarks || "",
    };
  });
}






//Add everything up for the TOTAL row
// Calculate totals for revenue footer row
export function totalRevenueSummary(grouped) {
  return grouped.reduce(
    (acc, row) => {
      acc.projection += row.projection;
      acc.actual += row.actual;
      acc.payment += row.payment;
      acc.retention += row.retention;
      acc.projectionDec += row.projectionDec;
      return acc;
    },
    {
      projection: 0,
      actual: 0,
      payment: 0,
      retention: 0,
      projectionDec: 0,
    }
  );
}
