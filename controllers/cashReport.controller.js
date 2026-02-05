import User from "../models/users.js";
import { resolveOrganizationScope } from "../utils/resolveOrganizationScope.js";
import {
  getCashPositionData,
  groupCashPositionData,
  totalCashPositionSummary,
} from "../services/cashReport.service.js";
import { generateCashPositionPDF } from "../utils/cashPositionReport.pdf.js";

export const getCashPositionReport = async (req, res, next) => {
  try {
    const { as_at_date, organization } = req.query;

    if (!as_at_date) {
      return res.status(400).json({
        success: false,
        message: "as_at_date is required",
      });
    }

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
      as_at_date,
      organization: resolvedOrg, // null = ALL
    });

    const grouped = groupCashPositionData(raw);
    const totals = totalCashPositionSummary(grouped);

    res.json({
      success: true,
      as_at_date,
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
    const { as_at_date, organization } = req.query;

    if (!as_at_date) {
      return res.status(400).json({
        success: false,
        message: "as_at_date is required",
      });
    }

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
      as_at_date,
      organization: resolvedOrg,
    });

    const grouped = groupCashPositionData(raw);
    const totals = totalCashPositionSummary(grouped);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Cash Position");

    const MONEY = "#,##0.00";

    sheet.columns = [
      { header: "ACCOUNT NAME", key: "account_name", width: 30 },
      { header: "GHS", key: "GHS", width: 18, style: { numFmt: MONEY } },
      { header: "EUR", key: "EUR", width: 18, style: { numFmt: MONEY } },
      { header: "GBP", key: "GBP", width: 18, style: { numFmt: MONEY } },
      { header: "USD", key: "USD", width: 18, style: { numFmt: MONEY } },
    ];

    sheet.addRow([`Cash Position as at ${as_at_date}`]).font = {
      bold: true,
      size: 14,
    };

    sheet.addRow(sheet.columns.map((c) => c.header)).font = { bold: true };

    grouped.forEach((row) => sheet.addRow(row));

    sheet.addRow({
      account_name: "TOTAL",
      ...totals,
    }).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Cash_Position_${as_at_date}.xlsx"`,
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
    const { as_at_date, organization } = req.query;

    if (!as_at_date) {
      return res
        .status(400)
        .json({ success: false, message: "as_at_date is required" });
    }

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
      as_at_date,
      organization: resolvedOrg,
    });

    const rows = groupCashPositionData(raw);
    const totals = totalCashPositionSummary(rows);

    const logoPath = path.join(__dirname, "../assets/logo.jpeg");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Cash_Position_${as_at_date}.pdf"`,
    );

    generateCashPositionPDF({
      rows,
      totals,
      as_at_date,
      organization: isAll ? "ALL" : resolvedOrg,
      logoPath,
      res,
    });
  } catch (err) {
    next(err);
  }
};


