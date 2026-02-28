import PDFDocument from "pdfkit";

export const generateCashPositionPDF = ({
  rows = [],
  totals = {},
  year,
  quarter,
  organization,
  logoPath,
  res,
}) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
    .text(`MDAs Cash Position as at end Q${quarter} ${year}`, {
      align: "center",
    });

  /* =========================
   HEADER INFO + LOGO
========================= */

  const headerY = 90;
  const leftX = 40;
  const logoHeaderY = 70;
  const logoX = doc.page.width - 140;

  doc
    .font("Helvetica")
    .fontSize(12)
    .text(`DADs: ${organization}`, leftX, headerY)
    .text(
      `Reporting Period: Q${quarter} (${year})`,
      leftX,
      headerY + 15,
    )
    .text(`Currency: Ghana Cedis (GHS)`, leftX, headerY + 30);

  try {
    doc.image(logoPath, logoX, logoHeaderY, { width: 70, height: 60 });
  } catch (err) {
    console.log("Logo error:", err.message);
  }

  doc.moveDown(3);

  /* =========================
     TABLE CONFIG
  ========================== */
  const columns = [
    { key: "account_name", label: "ACCOUNT NAME", width: 200, align: "left" },
    { key: "GHS", label: "GHS", width: 70, align: "right" },
    { key: "EUR", label: "EUR", width: 70, align: "right" },
    { key: "GBP", label: "GBP", width: 80, align: "right" },
    { key: "USD", label: "USD", width: 70, align: "right" },
  ];

  let y = doc.y;
  const rowHeight = 28;
  let xStart;

  /* =========================
     TABLE HEADER
  ========================== */
  xStart = doc.page.margins.left;

  columns.forEach((col) => {
    doc
      .rect(xStart, y, col.width, rowHeight)
      .fillAndStroke("#F3F4F6", "#9CA3AF");

    doc
      .fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(col.label, xStart + 4, y + 9, {
        width: col.width - 8,
        align: col.align,
      });

    xStart += col.width;
  });

  y += rowHeight;

  /* =========================
     TABLE BODY
  ========================== */
  doc.font("Helvetica").fontSize(9);

  rows.forEach((row) => {
    xStart = doc.page.margins.left;

    columns.forEach((col) => {
      doc.rect(xStart, y, col.width, rowHeight).strokeColor("#D1D5DB").stroke();

      const value =
        col.key === "account_name"
          ? row.account_name
          : formatMoney(row[col.key]);

      doc.text(value || "", xStart + 4, y + 9, {
        width: col.width - 8,
        align: col.align,
      });

      xStart += col.width;
    });

    y += rowHeight;
  });

  /* =========================
     TOTAL ROW
  ========================== */
  xStart = doc.page.margins.left;

  columns.forEach((col) => {
    doc
      .rect(xStart, y, col.width, rowHeight)
      .fillAndStroke("#E7F6EC", "#22C55E");

    let value = "";

    if (col.key === "account_name") {
      value = "TOTAL CASH POSITION";
    } else {
      value = formatMoney(totals[col.key]);
    }

    doc
      .fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(value, xStart + 4, y + 9, {
        width: col.width - 8,
        align: col.align,
      });

    xStart += col.width;
  });

  doc.end();
};
