// utils/cashPositionReport.pdf.js
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

export function generateCashPositionPDF({
  rows = [],
  totals = {},
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
    title: `MDAs Cash Position as at end ${month} ${period.year} - MOF_DADs`,
    lines: [
      `DADs: ${organizationLabel || user?.organization || "-"}`,
      `Reporting Period: Q${quarter} (${month} ${period.year})`,
      "Currency: Ghana Cedis (GHS)",
    ],
    logoPath,
  });

  // Widths sum to 515 = A4 width (595) minus 40pt margins on each side.
  // Previous widths were 200 + 70 + 70 + 80 + 70 = 490; each column gained 5.
  const cols = [
    { label: "ACCOUNT NAME", w: 205 },
    { label: "GHS", w: 75 },
    { label: "EUR", w: 75 },
    { label: "GBP", w: 85 },
    { label: "USD", w: 75 },
  ];

  const rowOpts = {
    font: "Helvetica",
    size: 9,
    h: 22,
    wrapLabel: true,
  };

  const onNewPage = () => {
    drawWatermark(doc, logoPath);
    return drawTableHeader(doc, 50, cols);
  };

  y = drawTableHeader(doc, y, cols);

  const valuesOf = (row) => [
    row.account_name ?? "",
    fmt(row.GHS),
    fmt(row.EUR),
    fmt(row.GBP),
    fmt(row.USD),
  ];

  const data = rows || [];
  if (data.length === 0) {
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
    data.forEach((row) => {
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
      "TOTAL CASH POSITION",
      fmt(totals?.GHS),
      fmt(totals?.EUR),
      fmt(totals?.GBP),
      fmt(totals?.USD),
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
