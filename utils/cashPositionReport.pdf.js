import PDFDocument from "pdfkit";

export const generateCashPositionPDF = ({
  rows,
  totals,
  as_at_date,
  organization,
  logoPath,
  res,
}) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  // Logo
  if (logoPath) {
    doc.image(logoPath, 40, 40, { width: 60 });
    doc.moveDown(2);
  }

  doc
    .fontSize(14)
    .text(`MDAs Cash Position as at end ${as_at_date}`, {
      align: "center",
      bold: true,
    })
    .moveDown(1);

  doc.fontSize(10).text(`Organization: ${organization}`).moveDown(1);

  // Table header
  doc.font("Helvetica-Bold");
  doc.text("ACCOUNT NAME", 40, doc.y, { continued: true });
  doc.text("GHS", 220, doc.y, { continued: true });
  doc.text("EUR", 300, doc.y, { continued: true });
  doc.text("GBP", 380, doc.y, { continued: true });
  doc.text("USD", 460, doc.y);
  doc.moveDown(0.5);

  doc.font("Helvetica");

  // Rows
  rows.forEach((row) => {
    doc.text(row.account_name, 40, doc.y, { continued: true });
    doc.text(row.GHS.toFixed(2), 220, doc.y, { continued: true });
    doc.text(row.EUR.toFixed(2), 300, doc.y, { continued: true });
    doc.text(row.GBP.toFixed(2), 380, doc.y, { continued: true });
    doc.text(row.USD.toFixed(2), 460, doc.y);
  });

  doc.moveDown(0.5);
  doc.font("Helvetica-Bold");

  // Totals
  doc.text("TOTAL CASH POSITION", 40, doc.y, { continued: true });
  doc.text(totals.GHS.toFixed(2), 220, doc.y, { continued: true });
  doc.text(totals.EUR.toFixed(2), 300, doc.y, { continued: true });
  doc.text(totals.GBP.toFixed(2), 380, doc.y, { continued: true });
  doc.text(totals.USD.toFixed(2), 460, doc.y);

  doc.end();
};
