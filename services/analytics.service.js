import { Op, fn, col, where as sqlWhere } from "sequelize";
import BudgetExpenditure from "../models/expenditure.model.js";
import Revenue from "../models/revenue.model.js";
import { getAppropriationData } from "./appropriation.service.js";
import {
  getQuarterlyReportData,
  getQuarterlyRevenueData,
  groupRevenueData,
  totalRevenueSummary,
} from "./report.service.js";
import {
  getCashPositionData,
  groupCashPositionData,
  totalCashPositionSummary,
} from "./cashReport.service.js";
import {
  getReallocationSummaryData,
  groupReallocationSummary,
  totalReallocationSummary,
} from "./reallocationReport.service.js";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const QUARTER_BOUNDS = {
  1: { startSuffix: "01-01", endSuffix: "03-31" },
  2: { startSuffix: "04-01", endSuffix: "06-30" },
  3: { startSuffix: "07-01", endSuffix: "09-30" },
  4: { startSuffix: "10-01", endSuffix: "12-31" },
};

const CURRENCIES = ["GHS", "EUR", "GBP", "USD"];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

const isAll = (value) => !value || String(value).toUpperCase() === "ALL";

const quarterBounds = (year, quarter) => ({
  start: `${year}-${QUARTER_BOUNDS[quarter].startSuffix}`,
  end: `${year}-${QUARTER_BOUNDS[quarter].endSuffix}`,
});

const previousQuarter = (year, quarter) =>
  quarter === 1
    ? { year: year - 1, quarter: 4 }
    : { year, quarter: quarter - 1 };

export function parseDashboardPeriod(period) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  const build = (year, quarters) => {
    const start = quarterBounds(year, quarters[0]).start;
    const end = quarterBounds(year, quarters[quarters.length - 1]).end;

    let prevYear;
    let prevQuarters;
    if (quarters.length === 1) {
      const prev = previousQuarter(year, quarters[0]);
      prevYear = prev.year;
      prevQuarters = [prev.quarter];
    } else {
      prevYear = year - 1;
      prevQuarters = [...quarters];
    }

    return {
      year,
      quarters,
      start,
      end,
      prevYear,
      prevQuarters,
      prevStart: quarterBounds(prevYear, prevQuarters[0]).start,
      prevEnd: quarterBounds(
        prevYear,
        prevQuarters[prevQuarters.length - 1],
      ).end,
    };
  };

  if (!period || String(period).trim().toUpperCase() === "YTD") {
    return build(
      currentYear,
      Array.from({ length: currentQuarter }, (_, i) => i + 1),
    );
  }

  const str = String(period).trim();

  const yearOnly = str.match(/^(\d{4})$/);
  if (yearOnly) {
    return build(Number(yearOnly[1]), [1, 2, 3, 4]);
  }

  const qOnly = str.match(/^Q([1-4])$/i);
  if (qOnly) {
    return build(currentYear, [Number(qOnly[1])]);
  }

  const qThenYear = str.match(/^Q([1-4])[\s\-\/]+(\d{4})$/i);
  if (qThenYear) {
    return build(Number(qThenYear[2]), [Number(qThenYear[1])]);
  }

  const yearThenQ = str.match(/^(\d{4})[\s\-\/]+Q([1-4])$/i);
  if (yearThenQ) {
    return build(Number(yearThenQ[1]), [Number(yearThenQ[2])]);
  }

  const error = new Error("Invalid period. Use YYYY, Q1–Q4, or Q1 YYYY.");
  error.statusCode = 400;
  throw error;
}

