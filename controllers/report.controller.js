import ExcelJS from "exceljs";
import User from "../models/users.js";
import path from "path";
import { fileURLToPath } from "url";
import { getQuarterlyReportData, groupEconomicData, sortByEconomicOrder, sortFundingSources } from "../services/report.service.js";
import { generateQuarterlyPDF } from "../utils/pdfGenerator.js";
import { getQuarterPeriod } from "../utils/quarterPeriod.js";
import { resolveOrganizationScope } from "../utils/resolveOrganizationScope.js";
import { buildEconomicReport } from "../services/economicReport.service.js";
import { getDetailedECReport } from "../services/detailedReport.service.js";


export const getQuarterlyReport = async (req, res, next) => {
  try {
    const { year, quarter, sourceOfFunding = "ALL", organization } = req.query;

    if (!req.user) {
      return res.status(401).json({ message: "User not logged in" });
    }

    if (!year || !quarter) {
      return res.status(400).json({
        message: "Year and quarter are required",
      });
    }

    const user = await User.findByPk(req.user.id);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        message: "You are not allowed to access all organizations",
      });
    }

    const { organization: resolvedOrg, isAll } = resolveOrganizationScope({
      user,
      organization,
    });

    // SINGLE SOURCE OF TRUTH
    const report = await buildEconomicReport({
      year,
      quarter,
      sourceOfFunding,
      organization: resolvedOrg,
      user,
    });

    // Group for UI
   const grouped = sortByEconomicOrder(report);

   if (sourceOfFunding === "ALL") {
     grouped.forEach((g) => {
       g.breakdown = sortFundingSources(g.breakdown);
     });
   }


    const totals = grouped.reduce(
      (acc, x) => ({
        totalAppropriation: acc.totalAppropriation + x.totalBudget,
        totalReleases: acc.totalReleases + x.amountReleased,
        totalExpenditure: acc.totalExpenditure + x.actualExpenditure,
        totalPayment: acc.totalPayment + x.actualPayments,
      }),
      {
        totalAppropriation: 0,
        totalReleases: 0,
        totalExpenditure: 0,
        totalPayment: 0,
      }
    );

    res.json({
      success: true,
      organization: isAll ? "ALL" : resolvedOrg,
      year,
      quarter,
      sourceOfFunding,
      report: grouped,
      totals,
    });
  } catch (err) {
    next(err);
  }
};




export const exportQuarterlyReportExcel = async (req, res, next) => {
  try {
    const { year, quarter, sourceOfFunding = "ALL", organization } = req.query;

    // =========================
    // BASIC VALIDATION
    // =========================
    if (!req.user) {
      return res.status(401).json({ message: "User not logged in" });
    }

    if (!year || !quarter) {
      return res.status(400).json({ message: "Year and quarter are required" });
    }

    const user = await User.findByPk(req.user.id);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        message: "You are not allowed to access all organizations",
      });
    }

    // =========================
    // RESOLVE ORGANIZATION
    // =========================
    const { organization: resolvedOrg } = resolveOrganizationScope({
      user,
      organization,
    });

    // =========================
    //  SINGLE SOURCE OF TRUTH
    // =========================
    let grouped = await buildEconomicReport({
      year,
      quarter,
      sourceOfFunding,
      organization: resolvedOrg,
      user,
    });

    // Sort economic classification order
    grouped = sortByEconomicOrder(grouped);

    // Sort funding sources when ALL
    if (sourceOfFunding === "ALL") {
      grouped.forEach((g) => {
        g.breakdown = sortFundingSources(g.breakdown);
      });
    }

    // =========================
    // TOTALS (MATCH UI & PDF)
    // =========================
    const totals = grouped.reduce(
      (acc, x) => ({
        totalAppropriation: acc.totalAppropriation + x.totalBudget,
        totalReleases: acc.totalReleases + x.amountReleased,
        totalExpenditure: acc.totalExpenditure + x.actualExpenditure,
        totalPayment: acc.totalPayment + x.actualPayments,
      }),
      {
        totalAppropriation: 0,
        totalReleases: 0,
        totalExpenditure: 0,
        totalPayment: 0,
      }
    );

    // =========================
    // EXCEL GENERATION
    // =========================
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Quarterly Report", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const period = getQuarterPeriod(year, quarter);

    sheet.addRow([
      "Summary of Budget Performance by Economic Classification and Funding",
    ]).font = { bold: true, size: 14 };

    sheet.addRow([
      "EXPENDITURE ITEM",
      `${period.year} APPROVED BUDGET / APPROPRIATION`,
      `AMOUNT RELEASED AS AT END ${period.endMonthName} ${period.year}`,
      `ACTUAL EXPENDITURE AS AT END ${period.endMonthName} ${period.year}`,
      `ACTUAL PAYMENTS AS AT END ${period.endMonthName} ${period.year}`,
      `PROJECTIONS AS AT 31 DEC ${period.year}`,
    ]).font = { bold: true };

    // =========================
    // DATA ROWS
    // =========================
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

    // =========================
    // TOTAL ROW
    // =========================
    const totalRow = sheet.addRow([
      "TOTAL",
      totals.totalAppropriation,
      totals.totalReleases,
      totals.totalExpenditure,
      totals.totalPayment,
      0,
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

    // =========================
    // STREAM RESPONSE
    // =========================
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
//needed for logo path
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

    const report = await buildEconomicReport({
      year,
      quarter,
      sourceOfFunding,
      organization: resolvedOrg,
      user,
    });


    // Group & sort
    let grouped = sortByEconomicOrder(report);

    if (sourceOfFunding === "ALL") {
      grouped.forEach((g) => {
        g.breakdown = sortFundingSources(g.breakdown);
      });
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



export const getDetailedEC = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;
   
    if (!req.user) {
      return res.status(401).json({ message: "User not logged in" });
    }

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    const user = await User.findByPk(req.user.id);

    //  Enforce admin rule
    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    //  Resolve organization scope
    const resolvedOrg =
      organization === "ALL" ? null : organization || user.organization;

    const records = await getDetailedECReport({
      year,
      quarter,
      organization: resolvedOrg, // null = ALL
    });

    res.json({
      success: true,
      year,
      quarter,
      organization: resolvedOrg ?? "ALL",
      records,
    });
  } catch (err) {
    next(err);
  }
};

