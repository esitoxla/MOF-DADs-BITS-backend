export const getQuarterPeriod = (year, quarter) => {
  const quarterMonths = {
    1: { start: "JANUARY", end: "MARCH", endMonthIndex: 2 },
    2: { start: "APRIL", end: "JUNE", endMonthIndex: 5 },
    3: { start: "JULY", end: "SEPTEMBER", endMonthIndex: 8 },
    4: { start: "OCTOBER", end: "DECEMBER", endMonthIndex: 11 },
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
