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

  const map = new Map();

  // Load appropriations (authoritative)
  // Load appropriations (authoritative)
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

    // parent.totalBudget += budget;

    parent.breakdown.push({
      source,
      totalBudget: budget, //  comes ONLY from LoadedData
      amountReleased: 0,
      actualExpenditure: 0,
      actualPayments: 0,
      projection: 0,
    });
  });

  // Merge execution
  execution.forEach((row) => {
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

    let child = parent.breakdown.find((b) => b.source === source);

    if (!child) {
      // Ignore execution rows without an appropriation
      return;
    }

    const released = Number(row.totalReleases || 0);
    const expenditure = Number(row.totalExpenditure || 0);
    const payment = Number(row.totalPayment || 0);

    child.amountReleased += released;
    child.actualExpenditure += expenditure;
    child.actualPayments += payment;
  });

  // Filter funding source
  if (sourceOfFunding !== "ALL") {
    map.forEach((parent) => {
      parent.breakdown = parent.breakdown.filter(
        (b) => b.source === sourceOfFunding
      );
    });
  }

  // Recalculate totals from final breakdown (single source of truth)
  map.forEach((parent) => {
    parent.totalBudget = parent.breakdown.reduce(
      (sum, b) => sum + Number(b.totalBudget || 0),
      0
    );

    parent.amountReleased = parent.breakdown.reduce(
      (sum, b) => sum + Number(b.amountReleased || 0),
      0
    );

    parent.actualExpenditure = parent.breakdown.reduce(
      (sum, b) => sum + Number(b.actualExpenditure || 0),
      0
    );

    parent.actualPayments = parent.breakdown.reduce(
      (sum, b) => sum + Number(b.actualPayments || 0),
      0
    );
  });

  return Array.from(map.values());
}
