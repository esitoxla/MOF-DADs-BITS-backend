import ExcelJS from "exceljs";
import BudgetExpenditure from "../models/expenditure.model.js";
import User from "../models/users.js";
import { Op, fn, col } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import { getQuarterlyReportData, groupEconomicData } from "../services/report.service.js";
import { generateQuarterlyPDF } from "../utils/pdfGenerator.js";


export const getQuarterlyReport = async (req, res, next) => {
  try {
    const { year, quarter, organization, sourceOfFunding = "ALL" } = req.query;
    const user = await User.findByPk(req.user.id);

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

    const include = [
      {
        model: User,
        attributes: [],
        where:
          user.role === "admin"
            ? organization
              ? { organization }
              : {}
            : { organization: user.organization },
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
      organization: organization || user.organization,
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

    if (!year || !quarter) {
      return res
        .status(400)
        .json({ message: "Year and quarter are required." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "User not logged in!" });
    }

    const user = await User.findByPk(req.user.id);

    const quarters = {
      1: [`${year}-01-01`, `${year}-03-31`],
      2: [`${year}-04-01`, `${year}-06-30`],
      3: [`${year}-07-01`, `${year}-09-30`],
      4: [`${year}-10-01`, `${year}-12-31`],
    };

    const [start, end] = quarters[quarter];

    let where = {
      date: { [Op.between]: [start, end] },
    };

    let groupBy = ["economicClassification"];

    if (sourceOfFunding !== "ALL") {
      where.sourceOfFunding = sourceOfFunding;
    } else {
      groupBy.push("sourceOfFunding");
    }

    const include = [
      {
        model: User,
        attributes: [],
        where:
          user.role === "admin"
            ? organization
              ? { organization }
              : {}
            : { organization: user.organization },
      },
    ];

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
        ...(sourceOfFunding === "ALL" ? [["sourceOfFunding", "ASC"]] : []),
      ],
    });

    const grouped = groupEconomicData(report, sourceOfFunding);

    // Compute totals
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

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Quarterly Report", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.addRow([
      "Summary of Budget Performance by Economic Classification",
    ]).font = { bold: true, size: 14 };
   

    const header = [
      "EXPENDITURE ITEM",
      "2025 APPROVED BUDGET / APPROPRIATION",
      "AMOUNT RELEASED AS AT END AUG 2025",
      "ACTUAL EXPENDITURE AS AT END AUG 2025",
      "ACTUAL PAYMENTS AS AT END AUG 2025",
      "PROJECTIONS AS AT 31 DEC 2025",
    ];

    sheet.addRow(header).font = { bold: true };

    // Write rows
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

    const t = sheet.addRow([
      "TOTAL",
      totals.totalBudget,
      totals.amountReleased,
      totals.actualExpenditure,
      totals.actualPayments,
      totals.projection,
    ]);

    t.font = { bold: true, color: { argb: "FF166534" } };

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

    if (!year || !quarter) {
      return res
        .status(400)
        .json({ success: false, message: "Year and quarter are required" });
    }

    const user = await User.findByPk(req.user.id);

    const report = await getQuarterlyReportData({
      year,
      quarter,
      sourceOfFunding,
      organization,
      user,
    });

    const grouped = groupEconomicData(report, sourceOfFunding);

    // You probably already have totals somewhere; if not, compute here:
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

    // Set headers **here** (once), BEFORE streaming
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Quarterly_Report_${year}_Q${quarter}.pdf"`
    );

    // Now generate the PDF. Do NOT set headers inside this function.
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
    // If headers were already sent (stream started), don't try to send JSON
    if (res.headersSent) return;
    next(error);
  }
};


