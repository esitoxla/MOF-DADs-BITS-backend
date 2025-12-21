import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/users.js";
import { generateRevenuePDF } from "../utils/revenueReport.pdf.js";

import {
  getQuarterlyRevenueData,
  groupRevenueData,
  totalRevenueSummary,
} from "../services/report.service.js";
import { formatGHS } from "../utils/numberFormat.js";
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
    //Read query params
    const { year, quarter, organization } = req.query;

    //Validate inputs
    if (!year || !quarter)
      return res
        .status(400)
        .json({ success: false, message: "Year and quarter required" });

    //Get logged-in user
    const user = await User.findByPk(req.user.id);

    //Fetch raw revenue data from the report service
    const raw = await getQuarterlyRevenueData({
      year,
      quarter,
      organization,
      user,
    });

    //Shape data into report rows
    const grouped = groupRevenueData(raw);

    //Compute totals row
    const totals = totalRevenueSummary(grouped);

    //Build Excel file
    const workbook = new ExcelJS.Workbook();

    const GHS_FORMAT = "#,##0.00";
    const sheet = workbook.addWorksheet("Revenue Report");

    // Set column widths & formats
    sheet.columns = [
      { header: "REVENUE CATEGORY", key: "category", width: 30 },
      {
        header: "PROJECTION",
        key: "projection",
        width: 18,
        style: { numFmt: GHS_+FORMAT },
      },
      {
        header: "ACTUAL COLLECTION",
        key: "actual",
        width: 18,
        style: { numFmt: GHS_FORMAT },
      },
      {
        header: "PAYMENT CF",
        key: "payment",
        width: 18,
        style: { numFmt: GHS_FORMAT },
      },
      {
        header: "RETENTION",
        key: "retention",
        width: 18,
        style: { numFmt: GHS_FORMAT },
      },
      {
        header: "PROJECTION DEC",
        key: "projectionDec",
        width: 18,
        style: { numFmt: GHS_FORMAT },
      },
      { header: "REMARKS", key: "remarks", width: 30 },
    ];

    //Write title and headers
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

    //Fill rows from grouped data
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

    // Add totals row
    sheet.addRow({
      category: "TOTAL",
      projection: totals.projection,
      actual: totals.actual,
      payment: totals.payment,
      retention: totals.retention,
      projectionDec: totals.projectionDec,
      remarks: "",
    }).font = { bold: true, color: { argb: "FF166534" } };

    //Send file to browser
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
