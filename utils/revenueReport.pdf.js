import PDFDocument from "pdfkit";
import { formatGHS } from "./numberFormat.js";
import { getQuarterPeriod } from "./quarterPeriod.js";

export const generateRevenuePDF = ({
  grouped,
  totals,
  year,
  quarter,
  user,
  logoPath,
  res,
}) => {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
  });

  const period = getQuarterPeriod(year, quarter);

  //Added Stream Error Handling
  doc.on("error", (err) => {
    console.error("PDF stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "PDF generation failed" });
    }
  });

  doc.pipe(res);

  /* =========================
     WATERMARK
  ========================== */
  try {
    doc.save();
    doc.opacity(0.08);
    doc.image(logoPath, 120, 220, { width: 350 });
    doc.restore();
  } catch (err) {
    console.log("Watermark error:", err.message);
  }

  /* =========================
     TITLE
  ========================== */
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Summary of Revenue Performance", { align: "center" });


  /* =========================
     HEADER INFO + LOGO
  ========================== */
  const headerY = 90;
  const leftX = 40;
  const logoHeaderY = 70;
  const logoX = doc.page.width - 120;

  doc
    .font("Helvetica")
    .fontSize(12)
    .text(`DADs: ${user.organization}`, leftX, headerY)
    .text(
      `Reporting Period: Q${quarter} (${period.endMonthName} ${year})`,
      leftX,
      headerY + 15,
    )
    .text(`Currency: Ghana Cedis (GHS)`, leftX, headerY + 30);

  try {
    doc.image(logoPath, logoX, logoHeaderY, { width: 90, height: 60 });
  } catch (err) {
    console.log("Logo error:", err.message);
  }

  doc.moveDown(3);

  /* =========================
     TABLE
  ========================== */
  drawRevenueTable(doc, grouped, totals, period);

  doc.end();
};




/* ======================================================
   TABLE
====================================================== */

const drawRevenueTable = (doc, grouped, totals, period) => {
  let y = doc.y;

  const columns = [
    { key: "category", label: "REVENUE CATEGORIES", width: 90, align: "left" },

    {
      key: "projection",
      label: `${period.year} PROJECTION / BUDGET`,
      width: 70,
    },

    {
      key: "actual",
      label: `ACTUAL COLLECTION AS AT END ${period.endMonthName} ${period.year}`,
      width: 70,
    },

    {
      key: "payment",
      label: `PAYMENT INTO THE CONSOLIDATED FUND AS AT END ${period.endMonthName} ${period.year}`,
      width: 90,
    },

    {
      key: "retention",
      label: `RETENTION AS AT END ${period.endMonthName} ${period.year}`,
      width: 70,
    },

    {
      key: "projectionDec",
      label: `PROJECTION AT 31 DEC ${period.year}`,
      width: 70,
    },

    { key: "remarks", label: "REMARKS", width: 70, align: "left" },
  ];


  // HEADER
  y = drawHeaderRows(doc, y, columns, period);

  // BODY
  grouped.forEach((row) => {
    y = checkPageBreak(doc, y);
    const rowHeight = drawBodyRow(doc, y, columns, row);
    y += rowHeight;
  });

  // TOTAL
  y = checkPageBreak(doc, y);
  drawTotalRow(doc, y, columns, totals);
};

/* =========================
   HEADER ROW
========================= */
const drawHeaderRows = (doc, y, columns, period) => {
  let x = doc.page.margins.left;

  const headerHeight = 70;
  const formulaHeight = 24;

  // ===============================
  // ROW 1 – MAIN TITLES
  // ===============================
  columns.forEach((col) => {
    doc.rect(x, y, col.width, headerHeight).fillAndStroke("#F3F4F6", "#9CA3AF");

    doc
      .fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(col.label.split("\n")[0], x + 4, y + 10, {
        width: col.width - 8,
        align: "center",
      });

    x += col.width;
  });

  y += headerHeight;
  x = doc.page.margins.left;


  // ===============================
  // ROW 2 – FORMULA ROW (A, B, C...)
  // ===============================
  const formulaMap = {
    category: "A",
    projection: "B",
    actual: "C = D + E",
    payment: "D = C - E",
    retention: "E = C - D",
    projectionDec: "",
    remarks: "",
  };

  columns.forEach((col) => {
    doc
      .rect(x, y, col.width, formulaHeight)
      .fillAndStroke("#F9FAFB", "#9CA3AF");

    doc
      .fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(formulaMap[col.key] || "", x + 4, y + 6, {
        width: col.width - 8,
        align: "center",
      });

    x += col.width;
  });

  return y + formulaHeight;
};

/* =========================
   BODY ROW (DYNAMIC HEIGHT)
========================= */
const drawBodyRow = (doc, y, columns, data) => {
  let x = doc.page.margins.left;
  let rowHeight = 26;

  // 1. Calculate dynamic row height
  columns.forEach((col) => {
    const rawValue = data[col.key];
    let text = "";

    if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
      if (!isNaN(rawValue)) {
        text = formatGHS(Number(rawValue));
      } else {
        text = String(rawValue);
      }
    }

    const textHeight = doc.heightOfString(text, {
      width: col.width - 8,
      align: col.align || "right",
    });

    rowHeight = Math.max(rowHeight, textHeight + 12);
  });

  // 2. Draw row cells
  columns.forEach((col) => {
    doc.rect(x, y, col.width, rowHeight).strokeColor("#D1D5DB").stroke();

    const rawValue = data[col.key];
    let text = "";

    if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
      if (!isNaN(rawValue)) {
        text = formatGHS(Number(rawValue));
      } else {
        text = String(rawValue);
      }
    }

    doc
      .fillColor("#000")
      .font("Helvetica")
      .fontSize(9)
      .text(text, x + 4, y + 6, {
        width: col.width - 8,
        align: col.align || "right",
      });

    x += col.width;
  });

  return rowHeight;
};


/* =========================
   TOTAL ROW
========================= */
const drawTotalRow = (doc, y, columns, totals) => {
  let x = doc.page.margins.left;
  const rowHeight = 28;

  columns.forEach((col) => {
    doc.rect(x, y, col.width, rowHeight).fillAndStroke("#E7F6EC", "#22C55E");

    let text = "";

    if (col.key === "category") {
      text = "TOTAL";
    } else {
      const rawValue = totals[col.key];
      if (rawValue !== null && rawValue !== undefined && !isNaN(rawValue)) {
        text = formatGHS(Number(rawValue));
      }
    }


    doc
      .fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(text, x + 4, y + 8, {
        width: col.width - 8,
        align: col.align || "right",
      });

    x += col.width;
  });

  return rowHeight;
};

/* =========================
   PAGE BREAK HANDLER
========================= */
const checkPageBreak = (doc, y) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + 35 > bottom) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
};
