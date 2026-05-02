import BudgetExpenditure from "../models/expenditure.model.js";
import { Op, fn, col } from "sequelize";

// =========================
// FETCH DATA
// =========================
export async function getQuarterlyNaturalAccountData({
  year,
  quarter,
  sourceOfFunding,
  organization,
  user,
}) {
  const quarterKey = Number(quarter);

  const quarters = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  };

  if (!quarters[quarterKey]) {
    throw new Error("Invalid quarter");
  }

  const [start, end] = quarters[quarterKey];

  const where = {
    createdAt: { [Op.between]: [start, end] },
  };

  if (sourceOfFunding !== "ALL") {
    where.sourceOfFunding = sourceOfFunding;
  }

  if (user.role !== "admin") {
    where.organization = user.organization;
  } else if (organization && organization !== "ALL") {
    where.organization = organization;
  }

  return await BudgetExpenditure.findAll({
    where,
    attributes: [
      "naturalAccount",
      "sourceOfFunding",
      [fn("SUM", col("appropriation")), "totalAppropriation"],
      [fn("SUM", col("actualExpenditure")), "totalActualExpenditure"],
    ],
    group: ["naturalAccount", "sourceOfFunding"],
    order: [["naturalAccount", "ASC"]],
    raw: true,
  });
}

// =========================
// TRANSFORM DATA
// =========================
export function groupNaturalAccountData(report) {
  const map = new Map();

  report.forEach((item) => {
    const acc = item.naturalAccount;
    const source = item.sourceOfFunding;

    if (!map.has(acc)) {
      map.set(acc, {
        title: acc,
        GOG: { appro: 0, actual: 0 },
        IGF: { appro: 0, actual: 0 },
        DPF: { appro: 0, actual: 0 },
      });
    }

    const row = map.get(acc);

    row[source] = {
      appro: Number(item.totalAppropriation || 0),
      actual: Number(item.totalActualExpenditure || 0),
    };
  });

  return Array.from(map.values());
}

// =========================
// MAIN BUILDER (THIS WAS MISSING)
// =========================
export async function buildNaturalAccountReport(params) {
  const data = await getQuarterlyNaturalAccountData(params);
  return groupNaturalAccountData(data);
}
