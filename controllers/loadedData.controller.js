import LoadedData from "../models/loadedData.js"
import ExcelJS from "exceljs";
import User from "../models/users.js"

export const createLoadedData = async (req, res, next) => {
  try {
    const {
      organization,
      economicClassification,
      sourceOfFunding,
      naturalAccount,
      appropriation,
      allotment,
    } = req.body;

    // Validate required fields
    if (
      !organization ||
      !economicClassification ||
      !sourceOfFunding ||
      !naturalAccount ||
      !appropriation ||
      !allotment
    ) {
      const error = new Error("All fields are required.");
      error.statusCode = 400;
      return next(error);
    }

    // Validate numbers
    if (isNaN(appropriation) || appropriation < 0) {
      const error = new Error(
        "Appropriation must be a valid non-negative number."
      );
      error.statusCode = 400;
      return next(error);
    }

    if (isNaN(allotment) || allotment < 0) {
      const error = new Error("Allotment must be a valid non-negative number.");
      error.statusCode = 400;
      return next(error);
    }

    // Ensure user exists (if linked to auth)
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error("Unauthorized: User not found.");
      error.statusCode = 401;
      return next(error);
    }

    // Create record
    const newData = await LoadedData.create({
      organization,
      economicClassification,
      sourceOfFunding,
      naturalAccount,
      appropriation,
      allotment,
      userId,
    });

    return res.status(201).json({
      message: "Data saved successfully",
      data: newData,
    });
  } catch (err) {
    next(err);
  }
};



export const uploadExcelLoadedData = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required." });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized user." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0]; // first sheet
    const rows = [];
    const errors = [];

    sheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      const [
        organization,
        economicClassification,
        sourceOfFunding,
        naturalAccount,
        appropriation,
        allotment,
      ] = row.values.slice(1); // remove first empty element

      // Validate fields
      if (
        !organization ||
        !economicClassification ||
        !sourceOfFunding ||
        !naturalAccount ||
        appropriation === undefined ||
        allotment === undefined
      ) {
        errors.push({
          row: rowNumber,
          error: "Missing one or more required fields",
        });
        return;
      }

      const appropriationNum = Number(appropriation);
      const allotmentNum = Number(allotment);

      if (isNaN(appropriationNum) || isNaN(allotmentNum)) {
        errors.push({
          row: rowNumber,
          error: "Appropriation and Allotment must be numbers",
        });
        return;
      }

      rows.push({
        organization,
        economicClassification,
        sourceOfFunding,
        naturalAccount,
        appropriation: appropriationNum,
        allotment: allotmentNum,
        userId,
      });
    });

    if (rows.length === 0) {
      return res.status(400).json({
        message: "No valid rows found",
        errors,
      });
    }

    await LoadedData.bulkCreate(rows);

    return res.status(201).json({
      message: "Excel uploaded successfully",
      inserted: rows.length,
      errors,
    });
  } catch (error) {
    next(error);
  }
};



export const downloadAppropriationTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Appropriation Template");

    // Define columns
    sheet.columns = [
      { header: "organization", key: "organization", width: 30 },
      {
        header: "economicClassification",
        key: "economicClassification",
        width: 30,
      },
      { header: "sourceOfFunding", key: "sourceOfFunding", width: 30 },
      { header: "naturalAccount", key: "naturalAccount", width: 25 },
      { header: "appropriation", key: "appropriation", width: 15 },
      { header: "allotment", key: "allotment", width: 15 },
    ];

    // Add a sample row for guidance
    sheet.addRow({
      organization: "MOF",
      economicClassification: "Goods",
      sourceOfFunding: "GoG",
      naturalAccount: "123456",
      appropriation: 500000.0,
      allotment: 200000.0,
    });

    // Style header row
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4CAF50" }, // green background
      };
    });

    // Response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=appropriation_template.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};