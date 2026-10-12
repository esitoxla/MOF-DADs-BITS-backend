// utils/revenueReport.pdf.js
import PDFDocument from "pdfkit";
import { getQuarterPeriod } from "./quarterPeriod.js";
import {
  THEME,
  MARGIN,
  fmt,
  drawWatermark,
  drawReportHeader,
  drawTableHeader,
  drawRow,
  measureRowHeight,
  ensureSpace,
  addFooters,
} from "./pdfTheme.js";

export function generateRevenuePDF({
  grouped,
  totals,
  year,
  quarter,
  user,
  organizationLabel,
  logoPath,
  res,
}) {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const period = getQuarterPeriod(year, quarter);
  const month = period.endMonthName;

  doc.pipe(res);

  drawWatermark(doc, logoPath);

  let y = drawReportHeader(doc, {
    title: `Summary of IGF Performance as at ${month} ${period.year} by Revenue Categories (in GHS)`,
    lines: [
      `DADs: ${organizationLabel || user?.organization || "-"}`,
      `Reporting Period: Q${quarter} (${month} ${period.year})`,
      "Currency: Ghana Cedis (GHS)",
    ],
    logoPath,
  });

  // Widths sum to 515 = A4 width (595) minus 40pt margins on each side.
  // The budget column is wider than 68 because PDFKit treats "PROJECTION / "
  // as one unbreakable word (no break before "/"), and 68pt splits "PROJECTION".
  const asAt = `AS AT END ${month} ${period.year}`;
  const cols = [
    { label: "REVENUE CATEGORIES", w: 85 },
    { label: `${period.year} PROJECTION / BUDGET`, w: 80 },
    { label: "ACTUAL COLLECTION", sub: asAt, w: 68 },
    { label: "PAYMENT INTO THE CONSOLIDATED FUND", sub: asAt, w: 85 },
    { label: "RETENTION", sub: asAt, w: 64 },
    { label: "PROJECTION", sub: `AT 31 DEC ${period.year}`, w: 70 },
    { label: "REMARKS", w: 63 },
  ];

  const formula = ["A", "B", "C = D + E", "D = C - E", "E = C - D", "", ""];
  const formulaOpts = {
    fill: "#F3F4F6",
    font: "Helvetica-Bold",
    size: 8,
    h: 22,
    align: "center",
  };

  const rowOpts = {
    font: "Helvetica-Bold",
    size: 9,
    h: 22,
    wrapLabel: true,
  };

  // Watermark, column header, and formula row repeat on every overflow page
  const onNewPage = () => {
    drawWatermark(doc, logoPath);
    const headerY = drawTableHeader(doc, 50, cols);
    return drawRow(doc, headerY, cols, formula, formulaOpts);
  };

  y = drawTableHeader(doc, y, cols);
  y = drawRow(doc, y, cols, formula, formulaOpts);

  const valuesOf = (row) => [
    row.category ?? "",
    fmt(row.projection),
    fmt(row.actual),
    fmt(row.payment),
    fmt(row.retention),
    fmt(row.projectionDec),
    row.remarks ?? "",
  ];

  const rows = grouped || [];
  if (rows.length === 0) {
    const emptyH = 22;
    y = ensureSpace(doc, y, emptyH, onNewPage);
    const tableW = cols.reduce((sum, c) => sum + c.w, 0);
    doc.rect(MARGIN, y, tableW, emptyH).lineWidth(0.5).stroke(THEME.line);
    const cursorY = doc.y;
    doc
      .fillColor(THEME.muted)
      .font("Helvetica")
      .fontSize(9)
      .text("No records for this period", MARGIN, y + (emptyH - 9) / 2 - 1, {
        width: tableW,
        align: "center",
        lineBreak: false,
      });
    doc.y = cursorY;
    doc.fillColor(THEME.ink);
    y += emptyH;
  } else {
    rows.forEach((row) => {
      const values = valuesOf(row);
      const needed = measureRowHeight(doc, cols, values, rowOpts);
      y = ensureSpace(doc, y, needed, onNewPage);
      y = drawRow(doc, y, cols, values, rowOpts);
    });
  }

  y = ensureSpace(doc, y, 26, onNewPage);
  drawRow(
    doc,
    y,
    cols,
    [
      "TOTAL",
      fmt(totals?.projection),
      fmt(totals?.actual),
      fmt(totals?.payment),
      fmt(totals?.retention),
      fmt(totals?.projectionDec),
      "",
    ],
    {
      fill: THEME.green,
      font: "Helvetica-Bold",
      size: 10.5,
      h: 26,
      color: "#FFFFFF",
    },
  );

  addFooters(doc, "BITS | Ministry of Finance");

  doc.end();
}
