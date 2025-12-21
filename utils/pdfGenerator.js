import PDFDocument from "pdfkit";
import path from "path";

export function generateQuarterlyPDF({
  grouped,
  year,
  quarter,
  sourceOfFunding,
  user,
  logoPath,
  res, // <-- MUST BE HERE
}) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // Compute totals from grouped data
  const totals = grouped.reduce(
    (acc, item) => ({
      totalBudget: acc.totalBudget + (item.totalBudget || 0),
      amountReleased: acc.amountReleased + (item.amountReleased || 0),
      actualExpenditure: acc.actualExpenditure + (item.actualExpenditure || 0),
      actualPayments: acc.actualPayments + (item.actualPayments || 0),
      projection: acc.projection + (item.projection || 0),
    }),
    {
      totalBudget: 0,
      amountReleased: 0,
      actualExpenditure: 0,
      actualPayments: 0,
      projection: 0,
    }
  );

  // The controller already set them. Just stream the PDF.
  doc.pipe(res);

  // -----------------------------
  // Watermark (background image)
  // -----------------------------
  try {
    doc.save(); // save current graphics state

    doc.opacity(0.1); // very light watermark
    doc.image(logoPath, 120, 200, { width: 350 });
    // adjust X,Y,width depending on where you want it

    doc.restore(); // restore normal opacity
  } catch (err) {
    console.log("Watermark image error:", err.message);
  }

  // ===========================
  // HEADER BLOCK
  // ===========================

  // Title (takes full width)
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Summary of Budget Performance by Economic Classification", 40, 40);

  // The Y where DADs and LOGO should BOTH start
  const headerY = 70; // Adjust this number for spacing
  const leftX = 40;
  const logoX = doc.page.width - 120; // Right side of page

  // LEFT DETAILS (start at headerY)
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`DADs: ${user.organization}`, leftX, headerY)
    .text(`Year: ${year}`, leftX, headerY + 15)
    .text(`Quarter: Q${quarter}`, leftX, headerY + 30)
    .text(`Source of Funding: ${sourceOfFunding}`, leftX, headerY + 45)
    .text(`Currency: Ghana Cedis (GHS)`, leftX, headerY + 60);

  // RIGHT LOGO, same height as "DADs:"
  if (logoPath) {
    try {
      doc.image(logoPath, logoX, headerY, { width: 90 });
    } catch (err) {
      console.log("Logo error:", err.message);
    }
  }

  // Move cursor below header area
  doc.y = headerY + 90;

  // ===============================
  // TABLE SECTION
  // ===============================

  function drawCell(
    x,
    y,
    width,
    height,
    text,
    fontOptions = {},
    align = "left"
  ) {
    // Border
    doc.rect(x, y, width, height).strokeColor("#D1D5DB").stroke(); // light gray border

    // Text
    doc
      .fillColor("#000")
      .font(fontOptions.font || "Helvetica")
      .fontSize(fontOptions.size || 10)
      .text(text, x + 5, y + 6, {
        width: width - 10,
        align,
      });
  }

  // Column layout
  const tableTop = doc.y + 10;
  const colWidths = {
    item: 150,
    appropriation: 75,
    releases: 75,
    expenditure: 75,
    payments: 75,
    projection: 75,
  };

  const tableStartX = 40;

  // Helper to draw table headers
  function drawTableHeaders(y) {
    const headers = [
      "EXPENDITURE ITEM",
      "2025 APPROVED\nBUDGET / APPROPRIATION",
      "AMOUNT RELEASED\nAS AT END AUG 2025",
      "ACTUAL EXPENDITURE\nAS AT END AUG 2025",
      "ACTUAL PAYMENTS\nAS AT END AUG 2025",
      "PROJECTIONS AS\nAT 31 DEC 2025",
    ];

    let x = tableStartX;
    const headerHeight = 60; // <--- increase height here

    headers.forEach((header, i) => {
      const width = Object.values(colWidths)[i];

      // Background (light blue header)
      doc.rect(x, y, width, headerHeight).fill("#F3F4F6"); // UI light gray/blue
      doc.fillColor("#000");

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(header, x + 5, y + 12, {
          width: width - 10,
          align: "center",
        });

      // Border
      doc.rect(x, y, width, headerHeight).strokeColor("#D1D5DB").stroke();

      x += width;
    });

    return y + headerHeight;
  }

  // Draw headers
  let yPosition = drawTableHeaders(tableTop);

  grouped.forEach((item) => {
    yPosition = drawParentRow(item, yPosition);

    item.breakdown.forEach((b) => {
      yPosition = drawSubRow(b, yPosition);
    });

    yPosition += 8;
  });

  // Helper: Draw parent economic classification row
  function drawParentRow(item, y) {
    let x = tableStartX;

    const values = [
      item.title,
      item.totalBudget.toLocaleString(),
      item.amountReleased.toLocaleString(),
      item.actualExpenditure.toLocaleString(),
      item.actualPayments.toLocaleString(),
      item.projection.toLocaleString(),
    ];

    values.forEach((val, i) => {
      const width = Object.values(colWidths)[i];
      drawCell(
        x,
        y,
        width,
        22,
        val,
        { font: "Helvetica-Bold", size: 10 },
        i === 0 ? "left" : "right"
      );
      x += width;
    });

    return y + 22;
  }

  // Helper: Draw funding breakdown rows (GOG/IGF/DPF)
  function drawSubRow(b, y) {
    let x = tableStartX;

    const values = [
      "   " + b.source, // indent
      b.totalBudget.toLocaleString(),
      b.amountReleased.toLocaleString(),
      b.actualExpenditure.toLocaleString(),
      b.actualPayments.toLocaleString(),
      b.projection.toLocaleString(),
    ];

    values.forEach((val, i) => {
      const width = Object.values(colWidths)[i];
      drawCell(
        x,
        y,
        width,
        20,
        val,
        { font: "Helvetica-Oblique", size: 9 },
        i === 0 ? "left" : "right"
      );
      x += width;
    });

    return y + 20;
  }

  // ---------------------------
  // TOTAL ROW
  // ---------------------------
  function drawTotalRow(totals, y) {
    let x = tableStartX;

    const values = [
      "TOTAL",
      totals.totalBudget.toLocaleString(),
      totals.amountReleased.toLocaleString(),
      totals.actualExpenditure.toLocaleString(),
      totals.actualPayments.toLocaleString(),
      totals.projection.toLocaleString(),
    ];

    values.forEach((val, i) => {
      const width = Object.values(colWidths)[i];

      // Background
      doc.rect(x, y, width, 22).fill("#E8F5E9");

      // Text
      doc
        .fillColor("#166534")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(val, x + 5, y + 5, {
          width: width - 10,
          align: i === 0 ? "left" : "right",
        });

      // Border
      doc.rect(x, y, width, 22).strokeColor("#A5D6A7").stroke();

      x += width;
    });

    return y + 22;
  }

  yPosition = drawTotalRow(totals, yPosition);

  doc.end();
}




