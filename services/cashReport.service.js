import Cash from "../models/cash.model.js";

export const getCashPositionData = async ({ as_at_date, organization }) => {
  const where = { as_at_date };

  if (organization) {
    where.organization = organization;
  }

  return Cash.findAll({
    where,
    attributes: ["account_name", "currency", "balance"],
    order: [["account_name", "ASC"]],
  });
};


export const groupCashPositionData = (rows) => {
  const grouped = {};

  rows.forEach(({ account_name, currency, balance }) => {
    if (!grouped[account_name]) {
      grouped[account_name] = {
        account_name,
        GHS: 0,
        USD: 0,
        GBP: 0,
        EUR: 0,
      };
    }

    grouped[account_name][currency] += Number(balance);
  });

  return Object.values(grouped);
};


export const totalCashPositionSummary = (grouped) => {
  return grouped.reduce(
    (totals, row) => {
      totals.GHS += row.GHS;
      totals.USD += row.USD;
      totals.GBP += row.GBP;
      totals.EUR += row.EUR;
      return totals;
    },
    { GHS: 0, USD: 0, GBP: 0, EUR: 0 },
  );
};
