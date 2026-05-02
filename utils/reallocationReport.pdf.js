import PDFDocument from "pdfkit";
import { getQuarterPeriod } from "./quarterPeriod.js";

export function generateReallocationSummaryPDF({
  grouped,
  totals,
  year,
  quarter,
  user,
  logoPath,
  res,
}) {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

  const period = getQuarterPeriod(year, quarter);

  const generatedDate = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // SAFETY: catch stream errors
  doc.on("error", (err) => {
    console.error("PDF ERROR:", err);
  });

  doc.pipe(res);

  // =========================
  // HEADER
  // =========================
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Reallocation Summary Report", 40, 40);

  const headerY = 80;
  const leftX = 40;
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
    .text(`Source of Funding: GOG`, leftX, headerY + 30) // force GOG
    .text(`Currency: Ghana Cedis (GHS)`, leftX, headerY + 45);

  if (logoPath) {
    try {
      doc.image(logoPath, logoX, headerY - 10, { width: 90, height: 60 });
    } catch (err) {}
  }

  doc.y = headerY + 90;

  // =========================
  // TABLE HELPERS
  // =========================
  function drawCell(x, y, width, height, text, bold = false, align = "right") {
    doc.rect(x, y, width, height).strokeColor("#D1D5DB").stroke();

    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9)
      .fillColor("#000")
      .text(text, x + 5, y + 6, {
        width: width - 10,
        align,
      });
  }

  
  const colWidths = [180, 90, 90, 90, 90];


  const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const usableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const tableStartX =
    doc.page.margins.left + (usableWidth - totalTableWidth) / 2;

  

  // =========================
  // HEADERS
  // =========================
  function drawHeaders(y) {
    const headers = [
      "Expenditure Item",
      "Amount Reallocated",
      "Amount Released",
      "Actual Expenditure",
      "Actual Payment",
    ];

    let x = tableStartX;
    const height = 40;

    headers.forEach((h, i) => {
      const width = colWidths[i];

      doc.rect(x, y, width, height).fill("#F3F4F6");

      doc
        .fillColor("#000")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(h, x + 5, y + 10, {
          width: width - 10,
          align: "center",
        });

      doc.rect(x, y, width, height).stroke();

      x += width;
    });

    return y + height;
  }

  let yPosition = drawHeaders(doc.y + 10);

  // =========================
  // STRUCTURED ROWS (MATCH FRONTEND)
  // =========================
  const structure = [
    "Compensation of Employees",
    "Use of Goods and Services",
    "Capital Expenditure",
  ];

  structure.forEach((item) => {
    const row = grouped.find((r) => r.title === item) || {};

    let x = tableStartX;

    // MAIN ROW
    const mainValues = [item, "-", "-", "-", "-"];

    mainValues.forEach((val, i) => {
      drawCell(
        x,
        yPosition,
        colWidths[i],
        22,
        val,
        true,
        i === 0 ? "left" : "right",
      );
      x += colWidths[i];
    });

    yPosition += 22;

    // GOG ROW
    x = tableStartX;

    const gogValues = [
      "   GOG",
      row.GOG?.reallocated || 0,
      row.GOG?.released || 0,
      row.GOG?.expenditure || 0,
      row.GOG?.payment || 0,
    ];

    gogValues.forEach((val, i) => {
      drawCell(
        x,
        yPosition,
        colWidths[i],
        22,
        i === 0 ? val : Number(val).toLocaleString(),
        false,
        i === 0 ? "left" : "right",
      );
      x += colWidths[i];
    });

    yPosition += 22;
  });

  // =========================
  // TOTAL ROW
  // =========================
  let x = tableStartX;

  const totalValues = [
    "TOTAL",
    totals.reallocated || 0,
    totals.released || 0,
    totals.expenditure || 0,
    totals.payment || 0,
  ];

  totalValues.forEach((val, i) => {
    const width = colWidths[i];

    doc.rect(x, yPosition, width, 22).fill("#E8F5E9");

    doc
      .fillColor("#166534")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(
        i === 0 ? val : Number(val).toLocaleString(),
        x + 5,
        yPosition + 5,
        {
          width: width - 10,
          align: i === 0 ? "left" : "right",
        },
      );

    doc.rect(x, yPosition, width, 22).stroke();

    x += width;
  });

  yPosition += 22;

  // =========================
  // FOOTER
  // =========================
  const range = doc.bufferedPageRange();

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);

    const pageBottom = doc.page.height - 30;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("gray")
      .text(`Generated on: ${generatedDate}`, 40, pageBottom);

    doc.text(`Page ${i + 1} of ${range.count}`, 0, pageBottom, {
      align: "right",
    });
  }

  // FINALIZE STREAM (ONLY THIS ENDS IT)
  doc.end();
}