function percentChange(current, previous) {
  if (!previous) return current === 0 ? 0 : 100;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

function matchesFilter(value, filter) {
  if (isAll(filter)) return true;
  return String(value || "").toLowerCase() === String(filter).trim().toLowerCase();
}

function monthsInRange(start, end) {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const result = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push({ month: MONTHS[m - 1], monthNum: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
}

async function economicTotals({
  year,
  quarters,
  sourceOfFunding,
  organization,
  user,
  economicClassification,
}) {
  const [appropriations, ...execParts] = await Promise.all([
    getAppropriationData({ year, sourceOfFunding, organization, user }),
    ...quarters.map((quarter) =>
      getQuarterlyReportData({
        year,
        quarter,
        sourceOfFunding,
        organization,
        user,
      }),
    ),
  ]);

  let approRows = appropriations;
  let execRows = execParts.flat();

  if (!isAll(economicClassification)) {
    approRows = approRows.filter((row) =>
      matchesFilter(row.economicClassification, economicClassification),
    );
    execRows = execRows.filter((row) =>
      matchesFilter(row.economicClassification, economicClassification),
    );
  }

  const budget = approRows.reduce(
    (sum, row) => sum + Number(row.totalAppropriation || 0),
    0,
  );
  const expenditure = execRows.reduce(
    (sum, row) => sum + Number(row.totalExpenditure || 0),
    0,
  );

  return { budget: round2(budget), expenditure: round2(expenditure) };
}

async function igfTotals({ year, quarters, organization, revenueCategory }) {
  const groupedParts = await Promise.all(
    quarters.map(async (quarter) => {
      const raw = await getQuarterlyRevenueData({ year, quarter, organization });
      return groupRevenueData(raw);
    }),
  );

  const byCategory = new Map();
  for (const rows of groupedParts) {
    for (const row of rows) {
      const prev = byCategory.get(row.category) || {
        ...row,
        actual: 0,
        payment: 0,
        retention: 0,
        projection: 0,
        projectionDec: 0,
      };
      prev.actual += Number(row.actual || 0);
      prev.payment += Number(row.payment || 0);
      prev.retention += Number(row.retention || 0);
      prev.projection += Number(row.projection || 0);
      prev.projectionDec += Number(row.projectionDec || 0);
      byCategory.set(row.category, prev);
    }
  }

  let grouped = [...byCategory.values()];
  if (!isAll(revenueCategory)) {
    grouped = grouped.filter((row) => matchesFilter(row.category, revenueCategory));
  }

  return round2(totalRevenueSummary(grouped).actual);
}

async function cashSnapshot({ start, end, organization, currencyType }) {
  const raw = await getCashPositionData({
    start_date: start,
    end_date: end,
    organization,
  });
  const grouped = groupCashPositionData(raw);
  const totals = totalCashPositionSummary(grouped);
  const currency =
    currencyType && CURRENCIES.includes(String(currencyType).toUpperCase())
      ? String(currencyType).toUpperCase()
      : "GHS";

  return {
    amount: round2(totals[currency] || 0),
    byCategory: grouped.map(({ account_name, GHS, EUR, GBP, USD }) => ({
      category: account_name,
      GHS: round2(GHS),
      EUR: round2(EUR),
      GBP: round2(GBP),
      USD: round2(USD),
    })),
  };
}

async function reallocationTotals({
  start,
  end,
  organization,
  sourceOfFunding,
  economicClassification,
}) {
  const raw = await getReallocationSummaryData({
    start_date: start,
    end_date: end,
    organization,
    sourceOfFunding,
  });
  const grouped = groupReallocationSummary(raw);
  const filtered = isAll(economicClassification)
    ? grouped
    : grouped.filter((row) => matchesFilter(row.title, economicClassification));
  const totals = totalReallocationSummary(filtered);

  return {
    reallocatedAmount: round2(totals.reallocated),
    released: round2(totals.released),
    actualExpenditure: round2(totals.expenditure),
    actualPayment: round2(totals.payment),
  };
}

async function monthlyTrend({
  model,
  amountCol,
  dateCol,
  start,
  end,
  organization,
  extraWhere = {},
}) {
  const where = {
    [dateCol]: { [Op.between]: [start, end] },
    ...extraWhere,
  };
  if (organization) where.organization = organization;

  const rows = await model.findAll({
    where,
    attributes: [
      [fn("MONTH", col(dateCol)), "monthNum"],
      [fn("SUM", col(amountCol)), "amount"],
    ],
    group: [fn("MONTH", col(dateCol))],
    order: [[fn("MONTH", col(dateCol)), "ASC"]],
    raw: true,
  });

  const byMonth = new Map(
    rows.map((row) => [Number(row.monthNum), Number(row.amount || 0)]),
  );

  return monthsInRange(start, end).map(({ month, monthNum }) => ({
    month,
    amount: round2(byMonth.get(monthNum) || 0),
  }));
}

async function getTopIgfDads({ start, end, organization, revenueCategory }) {
  const where = {
    date: { [Op.between]: [start, end] },
  };
  if (organization) where.organization = organization;
  if (!isAll(revenueCategory)) {
    where[Op.and] = [
      sqlWhere(fn("LOWER", col("revenue_category")), revenueCategory.trim().toLowerCase()),
    ];
  }

  const rows = await Revenue.findAll({
    where,
    attributes: [
      "organization",
      [fn("SUM", col("actual_collection")), "total"],
    ],
    group: ["organization"],
    order: [[fn("SUM", col("actual_collection")), "DESC"]],
    raw: true,
  });

  const grand = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  return rows.slice(0, 5).map((row) => ({
    organization: row.organization,
    percent: grand ? round2((Number(row.total) / grand) * 100) : 0,
  }));
}

export async function getDashboardAnalyticsData({
  user,
  organization,
  period,
  economicClassification,
  sourceOfFunding = "ALL",
  revenueCategory,
  currencyType,
}) {
  const fund = isAll(sourceOfFunding) ? "ALL" : sourceOfFunding;
  const parsed = typeof period === "object" && period?.year ? period : parseDashboardPeriod(period);

  const expenditureWhere = {};
  if (!isAll(fund)) expenditureWhere.sourceOfFunding = fund;
  if (!isAll(economicClassification)) {
    expenditureWhere.economicClassification = economicClassification;
  }

  const igfWhere = {};
  if (!isAll(revenueCategory)) {
    igfWhere[Op.and] = [
      sqlWhere(fn("LOWER", col("revenue_category")), revenueCategory.trim().toLowerCase()),
    ];
  }

  const [
    currentEco,
    prevEco,
    currentIgf,
    prevIgf,
    currentCash,
    prevCash,
    reallocation,
    igfCollectionTrend,
    expenditureTrend,
    topIgfDads,
  ] = await Promise.all([
    economicTotals({
      year: parsed.year,
      quarters: parsed.quarters,
      sourceOfFunding: fund,
      organization,
      user,
      economicClassification,
    }),
    economicTotals({
      year: parsed.prevYear,
      quarters: parsed.prevQuarters,
      sourceOfFunding: fund,
      organization,
      user,
      economicClassification,
    }),
    igfTotals({
      year: parsed.year,
      quarters: parsed.quarters,
      organization,
      revenueCategory,
    }),
    igfTotals({
      year: parsed.prevYear,
      quarters: parsed.prevQuarters,
      organization,
      revenueCategory,
    }),
    cashSnapshot({
      start: parsed.start,
      end: parsed.end,
      organization,
      currencyType,
    }),
    cashSnapshot({
      start: parsed.prevStart,
      end: parsed.prevEnd,
      organization,
      currencyType,
    }),
    reallocationTotals({
      start: parsed.start,
      end: parsed.end,
      organization,
      sourceOfFunding: fund,
      economicClassification,
    }),
    monthlyTrend({
      model: Revenue,
      amountCol: "actual_collection",
      dateCol: "date",
      start: parsed.start,
      end: parsed.end,
      organization,
      extraWhere: igfWhere,
    }),
    monthlyTrend({
      model: BudgetExpenditure,
      amountCol: "actualExpenditure",
      dateCol: "date",
      start: parsed.start,
      end: parsed.end,
      organization,
      extraWhere: expenditureWhere,
    }),
    getTopIgfDads({
      start: parsed.start,
      end: parsed.end,
      organization,
      revenueCategory,
    }),
  ]);

  const expenditureToDate = currentEco.expenditure;
  const prevExpenditure = prevEco.expenditure;
  const totalBudget = currentEco.budget;
  const budgetUtilisationPct = totalBudget
    ? round3((expenditureToDate / totalBudget) * 100)
    : 0;

  return {
    summary: {
      totalBudget,
      expenditureToDate,
      expenditureChangePct: percentChange(expenditureToDate, prevExpenditure),
      budgetUtilisationPct,
      variance: round2(totalBudget - expenditureToDate),
      igfCollectionToDate: currentIgf,
      igfChangePct: percentChange(currentIgf, prevIgf),
      cashPositionToDate: currentCash.amount,
      cashPositionChangePct: percentChange(currentCash.amount, prevCash.amount),
    },
    igfCollectionTrend,
    expenditureTrend,
    topIgfDads,
    reallocation,
    cashPositionByCategory: currentCash.byCategory,
  };
}
