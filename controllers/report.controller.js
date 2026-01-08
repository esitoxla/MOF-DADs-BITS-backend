import ExcelJS from "exceljs";
import BudgetExpenditure from "../models/expenditure.model.js";
import User from "../models/users.js";
import { Op, fn, col } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import { getQuarterlyReportData, groupEconomicData, sortByEconomicOrder, sortFundingSources } from "../services/report.service.js";
import { generateQuarterlyPDF } from "../utils/pdfGenerator.js";
import { getQuarterPeriod } from "../utils/quarterPeriod.js";
import { resolveOrganizationScope } from "../utils/resolveOrganizationScope.js";


export const getQuarterlyReport = async (req, res, next) => {
  try {
    const { year, quarter, organization, sourceOfFunding = "ALL" } = req.query;
    const user = await User.findByPk(req.user.id);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }


    if (!year || !quarter) {
      return next(new Error("Year and quarter are required."));
    }

    // Quarter ranges
    const quarters = {
      1: [`${year}-01-01`, `${year}-03-31`],
      2: [`${year}-04-01`, `${year}-06-30`],
      3: [`${year}-07-01`, `${year}-09-30`],
      4: [`${year}-10-01`, `${year}-12-31`],
    };
    const [quarterStart, quarterEnd] = quarters[quarter];

    // WHERE clause
    let where = {
      date: { [Op.between]: [quarterStart, quarterEnd] },
    };

    if (sourceOfFunding !== "ALL") {
      where.sourceOfFunding = sourceOfFunding; // IMPORTANT
    }

     const { organization: resolvedOrg, isAll } = resolveOrganizationScope({
       user,
       organization,
     });

    const include = [
      {
        model: User,
        attributes: [],
        ...(resolvedOrg && { where: { organization: resolvedOrg } }),
      },
    ];



    // ALWAYS group by both (fix)
    const groupBy = ["economicClassification", "sourceOfFunding"];

    // ALWAYS select both fields (fix)
    const attributes = [
      "economicClassification",
      "sourceOfFunding",
      [fn("SUM", col("appropriation")), "totalAppropriation"],
      [fn("SUM", col("releases")), "totalReleases"],
      [fn("SUM", col("actualExpenditure")), "totalExpenditure"],
      [fn("SUM", col("actualPayment")), "totalPayment"],
    ];

    const report = await BudgetExpenditure.findAll({
      where,
      include,
      attributes,
      group: groupBy,
      order: [
        ["economicClassification", "ASC"],
        ["sourceOfFunding", "ASC"],
      ],
    });

    // Compute totals
    const totals = report.reduce(
      (acc, r) => ({
        totalAppropriation:
          acc.totalAppropriation + Number(r.dataValues.totalAppropriation || 0),
        totalReleases:
          acc.totalReleases + Number(r.dataValues.totalReleases || 0),
        totalExpenditure:
          acc.totalExpenditure + Number(r.dataValues.totalExpenditure || 0),
        totalPayment: acc.totalPayment + Number(r.dataValues.totalPayment || 0),
      }),
      {
        totalAppropriation: 0,
        totalReleases: 0,
        totalExpenditure: 0,
        totalPayment: 0,
      }
    );

   
    return res.json({
      success: true,
      organization: isAll ? "ALL" : resolvedOrg,
      sourceOfFunding,
      year,
      quarter,
      report,
      totals,
    });
  } catch (error) {
    next(error);
  }
};





