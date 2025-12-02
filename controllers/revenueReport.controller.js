import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/users.js";

import {
  getQuarterlyRevenueData,
  groupRevenueData,
  totalRevenueSummary,
} from "../services/report.service.js";

import { generateRevenuePDF } from "../utils/pdfGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================================================
// 1. PREVIEW REVENUE REPORT (JSON)
// =========================================================
export const getQuarterlyRevenueReport = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;

    if (!year || !quarter) {
      return res
        .status(400)
        .json({ success: false, message: "Year and quarter are required!" });
    }

    const user = await User.findByPk(req.user.id);

    const raw = await getQuarterlyRevenueData({
      year,
      quarter,
      organization,
      user,
    });

    const grouped = groupRevenueData(raw);
    const totals = totalRevenueSummary(grouped);

    return res.json({
      success: true,
      year,
      quarter,
      organization: organization || user.organization,
      records: grouped,
      totals,
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================
// 2. EXPORT REVENUE REPORT → EXCEL
// =========================================================
export const exportQuarterlyRevenueExcel = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;

    if (!year || !quarter)
      return res
        .status(400)
        .json({ success: false, message: "Year and quarter required" });

    const user = await User.findByPk(req.user.id);

    const raw = await getQuarterlyRevenueData({
      year,
      quarter,
      organization,
      user,
    });

    const grouped = groupRevenueData(raw);
    const totals = totalRevenueSummary(grouped);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Revenue Report");

    // Title
    sheet.addRow(["Summary of IGF Revenue Performance"]).font = {
      bold: true,
      size: 14,
    };

    // Header
    sheet.addRow([
      "REVENUE CATEGORY",
      "PROJECTION",
      "ACTUAL COLLECTION",
      "PAYMENT CF",
      "RETENTION",
      "PROJECTION DEC",
      "REMARKS",
    ]).font = { bold: true };

    // Rows
    grouped.forEach((item) => {
      sheet.addRow([
        item.category,
        item.projection,
        item.actual,
        item.payment,
        item.retention,
        item.projectionDec,
        item.remarks,
      ]);
    });

    // Totals row
    sheet.addRow([
      "TOTAL",
      totals.projection,
      totals.actual,
      totals.payment,
      totals.retention,
      totals.projectionDec,
      "",
    ]).font = { bold: true, color: { argb: "FF166534" } };

    // Response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Revenue_Report_${year}_Q${quarter}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

// =========================================================
// 3. EXPORT REVENUE REPORT → PDF
// =========================================================
export const exportQuarterlyRevenuePDF = async (req, res, next) => {
  try {
    const { year, quarter, organization } = req.query;

    if (!year || !quarter)
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });

    const user = await User.findByPk(req.user.id);

    const raw = await getQuarterlyRevenueData({
      year,
      quarter,
      organization,
      user,
    });

    const grouped = groupRevenueData(raw);
    const totals = totalRevenueSummary(grouped);

    const logoPath = path.join(__dirname, "../assets/logo.jpeg");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Revenue_Report_${year}_Q${quarter}.pdf"`
    );

    return generateRevenuePDF({
      grouped,
      totals,
      year,
      quarter,
      user,
      logoPath,
      res,
    });
  } catch (err) {
    if (res.headersSent) return;
    next(err);
  }
};
