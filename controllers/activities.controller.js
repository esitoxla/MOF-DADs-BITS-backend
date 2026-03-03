import Activity from "../models/activity.model.js";
import ExcelJS from "exceljs";

//adding a single record
export const createActivities = async (req, res, next) => {
  try {
    const { organization, name } = req.body;

    if (!organization || !name) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const activityArray = name
      .split(/[\n,]+/) // split by newline OR comma
      .map((a) => a.trim())
      .filter(Boolean);

    const formatted = activityArray.map((name) => ({
      name: name.trim().toLowerCase(), // normalize
      organization,
      userId: req.user.id
    }));

    await Activity.bulkCreate(formatted);

    res.status(201).json({
      message: "Activity(ies) created successfully",
    });
  } catch (error) {
    next(error);
  }
};

//bulk upload
export const bulkUploadActivities = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Excel file is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized user.",
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({
        message: "Invalid Excel file",
      });
    }

    const rows = [];

    // Skip header row (row 1)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const organization = row.getCell(1).value;
      const activity = row.getCell(2).value;

      if (organization && activity) {
        rows.push({
          organization: String(organization).trim(),
          name: String(activity).trim().toLowerCase(),
        });
      }
    });

    if (!rows.length) {
      return res.status(400).json({
        message: "Excel file contains no valid data",
      });
    }

    // Remove duplicates inside file
    const uniqueMap = new Map();

    rows.forEach((row) => {
      const key = `${row.organization}-${row.name}`;
      uniqueMap.set(key, row);
    });

    const uniqueRows = Array.from(uniqueMap.values()).map((row) => ({
      organization: row.organization,
      name: row.name,
      userId: req.user.id, 
    }));

    await Activity.bulkCreate(uniqueRows);

    res.status(201).json({
      message: "Bulk upload successful",
      inserted: uniqueRows.length,
    });
  } catch (error) {
    next(error);
  }
};


//download template
export const downloadActivityTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Activity Template");

    // Define columns
    sheet.columns = [
      { header: "organization", key: "organization", width: 35 },
      { header: "name", key: "name", width: 40 },
    ];

    // Add sample rows (important for guidance)
    sheet.addRow({
      organization: "Finance Headquarters",
      name: "Audit",
    });

    sheet.addRow({
      organization: "Finance Headquarters",
      name: "Payroll",
    });

    sheet.addRow({
      organization: "Statistical Service",
      name: "Census",
    });

    // Style header row
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F4CAF50" }, // dark gray background
      };
    });

    // Freeze header row (nice UX)
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=activity_bulk_template.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

//fetching activities based on user organization
export const getMyActivities = async (req, res, next) => {
  try {
    const userOrganization = req.user.organization;

    const activities = await Activity.findAll({
      where: { organization: userOrganization },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

//fetch all activity records
export const getAllActivities = async (req, res, next) => {
  try {
    const activities = await Activity.findAll({
      order: [
        ["organization", "ASC"],
        ["name", "ASC"],
      ],
    });

    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

//delete a record
export const deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({
        message: "Activity not found",
      });
    }

    await activity.destroy();

    res.status(200).json({
      message: "Activity deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

//update a record
export const updateActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, organization } = req.body;

    if (!name || !organization) {
      return res.status(400).json({
        message: "Name and organization are required",
      });
    }

    const activity = await Activity.findByPk(id);

    if (!activity) {
      return res.status(404).json({
        message: "Activity not found",
      });
    }

    // Normalize name
    const normalizedName = name.trim().toLowerCase();

    activity.name = normalizedName;
    activity.organization = organization.trim();

    await activity.save(); // unique constraint protects duplicates

    res.status(200).json({
      message: "Activity updated successfully",
      activity,
    });
  } catch (error) {
    next(error); // let global error handler manage duplicates
  }
};