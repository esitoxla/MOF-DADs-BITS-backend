import User from "../models/users.js";
import { buildNaturalAccountReport } from "../services/naturalAccountReport.service.js";
import path from "path";
import { fileURLToPath } from "url";
import { resolveOrganizationScope } from "../utils/resolveOrganizationScope.js";
import { generateNaturalAccountPDF } from "../utils/naturalAccountReport.pdf.js";
import { getQuarterPeriod } from "../utils/quarterPeriod.js";
import ExcelJS from "exceljs";


export const getNaturalAccountReport = async (req, res, next) => {
  try {
    const { year, quarter, sourceOfFunding = "ALL", organization } = req.query;

    const user = await User.findByPk(req.user.id);

    const report = await buildNaturalAccountReport({
      year,
      quarter,
      sourceOfFunding,
      organization,
      user,
    });

    // TOTALS
    const totals = {
      GOG: { appro: 0, actual: 0 },
      IGF: { appro: 0, actual: 0 },
      DPF: { appro: 0, actual: 0 },
    };

    report.forEach((row) => {
      totals.GOG.appro += row.GOG.appro;
      totals.GOG.actual += row.GOG.actual;

      totals.IGF.appro += row.IGF.appro;
      totals.IGF.actual += row.IGF.actual;

      totals.DPF.appro += row.DPF.appro;
      totals.DPF.actual += row.DPF.actual;
    });

    res.json({
      success: true,
      report,
      totals,
    });
  } catch (err) {
    next(err);
  }
};

//for pdf export
// pdf export (Natural Account)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const exportNaturalAccountPDF = async (req, res, next) => {
  try {
    const { year, quarter, sourceOfFunding = "ALL", organization } = req.query;

    // =========================
    // VALIDATION
    // =========================
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not logged in",
      });
    }

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        message: "Year and quarter are required",
      });
    }

    const user = await User.findByPk(req.user.id);

    // =========================
    // SECURITY
    // =========================
    if (user.role !== "admin" && organization === "ALL") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access all organizations",
      });
    }

    // =========================
    // RESOLVE ORG
    // =========================
    const { organization: resolvedOrg } = resolveOrganizationScope({
      user,
      organization,
    });

    // =========================
    // FETCH REPORT (SERVICE LAYER)
    // =========================
    const report = await buildNaturalAccountReport({
      year,
      quarter,
      sourceOfFunding,
      organization: resolvedOrg,
      user,
    });

    // =========================
    // TOTALS
    // =========================
    const totals = {
      GOG: { appro: 0, actual: 0 },
      IGF: { appro: 0, actual: 0 },
      DPF: { appro: 0, actual: 0 },
    };

    report.forEach((row) => {
      totals.GOG.appro += row.GOG.appro;
      totals.GOG.actual += row.GOG.actual;

      totals.IGF.appro += row.IGF.appro;
      totals.IGF.actual += row.IGF.actual;

      totals.DPF.appro += row.DPF.appro;
      totals.DPF.actual += row.DPF.actual;
    });

    const logoPath = path.join(__dirname, "../assets/logo.jpeg");

    // =========================
    // HEADERS
    // =========================
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Natural_Account_Report_${year}_Q${quarter}.pdf"`,
    );

    // =========================
    // GENERATE PDF
    // =========================
    generateNaturalAccountPDF({
      report,
      totals,
      year,
      quarter,
      sourceOfFunding,
      user,
      logoPath,
      res,
    });
  } catch (error) {
    console.error("Natural Account PDF error:", error);
    if (res.headersSent) return;
    next(error);
  }
};

