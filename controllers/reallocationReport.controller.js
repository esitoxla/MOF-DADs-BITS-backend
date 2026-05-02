import {
  getReallocationSummaryData,
  groupReallocationSummary,
  totalReallocationSummary,
} from "../services/reallocationReport.service.js";
import { getDetailedReallocationData } from "../services/detailedReallocation.service.js";
import ExcelJS from "exceljs";
import User from "../models/users.js";
import path from "path";
import { resolveOrganizationScope } from "../utils/resolveOrganizationScope.js";
import { generateReallocationSummaryPDF } from "../utils/ReallocationReport.pdf.js";

// =========================
// GET SUMMARY REPORT
// =========================
export const getQuarterlyReallocationReport = async (req, res, next) => {
  try {
    let { year, quarter, organization, sourceOfFunding } = req.query;
    const user = req.user;

    // =========================
    // VALIDATION
    // =========================
    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    // FIX: ensure quarter is number
    quarter = Number(quarter);

    // =========================
    // ACCESS CONTROL
    // =========================
    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    // =========================
    // RESOLVE ORGANIZATION (STANDARDIZED)
    // =========================
    const { organization: resolvedOrg } = resolveOrganizationScope({
      user,
      organization,
    });

    // =========================
    // DATE RANGE
    // =========================
    const quarters = {
      1: { start: `${year}-01-01`, end: `${year}-03-31` },
      2: { start: `${year}-04-01`, end: `${year}-06-30` },
      3: { start: `${year}-07-01`, end: `${year}-09-30` },
      4: { start: `${year}-10-01`, end: `${year}-12-31` },
    };

    const { start, end } = quarters[quarter];

    // =========================
    // FETCH DATA
    // =========================
    const raw = await getReallocationSummaryData({
      start_date: start,
      end_date: end,
      organization: resolvedOrg,
      sourceOfFunding,
    });

    // 🧪 DEBUG (remove later)
    console.log("RAW REALLOCATION:", raw);

    // =========================
    // FORMAT
    // =========================
    const grouped = groupReallocationSummary(raw);
    const totals = totalReallocationSummary(grouped);

    // =========================
    // RESPONSE
    // =========================
    res.json({
      success: true,
      year,
      quarter,
      organization: resolvedOrg || "ALL",
      data: grouped,
      totals,
    });
  } catch (err) {
    next(err);
  }
};

