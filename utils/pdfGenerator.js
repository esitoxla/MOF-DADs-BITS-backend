// utils/pdfGenerator.js
import PDFDocument from "pdfkit";
import { getQuarterPeriod } from "./quarterPeriod.js";
import {
  THEME,
  fmt,
  drawWatermark,
  drawReportHeader,
  drawTableHeader,
  drawRow,
  ensureSpace,
  addFooters,
} from "./pdfTheme.js";

export function generateQuarterlyPDF({
  grouped, // already grouped & final report rows
  year,
  quarter,
  sourceOfFunding,
  user, // fallback for the DADs line
  organizationLabel, // optional: the org selected in the UI
  logoPath,
  res, // writable HTTP stream
}) {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const period = getQuarterPeriod(year, quarter);
  const month = period.endMonthName;

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
    },
  );

  doc.pipe(res);

  // Watermark first so everything else paints over it
  drawWatermark(doc, logoPath);

  // Header band
  let y = drawReportHeader(doc, {
    title:
      "Summary of Budget Performance by Economic Classification and Funding",
    lines: [
      `DADs: ${organizationLabel || user?.organization || "-"}`,
      `Reporting Period: Q${quarter} (${month} ${period.year})`,
      `Source of Funding: ${sourceOfFunding}`,
      "Currency: Ghana Cedis (GHS)",
    ],
    logoPath,
  });

  // Widths sum to 515 = A4 width (595) minus 40pt margins on each side
  const cols = [
    { label: "EXPENDITURE ITEM", w: 135 },
    { label: `${period.year} APPROVED BUDGET`, sub: "Appropriation", w: 88 },
    {
      label: "AMOUNT RELEASED",
      sub: `as at end ${month} ${period.year}`,
      w: 73,
    },
    {
      label: "ACTUAL EXPENDITURE",
      sub: `as at end ${month} ${period.year}`,
      w: 73,
    },
    {
      label: "ACTUAL PAYMENTS",
      sub: `as at end ${month} ${period.year}`,
      w: 73,
    },
    { label: "PROJECTIONS", sub: `as at 31 Dec ${period.year}`, w: 73 },
  ];

  // Runs on every overflow page: watermark + repeated column header
  const onNewPage = () => {
    drawWatermark(doc, logoPath);
    return drawTableHeader(doc, 50, cols);
  };

  y = drawTableHeader(doc, y, cols);

  const vals = (o) =>
    [
      o.totalBudget,
      o.amountReleased,
      o.actualExpenditure,
      o.actualPayments,
      o.projection,
    ].map(fmt);

  grouped.forEach((item) => {
    // keep a parent row together with its first sub-row
    y = ensureSpace(doc, y, 22 + 20, onNewPage);
    y = drawRow(doc, y, cols, [item.title, ...vals(item)], {
      fill: THEME.tint,
      font: "Helvetica-Bold",
      size: 10,
      h: 22,
    });

    (item.breakdown || []).forEach((b) => {
      y = ensureSpace(doc, y, 20, onNewPage);
      y = drawRow(doc, y, cols, [b.source, ...vals(b)], {
        font: "Helvetica-Oblique",
        size: 9,
        h: 20,
        indent: 12,
        color: "#4B5563",
      });
    });

    y += 6; // breathing room between groups
  });

  y = ensureSpace(doc, y, 26, onNewPage);
  drawRow(doc, y, cols, ["TOTAL", ...vals(totals)], {
    fill: THEME.green,
    font: "Helvetica-Bold",
    size: 10.5,
    h: 26,
    color: "#FFFFFF",
  });

  // Footer on every page: generated date + "Page X of N"
  addFooters(doc, "BITS | Ministry of Finance");

  doc.end();
}
