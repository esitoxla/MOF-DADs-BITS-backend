import PDFDocument from "pdfkit";
import path from "path";
import { getQuarterPeriod } from "./quarterPeriod.js";

export function generateNaturalAccountPDF({
  report, // [{ title, GOG, IGF, DP }]
  totals,
  year,
  quarter,
  sourceOfFunding,
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

  doc.pipe(res);

  // ===========================
  // WATERMARK
  // ===========================
  try {
    doc.save();
    doc.opacity(0.1);
    doc.image(logoPath, 120, 200, { width: 350 });
    doc.restore();
  } catch {}

  // ===========================
  // HEADER
  // ===========================
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(
      "Summary of Budget Performance by Natural Account and Funding",
      40,
      40,
    );

  const headerY = 80;

  doc
    .font("Helvetica")
    .fontSize(12)
    .text(`DADs: ${user.organization}`, 40, headerY)
    .text(
      `Reporting Period: Q${quarter} (${period.endMonthName} ${year})`,
      40,
      headerY + 15,
    )
    .text(`Source of Funding: ${sourceOfFunding}`, 40, headerY + 30)
    .text(`Currency: Ghana Cedis (GHS)`, 40, headerY + 45);

  // Logo
  try {
    doc.image(logoPath, doc.page.width - 120, 70, {
      width: 90,
      height: 60,
    });
  } catch {}

  doc.y = headerY + 90;

  // ===========================
  // TABLE SETUP
  // ===========================
  const tableStartX = 40;
  const colWidths = {
    account: 160,
    small: 60,
  };

  function drawCell(
    x,
    y,
    width,
    height,
    text,
    font = "Helvetica",
    align = "left",
    fill = null,
  ) {
    if (fill) {
      doc.rect(x, y, width, height).fill(fill);
      doc.fillColor("#000");
    }

    doc.rect(x, y, width, height).strokeColor("#D1D5DB").stroke();

    doc
      .font(font)
      .fontSize(10)
      .text(text, x + 5, y + 6, {
        width: width - 10,
        align,
      });
  }

  // ===========================
  // COLUMN VISIBILITY
  // ===========================
  const showGOG = sourceOfFunding === "ALL" || sourceOfFunding === "GOG";
  const showIGF = sourceOfFunding === "ALL" || sourceOfFunding === "IGF";
  const showDPF = sourceOfFunding === "ALL" || sourceOfFunding === "DPF";

  // ===========================
  // TABLE HEADER (2 ROWS)
  // ===========================
  let y = doc.y + 10;
  let x = tableStartX;

  // Row 1
  drawCell(
    x,
    y,
    colWidths.account,
    30,
    "Natural Account",
    "Helvetica-Bold",
    "center",
    "#F3F4F6",
  );
  x += colWidths.account;

  if (showGOG) {
    drawCell(x, y, 120, 30, "GOG", "Helvetica-Bold", "center", "#F3F4F6");
    x += 120;
  }

  if (showIGF) {
    drawCell(x, y, 120, 30, "IGF", "Helvetica-Bold", "center", "#F3F4F6");
    x += 120;
  }

  if (showDPF) {
    drawCell(x, y, 120, 30, "DPF", "Helvetica-Bold", "center", "#F3F4F6");
    x += 120;
  }

  y += 30;
  x = tableStartX;

  // Row 2
  drawCell(
    x,
    y,
    colWidths.account,
    30,
    "",
    "Helvetica-Bold",
    "center",
    "#F9FAFB",
  );
  x += colWidths.account;

  function drawSubHeaders() {
   drawCell(
     x,
     y,
     60,
     30,
     "Appropriation",
     "Helvetica-Bold",
     "center",
     "#F9FAFB",
   );
   x += 60;

   drawCell(
     x,
     y,
     60,
     30,
     "Actual Expenditure",
     "Helvetica-Bold",
     "center",
     "#F9FAFB",
   );
   x += 60;
  }

  if (showGOG) drawSubHeaders();
  if (showIGF) drawSubHeaders();
  if (showDPF) drawSubHeaders();

  y += 28;

  // ===========================
  // DATA ROWS
  // ===========================
  report.forEach((row) => {
    x = tableStartX;

    drawCell(x, y, colWidths.account, 28, row.title);
    x += colWidths.account;

    function drawValues(group) {
      drawCell(
        x,
        y,
        60,
        28,
        Number(group.appro || 0).toLocaleString(),
        "Helvetica",
        "right",
      );
      x += 60;
      drawCell(
        x,
        y,
        60,
        28,
        Number(group.actual || 0).toLocaleString(),
        "Helvetica",
        "right",
      );
      x += 60;
    }

    if (showGOG) drawValues(row.GOG);
    if (showIGF) drawValues(row.IGF);
    if (showDPF) drawValues(row.DPF);

    y += 28;
  });

  // ===========================z
  // TOTAL ROW
  // ===========================
  
  x = tableStartX;

  drawCell(
    x,
    y,
    colWidths.account,
    24,
    "TOTAL",
    "Helvetica-Bold",
    "left",
    "#E8F5E9",
  );
  x += colWidths.account;

  function drawTotal(group) {
    drawCell(
      x,
      y,
      60,
      24,
      Number(group.appro || 0).toLocaleString(),
      "Helvetica-Bold",
      "right",
      "#E8F5E9",
    );
    x += 60;

    drawCell(
      x,
      y,
      60,
      24,
      Number(group.actual || 0).toLocaleString(),
      "Helvetica-Bold",
      "right",
      "#E8F5E9",
    );
    x += 60;
  }

  if (showGOG) drawTotal(totals.GOG);
  if (showIGF) drawTotal(totals.IGF);
  if (showDPF) drawTotal(totals.DPF);

  // ===========================
  // FOOTER
  // ===========================
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

  doc.end();
}