// =========================
// SUMMARY EXCEL REPORT
// =========================
export const exportReallocationSummaryExcel = async (req, res, next) => {
  try {
    let { year, quarter, organization } = req.query;

    // =========================
    // VALIDATION
    // =========================
    if (!req.user) {
      return res.status(401).json({ message: "User not logged in" });
    }

    if (!year || !quarter) {
      return res.status(400).json({
        message: "Year and quarter are required",
      });
    }

    const user = req.user;

    //
    quarter = Number(quarter);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        message: "You are not allowed to access all organizations",
      });
    }

    // =========================
    // RESOLVE ORGANIZATION
    // =========================
    const resolvedOrg =
      user.role === "admin"
        ? organization === "ALL"
          ? null
          : organization
        : user.organization;

    // =========================
    // DATE RANGE
    // =========================
    const quarters = {
      1: { start: `${year}-01-01`, end: `${year}-03-31` },
      2: { start: `${year}-04-01`, end: `${year}-06-30` },
      3: { start: `${year}-07-01`, end: `${year}-09-30` },
      4: { start: `${year}-10-01`, end: `${year}-12-31` },
    };

    const { start, end } = quarters[quarter];

    // =========================
    // FETCH DATA (GOG ONLY)
    // =========================
    const raw = await getReallocationSummaryData({
      start_date: start,
      end_date: end,
      organization: resolvedOrg,
      sourceOfFunding: "GOG", // enforce GOG only
    });

    const grouped = groupReallocationSummary(raw);
    const totals = totalReallocationSummary(grouped);

    // =========================
    // EXCEL SETUP
    // =========================
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reallocation Summary", {
      views: [{ state: "frozen", ySplit: 2 }],
    });

    // =========================
    // TITLE
    // =========================
    const titleRow = sheet.addRow([
      `Reallocation Summary Report - Q${quarter} ${year}`,
    ]);

    titleRow.font = { bold: true, size: 14 };
    sheet.mergeCells("A1:E1");

    // =========================
    // HEADER ROW
    // =========================
    const header = sheet.addRow([
      "ECONOMIC CLASSIFICATION",
      "AMOUNT REALLOCATED",
      "AMOUNT RELEASED",
      "ACTUAL EXPENDITURE",
      "ACTUAL PAYMENT",
    ]);

    header.font = { bold: true };

    // =========================
    // DATA ROWS
    // =========================
   
    const structure = [
      "Compensation of Employees",
      "Use of Goods and Services",
      "Capital Expenditure",
    ];

    structure.forEach((item) => {
      const row = grouped.find((r) => r.title === item) || {};

      // MAIN ROW (label row)
      const mainRow = sheet.addRow([item, "-", "-", "-", "-"]);
      mainRow.font = { bold: true };

      // GOG ROW (values)
      sheet.addRow([
        "   GOG",
        row.GOG?.reallocated || 0,
        row.GOG?.released || 0,
        row.GOG?.expenditure || 0,
        row.GOG?.payment || 0,
      ]);
    });

    // =========================
    // TOTAL ROW
    // =========================
    const totalRow = sheet.addRow([
      "TOTAL",
      totals.reallocated || 0,
      totals.released || 0,
      totals.expenditure || 0,
      totals.payment || 0,
    ]);

    totalRow.font = {
      bold: true,
      color: { argb: "FF166534" },
    };

    // =========================
    // COLUMN WIDTHS
    // =========================
    sheet.columns = [
      { width: 35 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];

    // =========================
    // RESPONSE HEADERS
    // =========================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Reallocation_Summary_${year}_Q${quarter}.xlsx"`,
    );

    // =========================
    // STREAM FILE
    // =========================
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// =========================
// SUMMARY PDF REPORT
// =========================
export const exportReallocationSummaryPDF = async (req, res, next) => {
  try {
    let { year, quarter, organization } = req.query;

    // =========================
    // VALIDATION
    // =========================
    if (!req.user) {
      return res.status(401).json({ message: "User not logged in" });
    }

    if (!year || !quarter) {
      return res.status(400).json({
        message: "Year and quarter are required",
      });
    }

    //  FIX: convert quarter
    quarter = Number(quarter);

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
    // DATE RANGE
    // =========================
    const quarters = {
      1: { start: `${year}-01-01`, end: `${year}-03-31` },
      2: { start: `${year}-04-01`, end: `${year}-06-30` },
      3: { start: `${year}-07-01`, end: `${year}-09-30` },
      4: { start: `${year}-10-01`, end: `${year}-12-31` },
    };

    const { start, end } = quarters[quarter];

    // =========================
    // FETCH DATA (GOG ONLY)
    // =========================
    const raw = await getReallocationSummaryData({
      start_date: start,
      end_date: end,
      organization: resolvedOrg,
      sourceOfFunding: "GOG", // 🔥 enforce
    });

    const grouped = groupReallocationSummary(raw);
    const totals = totalReallocationSummary(grouped);

    // =========================
    // RESPONSE HEADERS
    // =========================
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Reallocation_Summary_${year}_Q${quarter}.pdf`,
    );

    // =========================
    // PDF GENERATION
    // =========================
    const logoPath = path.join(process.cwd(), "assets/logo.jpeg");

    //  IMPORTANT: return this
    return generateReallocationSummaryPDF({
      grouped,
      totals,
      year,
      quarter,
      sourceOfFunding: "GOG",
      user,
      logoPath,
      res,
    });
  } catch (error) {
    next(error);
  }
};

// =========================
// GET DETAILED REPORT
// =========================
export const getDetailedReallocationReport = async (req, res, next) => {
  try {
    let { year, quarter, organization, sourceOfFunding } = req.query;
    const user = req.user;

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    quarter = Number(quarter); // FIX

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    const { organization: resolvedOrg } = resolveOrganizationScope({
      user,
      organization,
    });

    const records = await getDetailedReallocationData({
      year,
      quarter,
      organization: resolvedOrg,
      sourceOfFunding,
    });

    res.json({
      success: true,
      year,
      quarter,
      organization: resolvedOrg || "ALL",
      count: records.length,
      records,
    });
  } catch (err) {
    next(err);
  }
};