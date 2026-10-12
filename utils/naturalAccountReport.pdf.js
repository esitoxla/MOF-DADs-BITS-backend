// utils/naturalAccountReport.pdf.js
import PDFDocument from "pdfkit";
import { getQuarterPeriod } from "./quarterPeriod.js";
import {
  THEME,
  MARGIN,
  fmt,
  drawWatermark,
  drawReportHeader,
  drawGroupedTableHeader,
  drawRow,
  measureRowHeight,
  ensureSpace,
  addFooters,
} from "./pdfTheme.js";

// Last slice absorbs the rounding remainder so the pieces sum to `total`.
function splitEqual(total, count) {
  if (count <= 0) return [];
  const share = Math.round((total / count) * 100) / 100;
  const widths = [];
  let used = 0;
  for (let i = 0; i < count; i++) {
    if (i === count - 1) widths.push(total - used);
    else {
      widths.push(share);
      used += share;
    }
  }
  return widths;
}

export function generateNaturalAccountPDF({
  report,
  totals,
  year,
  quarter,
  sourceOfFunding,
  user,
  organizationLabel,
  logoPath,
  res,
}) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 40,
    bufferPages: true,
  });
  const period = getQuarterPeriod(year, quarter);
  const month = period.endMonthName;

  const showGOG = sourceOfFunding === "ALL" || sourceOfFunding === "GOG";
  const showIGF = sourceOfFunding === "ALL" || sourceOfFunding === "IGF";
  const showDPF = sourceOfFunding === "ALL" || sourceOfFunding === "DPF";

  const visible = [
    { key: "GOG", label: "GOG", show: showGOG },
    { key: "IGF", label: "IGF", show: showIGF },
    { key: "DPF", label: "DPF", show: showDPF },
  ].filter((g) => g.show);

  const subLabels = ["Appropriation", "Actual Expenditure"];
  const usable = doc.page.width - MARGIN * 2;
  const amountCount = visible.length * subLabels.length;
  const firstW =
    amountCount === 0 ? usable : Math.round(usable * 0.25 * 100) / 100;
  const amountWidths = splitEqual(usable - firstW, amountCount);

  let amountIndex = 0;
  const groups = visible.map((g) => ({
    key: g.key,
    label: g.label,
    cols: subLabels.map((label) => ({
      label,
      w: amountWidths[amountIndex++],
    })),
  }));
  const firstCol = { label: "Natural Account", w: firstW };
  const cols = [firstCol, ...groups.flatMap((g) => g.cols)];

  doc.pipe(res);

  drawWatermark(doc, logoPath);

  let y = drawReportHeader(doc, {
    title: "Summary of Budget Performance by Natural Account and Funding",
    lines: [
      `DADs: ${organizationLabel || user?.organization || "-"}`,
      `Reporting Period: Q${quarter} (${month} ${period.year})`,
      `Source of Funding: ${sourceOfFunding}`,
      "Currency: Ghana Cedis (GHS)",
    ],
    logoPath,
  });

  const onNewPage = () => {
    drawWatermark(doc, logoPath);
    return drawGroupedTableHeader(doc, 50, firstCol, groups);
  };

  y = drawGroupedTableHeader(doc, y, firstCol, groups);

  const valuesOf = (source) => {
    const values = [source.title ?? ""];
    groups.forEach((g) => {
      const bucket = source[g.key] || {};
      values.push(fmt(bucket.appro), fmt(bucket.actual));
    });
    return values;
  };

  const rowOpts = {
    font: "Helvetica",
    size: 9,
    h: 22,
    wrapLabel: true,
  };

  const rows = report || [];
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
  drawRow(doc, y, cols, valuesOf({ title: "TOTAL", ...(totals || {}) }), {
    fill: THEME.green,
    font: "Helvetica-Bold",
    size: 10.5,
    h: 26,
    color: "#FFFFFF",
  });

  addFooters(doc, "BITS | Ministry of Finance");

  doc.end();
}
