import BudgetExpenditure from "../models/expenditure.model.js";
import { Op } from "sequelize";



export async function getDetailedECReport({ year, quarter, organization }) {
  const quarters = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  };

  const [start, end] = quarters[quarter];

  const where = {
    date: { [Op.between]: [start, end] },
    ...(organization && organization !== "ALL" && { organization }),
  };

  return BudgetExpenditure.findAll({
    where,
    order: [["date", "ASC"]],
  });
}
