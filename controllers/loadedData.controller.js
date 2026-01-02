import LoadedData from "../models/loadedData.js";
import ExcelJS from "exceljs";
import User from "../models/users.js";

//takes any value coming from Excel and turns it into a clean, trimmed string (or an empty string if it’s missing
const normalize = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value.text) return value.text.trim();
  return String(value).trim();
};




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

    // Required fields (REMOVE allotment)
    if (
      !organization ||
      !economicClassification ||
      !sourceOfFunding ||
      !naturalAccount ||
      appropriation === undefined
    ) {
      const error = new Error("Required fields are missing.");
      error.statusCode = 400;
      return next(error);
    }

    // Validate appropriation
    const appropriationValue = Number(appropriation);
    if (Number.isNaN(appropriationValue) || appropriationValue < 0) {
      const error = new Error(
        "Appropriation must be a valid non-negative number."
      );
      error.statusCode = 400;
      return next(error);
    }

    // Validate allotment ONLY if provided
    let allotmentValue = 0;
    if (allotment !== undefined && allotment !== "") {
      allotmentValue = Number(allotment);

      if (Number.isNaN(allotmentValue) || allotmentValue < 0) {
        const error = new Error(
          "Allotment must be a valid non-negative number."
        );
        error.statusCode = 400;
        return next(error);
      }
    }

    // Auth check
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
      appropriation: appropriationValue,
      allotment: allotmentValue, // DEFAULTS TO 0
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Data saved successfully",
      data: newData,
    });
  } catch (err) {
    next(err);
  }
};




export const getAllLoadedData = async (req, res, next) => {
  try {
    // Optional search query
    const { search = "" } = req.query;

    // Build search filter (optional)
    const whereClause = search
      ? {
          [Op.or]: [
            { organization: { [Op.like]: `%${search}%` } },
            { economicClassification: { [Op.like]: `%${search}%` } },
            { sourceOfFunding: { [Op.like]: `%${search}%` } },
            { naturalAccount: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    // Fetch ALL matching records (no pagination here)
    const loadedData = await LoadedData.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      totalRecords: loadedData.length,
      data: loadedData,
    });
  } catch (error) {
    next(error);
  }
};



//THIS IS FOR BULK UPLOAD
export const uploadExcelLoadedData = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required." });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized user." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    const rows = [];
    const errors = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const [
        rawOrganization,
        rawEconomicClassification,
        rawSourceOfFunding,
        rawNaturalAccount,
        rawAppropriation,
        rawAllotment,
      ] = row.values.slice(1);

      // Normalize values
      const organization = normalize(rawOrganization);
      const economicClassification = normalize(rawEconomicClassification);
      const sourceOfFunding = normalize(rawSourceOfFunding);
      const naturalAccount = normalize(rawNaturalAccount);

      // Required fields (organization REQUIRED for admin uploads)
      if (
        !organization ||
        !economicClassification ||
        !sourceOfFunding ||
        !naturalAccount ||
        rawAppropriation === undefined ||
        rawAppropriation === null ||
        String(rawAppropriation).trim() === ""
      ) {
        errors.push({
          row: rowNumber,
          error: "Missing one or more required fields",
        });
        return;
      }

      // Validate appropriation
      const appropriationNum = Number(String(rawAppropriation).trim());
      if (Number.isNaN(appropriationNum) || appropriationNum < 0) {
        errors.push({
          row: rowNumber,
          error: "Appropriation must be a valid non-negative number",
        });
        return;
      }

      // allotment OPTIONAL
      let allotmentNum = 0;
      if (
        rawAllotment !== undefined &&
        rawAllotment !== null &&
        String(rawAllotment).trim() !== ""
      ) {
        allotmentNum = Number(String(rawAllotment).trim());
        if (Number.isNaN(allotmentNum) || allotmentNum < 0) {
          errors.push({
            row: rowNumber,
            error: "Allotment must be a valid non-negative number",
          });
          return;
        }
      }

      rows.push({
        organization, // from Excel
        economicClassification,
        sourceOfFunding,
        naturalAccount,
        appropriation: appropriationNum,
        allotment: allotmentNum,
        userId: user.id, // who uploaded
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
      success: true,
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
      economicClassification: "Use and Goods and Services",
      sourceOfFunding: "GOG",
      naturalAccount: "123456-Transportation",
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


export const deleteLoadedData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await LoadedData.findByPk(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Loaded data not found",
      });
    }

    await record.destroy();

    res.status(200).json({
      success: true,
      message: "Loaded data deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


export const updateLoadedData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      organization,
      economicClassification,
      sourceOfFunding,
      naturalAccount,
      appropriation,
      allotment,
    } = req.body;

    const record = await LoadedData.findByPk(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Loaded data not found",
      });
    }

    // Business rule: allotment must not exceed appropriation
    if (
      appropriation !== undefined &&
      allotment !== undefined &&
      Number(allotment) > Number(appropriation)
    ) {
      return res.status(400).json({
        success: false,
        message: "Allotment cannot be greater than appropriation",
      });
    }

    await record.update({
      organization,
      economicClassification,
      sourceOfFunding,
      naturalAccount,
      appropriation,
      allotment,
    });

    res.status(200).json({
      success: true,
      message: "Loaded data updated successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};
