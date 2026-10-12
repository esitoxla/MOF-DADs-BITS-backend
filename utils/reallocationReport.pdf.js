// utils/reallocationReport.pdf.js
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
  ensureSpace,
  addFooters,
} from "./pdfTheme.js";

// The on-screen summary always lists these three items, even when a period
// has figures for only some of them. Any other title in `grouped` is drawn
// after them so a long series still paginates.
const STRUCTURE = [
  "Compensation of Employees",
  "Goods and Services",
  "Capital Expenditure",
];

const PARENT_H = 22;
const GOG_H = 20;

function rowsToDraw(grouped) {
  const rows = grouped || [];
  if (rows.length === 0) return [];

  const byTitle = new Map(rows.map((row) => [row.title, row]));
  const ordered = STRUCTURE.map(
    (title) => byTitle.get(title) || { title, GOG: {} },
  );
  for (const row of rows) {
    if (row?.title && !STRUCTURE.includes(row.title)) ordered.push(row);
  }
  return ordered;
}

export function generateReallocationSummaryPDF({
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
    title: `Additional funds received in Q${quarter} (${month} ${period.year})`,
    lines: [
      `DADs: ${organizationLabel || user?.organization || "-"}`,
      `Reporting Period: Q${quarter} (${month} ${period.year})`,
      "Source of Funding: GOG",
      "Currency: Ghana Cedis (GHS)",
    ],
    logoPath,
  });

  // Widths sum to 515 = A4 width (595) minus 40pt margins on each side.
  // Previous widths were 180 + 90 + 90 + 90 + 90 = 540. The amount columns
  // are 93 so "Amount Reallocated" stays on one line; the name column takes
  // the rest.
  const cols = [
    { label: "Expenditure Item", w: 143 },
    { label: "Amount Reallocated", w: 93 },
    { label: "Amount Released", w: 93 },
    { label: "Actual Expenditure", w: 93 },
    { label: "Actual Payment", w: 93 },
  ];

  const onNewPage = () => {
    drawWatermark(doc, logoPath);
    return drawTableHeader(doc, 50, cols);
  };

  y = drawTableHeader(doc, y, cols);

  const gogValues = (row) => {
    const gog = row?.GOG || {};
    return [
      fmt(gog.reallocated),
      fmt(gog.released),
      fmt(gog.expenditure),
      fmt(gog.payment),
    ];
  };

  const rows = rowsToDraw(grouped);
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
      // Keep the parent together with its GOG row, then check again
      // immediately before each of them.
      y = ensureSpace(doc, y, PARENT_H + GOG_H, onNewPage);
      y = drawRow(doc, y, cols, [row.title, "-", "-", "-", "-"], {
        fill: THEME.tint,
        font: "Helvetica-Bold",
        size: 10,
        h: PARENT_H,
      });

      y = ensureSpace(doc, y, GOG_H, onNewPage);
      y = drawRow(doc, y, cols, ["GOG", ...gogValues(row)], {
        font: "Helvetica-Oblique",
        size: 9,
        h: GOG_H,
        indent: 12,
        color: "#4B5563",
      });
    });
  }

  y = ensureSpace(doc, y, 26, onNewPage);
  drawRow(
    doc,
    y,
    cols,
    [
      "TOTAL",
      fmt(totals?.reallocated),
      fmt(totals?.released),
      fmt(totals?.expenditure),
      fmt(totals?.payment),
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
