import User from "../models/users.js";
import Cash from "../models/cash.model.js";
import ExcelJS from "exceljs";
import { Op } from "sequelize";
import { resolveOrganizationScope } from "../utils/resolveOrganizationScope.js";
import {
  getCashPositionData,
  groupCashPositionData,
  totalCashPositionSummary,
} from "../services/cashReport.service.js";
import { generateCashPositionPDF } from "../utils/cashPositionReport.pdf.js";
import path from "path";
import { fileURLToPath } from "url";
import { getDetailedCashData } from "../services/detailedCashReport.service.js";
import { getQuarterDateRange } from "../utils/cashDateQuarter.js";

export const getCashPositionReport = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;

    const getQuarterDateRange = (year, quarter) => {
      const ranges = {
        1: { start: `${year}-01-01`, end: `${year}-03-31` },
        2: { start: `${year}-04-01`, end: `${year}-06-30` },
        3: { start: `${year}-07-01`, end: `${year}-09-30` },
        4: { start: `${year}-10-01`, end: `${year}-12-31` },
      };

      return ranges[quarter];
    };

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    const { start, end } = getQuarterDateRange(year, quarter);

    const user = await User.findByPk(req.user.id);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    const { organization: resolvedOrg, isAll } = resolveOrganizationScope({
      user,
      organization,
    });

    const raw = await getCashPositionData({
      start_date: start,
      end_date: end,
      organization: resolvedOrg,
    });

    const grouped = groupCashPositionData(raw);
    const totals = totalCashPositionSummary(grouped);

    res.json({
      success: true,
      year,
      quarter,
      organization: isAll ? "ALL" : resolvedOrg,
      records: grouped,
      totals,
    });
  } catch (err) {
    next(err);
  }
};

export const exportCashPositionExcel = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    const { start, end } = getQuarterDateRange(year, quarter);

    const user = await User.findByPk(req.user.id);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    const { organization: resolvedOrg, isAll } = resolveOrganizationScope({
      user,
      organization,
    });

    // ===== Fetch Data Between Dates =====
    const raw = await getCashPositionData({
      start_date: start,
      end_date: end,
      organization: resolvedOrg,
    });

    const grouped = groupCashPositionData(raw);
    const totals = totalCashPositionSummary(grouped);

    // ===== Excel Setup =====
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Cash Position");

    const GHS_FORMAT = "#,##0.00";

    // Define columns WITHOUT headers
    sheet.columns = [
      { key: "account_name", width: 30 },
      { key: "GHS", width: 18, style: { numFmt: GHS_FORMAT } },
      { key: "EUR", width: 18, style: { numFmt: GHS_FORMAT } },
      { key: "GBP", width: 18, style: { numFmt: GHS_FORMAT } },
      { key: "USD", width: 18, style: { numFmt: GHS_FORMAT } },
    ];

    // ===== TITLE =====
    const titleRow = sheet.addRow([
      `MDAs Cash Position as at end Q${quarter} ${year}`,
    ]);
    titleRow.font = { bold: true, size: 14 };

    // Merge title across columns
    sheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`);


    // ===== HEADER ROW =====
    const headerRow = sheet.addRow([
      "ACCOUNT NAME",
      "GHS",
      "EUR",
      "GBP",
      "USD",
    ]);

    headerRow.font = { bold: true };

    // ===== DATA ROWS =====
    grouped.forEach((row) => {
      sheet.addRow(row);
    });

    // ===== TOTAL ROW =====
    const totalRow = sheet.addRow({
      account_name: "TOTAL CASH POSITION",
      ...totals,
    });

    totalRow.font = { bold: true, color: { argb: "FF166534" } };

    // ===== Response Headers =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Cash_Position_Q${quarter}_${year}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const exportCashPositionPDF = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    const { start, end } = getQuarterDateRange(year, quarter);

    const user = await User.findByPk(req.user.id);

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    const { organization: resolvedOrg, isAll } = resolveOrganizationScope({
      user,
      organization,
    });

    const raw = await getCashPositionData({
      start_date: start,
      end_date: end,
      organization: resolvedOrg,
    });

    const rows = groupCashPositionData(raw);
    const totals = totalCashPositionSummary(rows);

    const logoPath = path.join(__dirname, "../assets/logo.jpeg");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Cash_Position_Q${quarter}_${year}.pdf"`,
    );

    generateCashPositionPDF({
      rows,
      totals,
      year,
      quarter,
      logoPath,
      organization: isAll ? "ALL" : resolvedOrg,
      res,
    });
  } catch (err) {
    if (res.headersSent) {
      console.error("Error after PDF stream started:", err);
      return;
    }
    next(err);
  }
};

export const getDetailedCashReport = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;
    const user = req.user;

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    const { organization: resolvedOrg, isAll } = resolveOrganizationScope({
      user,
      organization,
    });

    const records = await getDetailedCashData({
      year,
      quarter,
      organization: resolvedOrg,
    });

    res.json({
      success: true,
      year,
      quarter,
      organization: isAll ? "ALL" : resolvedOrg,
      records,
    });
  } catch (err) {
    next(err);
  }
};