export const exportNaturalAccountExcel = async (req, res, next) => {
  try {
    const { year, quarter, sourceOfFunding = "ALL", organization } = req.query;

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
    // FETCH REPORT
    // =========================
    const report = await buildNaturalAccountReport({
      year,
      quarter,
      sourceOfFunding,
      organization: resolvedOrg,
      user,
    });

    // =========================
    // TOTALS
    // =========================
    const totals = {
      GOG: { appro: 0, actual: 0 },
      IGF: { appro: 0, actual: 0 },
      DP: { appro: 0, actual: 0 },
    };

    report.forEach((row) => {
     totals.GOG.appro += row.GOG?.appro || 0;
     totals.GOG.actual += row.GOG?.actual || 0;

     totals.IGF.appro += row.IGF?.appro || 0;
     totals.IGF.actual += row.IGF?.actual || 0;

     totals.DP.appro += row.DP?.appro || 0;
     totals.DP.actual += row.DP?.actual || 0;
    });

    // =========================
    // EXCEL GENERATION
    // =========================
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Natural Account Report", {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    const period = getQuarterPeriod(year, quarter);

    // =========================
    // HEADER TITLE
    // =========================
    sheet.addRow([
      "Summary of Budget Performance by Natural Account and Funding",
    ]).font = { bold: true, size: 14 };

    sheet.addRow([
      `DADs: ${user.organization}`,
      "",
      "",
      `Reporting Period: Q${quarter} (${period.endMonthName} ${year})`,
    ]);

    sheet.addRow([
      `Source of Funding: ${sourceOfFunding}`,
      "",
      "",
      "Currency: Ghana Cedis (GHS)",
    ]);

    // =========================
    // COLUMN VISIBILITY
    // =========================
    const showGOG = sourceOfFunding === "ALL" || sourceOfFunding === "GOG";
    const showIGF = sourceOfFunding === "ALL" || sourceOfFunding === "IGF";
    const showDP = sourceOfFunding === "ALL" || sourceOfFunding === "DP";

    // =========================
    // TABLE HEADER (2 ROWS)
    // =========================
    const headerRow1 = ["Natural Account"];
    const headerRow2 = [""];

    if (showGOG) {
      headerRow1.push("GOG", "");
      headerRow2.push("Appro", "actual");
    }

    if (showIGF) {
      headerRow1.push("IGF", "");
      headerRow2.push("Appro", "actual");
    }

    if (showDP) {
      headerRow1.push("DP", "");
      headerRow2.push("Appro", "actual");
    }

    const row1 = sheet.addRow(headerRow1);
    const row2 = sheet.addRow(headerRow2);

    row1.font = { bold: true };
    row2.font = { bold: true };

    // Merge group headers
    let colIndex = 2;

    function mergeHeader(label) {
      sheet.mergeCells(4, colIndex, 4, colIndex + 1);
      colIndex += 2;
    }

    if (showGOG) mergeHeader("GOG");
    if (showIGF) mergeHeader("IGF");
    if (showDP) mergeHeader("DP");

    // =========================
    // DATA ROWS
    // =========================
    report.forEach((row) => {
      const dataRow = [row.title];

      if (showGOG) {
        dataRow.push(row.GOG?.appro || 0, row.GOG?.actual || 0);
      }

      if (showIGF) {
        dataRow.push(row.IGF?.appro || 0, row.IGF?.actual || 0);
      }

      if (showDP) {
        dataRow.push(row.DP?.appro || 0, row.DP?.actual || 0);
      }

      sheet.addRow(dataRow);
    });

    // =========================
    // TOTAL ROW
    // =========================
    const totalRow = ["TOTAL"];

    if (showGOG) {
      totalRow.push(totals.GOG.appro, totals.GOG.actual);
    }

    if (showIGF) {
      totalRow.push(totals.IGF.appro, totals.IGF.actual);
    }

    if (showDP) {
      totalRow.push(totals.DP.appro, totals.DP.actual);
    }

    const tRow = sheet.addRow(totalRow);
    tRow.font = { bold: true };

    // =========================
    // COLUMN WIDTHS
    // =========================
    sheet.columns = [{ width: 30 }, ...Array(6).fill({ width: 15 })];

    // =========================
    // STREAM RESPONSE
    // =========================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Natural_Account_Report_${year}_Q${quarter}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};