export const exportQuarterlyReportExcel = async (req, res, next) => {
  try {
    const { year, quarter, sourceOfFunding = "ALL", organization } = req.query;

    // Basic validation
    if (!year || !quarter) {
      return res
        .status(400)
        .json({ message: "Year and quarter are required." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "User not logged in!" });
    }

    // Resolve user first (IMPORTANT)
    const user = await User.findByPk(req.user.id);

    // Security: non-admins cannot request ALL
    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    // Quarter ranges
    const quarters = {
      1: [`${year}-01-01`, `${year}-03-31`],
      2: [`${year}-04-01`, `${year}-06-30`],
      3: [`${year}-07-01`, `${year}-09-30`],
      4: [`${year}-10-01`, `${year}-12-31`],
    };

    const [start, end] = quarters[quarter];

    // WHERE clause
    const where = {
      date: { [Op.between]: [start, end] },
    };

    if (sourceOfFunding !== "ALL") {
      where.sourceOfFunding = sourceOfFunding;
    }

    // Resolve organization scope (admin / ALL / user)
    const { organization: orgScope } = resolveOrganizationScope({
      user,
      organization,
    });

    const include = [
      {
        model: User,
        attributes: [],
        ...(orgScope && { where: { organization: orgScope } }),
      },
    ];

    // Always group consistently
    const groupBy = ["economicClassification", "sourceOfFunding"];

    const report = await BudgetExpenditure.findAll({
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
      group: groupBy,
      order: [
        ["economicClassification", "ASC"],
        ["sourceOfFunding", "ASC"],
      ],
    });

    // Group & sort
    let grouped = groupEconomicData(report, sourceOfFunding);
    grouped = sortByEconomicOrder(grouped);

    if (sourceOfFunding === "ALL") {
      grouped = grouped.map((item) => ({
        ...item,
        breakdown: sortFundingSources(item.breakdown),
      }));
    }

    // Totals
    const totals = grouped.reduce(
      (acc, x) => ({
        totalBudget: acc.totalBudget + x.totalBudget,
        amountReleased: acc.amountReleased + x.amountReleased,
        actualExpenditure: acc.actualExpenditure + x.actualExpenditure,
        actualPayments: acc.actualPayments + x.actualPayments,
        projection: 0,
      }),
      {
        totalBudget: 0,
        amountReleased: 0,
        actualExpenditure: 0,
        actualPayments: 0,
        projection: 0,
      }
    );

    // Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Quarterly Report", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const period = getQuarterPeriod(year, quarter);

    sheet.addRow([
      "Summary of Budget Performance by Economic Classification and Funding",
    ]).font = { bold: true, size: 14 };

    const header = [
      "EXPENDITURE ITEM",
      `${period.year} APPROVED BUDGET / APPROPRIATION`,
      `AMOUNT RELEASED AS AT END ${period.endMonthName} ${period.year}`,
      `ACTUAL EXPENDITURE AS AT END ${period.endMonthName} ${period.year}`,
      `ACTUAL PAYMENTS AS AT END ${period.endMonthName} ${period.year}`,
      `PROJECTIONS AS AT 31 DEC ${period.year}`,
    ];

    sheet.addRow(header).font = { bold: true };

    // Rows
    grouped.forEach((item) => {
      const parent = sheet.addRow([
        item.title,
        item.totalBudget,
        item.amountReleased,
        item.actualExpenditure,
        item.actualPayments,
        item.projection,
      ]);
      parent.font = { bold: true };

      item.breakdown.forEach((b) => {
        const child = sheet.addRow([
          b.source,
          b.totalBudget,
          b.amountReleased,
          b.actualExpenditure,
          b.actualPayments,
          b.projection,
        ]);

        child.font = { italic: true, color: { argb: "FF555555" } };
        child.getCell(1).alignment = { indent: 2 };
      });
    });

    const totalRow = sheet.addRow([
      "TOTAL",
      totals.totalBudget,
      totals.amountReleased,
      totals.actualExpenditure,
      totals.actualPayments,
      totals.projection,
    ]);

    totalRow.font = { bold: true, color: { argb: "FF166534" } };

    sheet.columns = [
      { width: 35 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Quarterly_Report_${year}_Q${quarter}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};





//pdf export
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const exportQuarterlyReportPDF = async (req, res, next) => {
  try {
    const { year, quarter, sourceOfFunding = "ALL", organization } = req.query;

    // Validate auth
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not logged in",
      });
    }

    // Validate required params
    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    // Resolve user FIRST (important)
    const user = await User.findByPk(req.user.id);

    // Security: non-admins cannot request ALL
    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    // Resolve organization scope
    const { organization: resolvedOrg } = resolveOrganizationScope({
      user,
      organization,
    });

    // Fetch report data
    const report = await getQuarterlyReportData({
      year,
      quarter,
      sourceOfFunding,
      organization: resolvedOrg, // null = ALL
      user,
    });

    // Group & sort
    let grouped = groupEconomicData(report, sourceOfFunding);
    grouped = sortByEconomicOrder(grouped);

    if (sourceOfFunding === "ALL") {
      grouped = grouped.map((item) => ({
        ...item,
        breakdown: sortFundingSources(item.breakdown),
      }));
    }

    // Totals
    const totals = grouped.reduce(
      (acc, x) => ({
        totalBudget: acc.totalBudget + x.totalBudget,
        amountReleased: acc.amountReleased + x.amountReleased,
        actualExpenditure: acc.actualExpenditure + x.actualExpenditure,
        actualPayments: acc.actualPayments + x.actualPayments,
        projection: acc.projection + x.projection,
      }),
      {
        totalBudget: 0,
        amountReleased: 0,
        actualExpenditure: 0,
        actualPayments: 0,
        projection: 0,
      }
    );

    const logoPath = path.join(__dirname, "../assets/logo.jpeg");

    // Set headers BEFORE streaming
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Quarterly_Report_${year}_Q${quarter}.pdf"`
    );

    // Generate PDF (streaming)
    generateQuarterlyPDF({
      grouped,
      totals,
      year,
      quarter,
      sourceOfFunding,
      user,
      logoPath,
      res,
    });
  } catch (error) {
    console.error("PDF export error:", error);
    if (res.headersSent) return;
    next(error);
  }
};



