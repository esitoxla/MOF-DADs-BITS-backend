import BudgetExpenditure from "../models/expenditure.model.js";
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

  let where = {
    date: { [Op.between]: [start, end] },
  };

  if (sourceOfFunding !== "ALL") {
    where.sourceOfFunding = sourceOfFunding;
  }

  const include = [
    {
      model: User,
      attributes: [],
      where:
        user.role === "admin"
          ? organization
            ? { organization }
            : {}
          : { organization: user.organization },
    },
  ];

  return await BudgetExpenditure.findAll({
    where,
    include,
    attributes: [
      "economicClassification",
      "sourceOfFunding",
      [fn("SUM", col("appropriation")), "totalAppropriation"],
      [fn("SUM", col("releases")), "totalReleases"],
      [fn("SUM", col("actualExpenditure")), "totalExpenditure"],
      [fn("SUM", col("actualPayment")), "totalPayment"],
    ],
    group: ["economicClassification", "sourceOfFunding"],
    order: [["economicClassification", "ASC"]],
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
