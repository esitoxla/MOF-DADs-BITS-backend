import Cash from "../models/cash.model.js";
import { Op } from "sequelize";


export const getCashPositionData = async ({
  start_date,
  end_date,
  organization,
}) => {
  const where = {
    as_at_date: {
      [Op.between]: [start_date, end_date],
    },
  };

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
  const latestRecords = {};
  const formatted = {};

  // Step 1: Keep only latest record per account + currency
  rows.forEach((row) => {
    const key = `${row.account_name}-${row.currency}`;

    if (!latestRecords[key]) {
      // Because sorted DESC by date,
      // first one we encounter is latest
      latestRecords[key] = row;
    }
  });

  // Step 2: Format for table
  Object.values(latestRecords).forEach(
    ({ account_name, currency, balance }) => {
      if (!formatted[account_name]) {
        formatted[account_name] = {
          account_name,
          GHS: 0,
          USD: 0,
          GBP: 0,
          EUR: 0,
        };
      }

      formatted[account_name][currency] = Number(balance);
    },
  );

  return Object.values(formatted);
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
