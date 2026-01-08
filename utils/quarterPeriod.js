export const getQuarterPeriod = (year, quarter) => {
  const quarterMonths = {
    1: { start: "JAN", end: "MAR", endMonthIndex: 2 },
    2: { start: "APR", end: "JUN", endMonthIndex: 5 },
    3: { start: "JUL", end: "SEP", endMonthIndex: 8 },
    4: { start: "OCT", end: "DEC", endMonthIndex: 11 },
  };

  const q = quarterMonths[quarter];

  if (!q) {
    throw new Error("Invalid quarter");
  }

  return {
    year,
    quarter,
    quarterLabel: `Q${quarter} ${year}`,
    endMonthName: q.end,
    projectionLabel: `31 DEC ${year}`,
  };
};
