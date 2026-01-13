import { getAppropriationData } from "./appropriation.service.js";
import { getQuarterlyReportData } from "./report.service.js";

export async function buildEconomicReport({
  year,
  quarter,
  sourceOfFunding,
  organization,
  user,
}) {
  const appropriations = await getAppropriationData({
    year,
    sourceOfFunding,
    organization,
    user,
  });

  const execution = await getQuarterlyReportData({
    year,
    quarter,
    sourceOfFunding,
    organization,
    user,
  });

  /**
   * INTERNAL MAP
   * key: economicClassification
   * value: parent row with breakdown
   */
  const map = new Map();

  // ============================
  // 1️⃣ LOAD APPROPRIATIONS
  // ============================
  appropriations.forEach((row) => {
    const econ = row.economicClassification;
    const source = row.sourceOfFunding;

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

    const budget = Number(row.totalAppropriation || 0);

    parent.totalBudget += budget;

    parent.breakdown.push({
      source,
      totalBudget: budget,
      amountReleased: 0,
      actualExpenditure: 0,
      actualPayments: 0,
      projection: 0,
    });
  });

  // ============================
  // 2️⃣ MERGE EXECUTION DATA
  // ============================
  execution.forEach((row) => {
    const econ = row.economicClassification;
    const source = row.sourceOfFunding;

    if (!map.has(econ)) {
      // execution without appropriation
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

    let child = parent.breakdown.find((b) => b.source === source);

    if (!child) {
      child = {
        source,
        totalBudget: 0,
        amountReleased: 0,
        actualExpenditure: 0,
        actualPayments: 0,
        projection: 0,
      };
      parent.breakdown.push(child);
    }

    const released = Number(row.totalReleases || 0);
    const expenditure = Number(row.totalExpenditure || 0);
    const payment = Number(row.totalPayment || 0);

    child.amountReleased += released;
    child.actualExpenditure += expenditure;
    child.actualPayments += payment;

    parent.amountReleased += released;
    parent.actualExpenditure += expenditure;
    parent.actualPayments += payment;
  });

  // ============================
  // 3️⃣ FILTER FUNDING SOURCE
  // ============================
  if (sourceOfFunding !== "ALL") {
    map.forEach((parent) => {
      parent.breakdown = parent.breakdown.filter(
        (b) => b.source === sourceOfFunding
      );
    });
  }

  return Array.from(map.values());
}
