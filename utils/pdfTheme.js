// utils/pdfTheme.js
// Shared look for all PDFKit summary reports (ES module).

export const THEME = {
  green: "#03381E",
  tint: "#E8F5E9",
  gold: "#C8A24A",
  red: "#CE1126",
  flagGreen: "#006B3F",
  ink: "#111827",
  muted: "#6B7280",
  line: "#D1D5DB",
};

export const MARGIN = 40;

// 12,020,998.64 ; zero / empty -> "-"
export const fmt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0
    ? n.toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "-";
};

export function drawWatermark(doc, logoPath) {
  if (!logoPath) return;
  try {
    const s = 300;
    doc.save().opacity(0.04);
    doc.image(logoPath, (doc.page.width - s) / 2, (doc.page.height - s) / 2, {
      fit: [s, s],
      align: "center",
      valign: "center",
    });
    doc.restore();
  } catch (e) {
    console.log("Watermark image error:", e.message);
  }
}

// Draws the green title band + flag stripe. Returns the y where the table should start.
export function drawReportHeader(doc, { title, lines = [], logoPath }) {
  const pw = doc.page.width;
  const tile = 64;
  const textW = pw - MARGIN * 2 - tile - 16;

  doc.font("Helvetica-Bold").fontSize(15);
  const titleH = doc.heightOfString(title, { width: textW });
  const bandH = Math.max(84, 18 + titleH + 6 + lines.length * 12 + 14);

  doc.rect(0, 0, pw, bandH).fill(THEME.green);
  [THEME.red, THEME.gold, THEME.flagGreen].forEach((c, i) =>
    doc.rect((pw / 3) * i, bandH, pw / 3, 4).fill(c),
  );

  const tx = pw - MARGIN - tile;
  const ty = (bandH - tile) / 2;
  doc.roundedRect(tx, ty, tile, tile, 6).fill("#FFFFFF");
  if (logoPath) {
    try {
      doc.image(logoPath, tx + 4, ty + 4, {
        fit: [tile - 8, tile - 8],
        align: "center",
        valign: "center",
      });
    } catch (e) {
      console.log("Logo error:", e.message);
    }
  }

  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(title, MARGIN, 18, { width: textW });

  let y = 18 + titleH + 6;
  doc.font("Helvetica").fontSize(9).fillColor("#D1FAE5");
  lines.forEach((l) => {
    doc.text(l, MARGIN, y, { width: textW });
    y += 12;
  });

  doc.fillColor(THEME.ink);
  return bandH + 4 + 16;
}

// cols: [{ label, sub?, w }]. Header height is measured, so text never clips.
export function drawTableHeader(doc, y, cols) {
  const pad = 5;

  const m = cols.map((c) => {
    const inner = c.w - pad * 2;
    const longest = c.label
      .split(/\s+/)
      .reduce((a, b) => (b.length > a.length ? b : a), "");
    let size = 8.5;
    doc.font("Helvetica-Bold");
    while (size > 6 && doc.fontSize(size).widthOfString(longest) > inner) {
      size -= 0.25;
    }
    doc.font("Helvetica-Bold").fontSize(size);
    const h = doc.heightOfString(c.label, { width: inner, align: "center" });
    let subH = 0;
    if (c.sub) {
      doc.font("Helvetica").fontSize(7);
      subH = doc.heightOfString(c.sub, { width: inner }) + 2;
    }
    return { size, h, subH };
  });

  const H = Math.max(...m.map((k) => k.h + k.subH)) + 14;

  let x = MARGIN;
  cols.forEach((c, i) => {
    const inner = c.w - pad * 2;
    doc.rect(x, y, c.w, H).fillAndStroke(THEME.green, "#0B4F2C");
    const ty = y + (H - (m[i].h + m[i].subH)) / 2;
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(m[i].size)
      .text(c.label, x + pad, ty, { width: inner, align: "center" });
    if (c.sub) {
      doc
        .fillColor("#A7F3D0")
        .font("Helvetica")
        .fontSize(7)
        .text(c.sub, x + pad, ty + m[i].h + 2, {
          width: inner,
          align: "center",
        });
    }
    x += c.w;
  });

  doc.fillColor(THEME.ink);
  return y + H;
}

// Shrink until the longest word fits, then measure the wrapped block.
// PDFKit wraps on spaces even when lineBreak is false, so width alone is not enough.
function measureFittedText(doc, text, inner, font, startSize, minSize = 6) {
  const value = String(text ?? "");
  const longest = value
    .split(/\s+/)
    .reduce((a, b) => (b.length > a.length ? b : a), "");

  let size = startSize;
  doc.font(font);
  while (size > minSize && doc.fontSize(size).widthOfString(longest) > inner) {
    size -= 0.25;
  }

  doc.font(font).fontSize(size);
  const h = value
    ? doc.heightOfString(value, { width: Math.max(inner, 1), align: "center" })
    : size;
  return { size, h };
}

function paintFittedText(doc, text, x, y, cellH, inner, metrics, color) {
  const cursorY = doc.y;
  doc
    .fillColor(color)
    .font(metrics.font)
    .fontSize(metrics.size)
    .text(String(text ?? ""), x, y + (cellH - metrics.h) / 2, {
      width: inner,
      align: "center",
      lineBreak: true,
      ellipsis: false,
    });
  doc.y = cursorY;
}

// Two-row header. firstCol spans both rows. Each group is a merged top cell
// over one sub-header cell per column. Body rows use the flattened columns:
// [firstCol, ...groups.flatMap((g) => g.cols)].
export function drawGroupedTableHeader(doc, y, firstCol, groups) {
  const pad = 5;
  const labelFont = "Helvetica-Bold";
  const subFont = "Helvetica";

  const firstInner = Math.max(firstCol.w - pad * 2, 1);
  const firstMetrics = {
    ...measureFittedText(doc, firstCol.label, firstInner, labelFont, 8.5),
    font: labelFont,
  };

  const groupMetrics = groups.map((g) => {
    const w = g.cols.reduce((sum, c) => sum + c.w, 0);
    const inner = Math.max(w - pad * 2, 1);
    return {
      ...measureFittedText(doc, g.label, inner, labelFont, 8.5),
      font: labelFont,
      w,
      inner,
    };
  });

  const subMetrics = groups.map((g) =>
    g.cols.map((c) => {
      const inner = Math.max(c.w - pad * 2, 1);
      return {
        ...measureFittedText(doc, c.label, inner, subFont, 7),
        font: subFont,
        inner,
      };
    }),
  );

  const topContent = groupMetrics.length
    ? Math.max(...groupMetrics.map((m) => m.h))
    : 0;
  const subHeights = subMetrics.flat().map((m) => m.h);
  const botContent = subHeights.length ? Math.max(...subHeights) : 0;

  let topH = groupMetrics.length ? topContent + 14 : 0;
  let botH = subHeights.length ? botContent + 14 : 0;
  if (topH + botH < firstMetrics.h + 14) {
    const extra = firstMetrics.h + 14 - (topH + botH);
    if (botH > 0) botH += extra;
    else topH += extra;
  }
  const H = topH + botH;

  doc.lineWidth(1);
  doc.rect(MARGIN, y, firstCol.w, H).fillAndStroke(THEME.green, "#0B4F2C");
  paintFittedText(
    doc,
    firstCol.label,
    MARGIN + pad,
    y,
    H,
    firstInner,
    firstMetrics,
    "#FFFFFF",
  );

  let x = MARGIN + firstCol.w;
  groups.forEach((g, gi) => {
    const gm = groupMetrics[gi];
    doc.rect(x, y, gm.w, topH).fillAndStroke(THEME.green, "#0B4F2C");
    paintFittedText(
      doc,
      g.label,
      x + pad,
      y,
      topH,
      gm.inner,
      gm,
      "#FFFFFF",
    );

    let sx = x;
    g.cols.forEach((c, ci) => {
      const sm = subMetrics[gi][ci];
      doc.rect(sx, y + topH, c.w, botH).fillAndStroke(THEME.green, "#0B4F2C");
      paintFittedText(
        doc,
        c.label,
        sx + pad,
        y + topH,
        botH,
        sm.inner,
        sm,
        "#A7F3D0",
      );
      sx += c.w;
    });
    x += gm.w;
  });

  doc.fillColor(THEME.ink);
  return y + H;
}

// Opt-in. Default drawRow height stays `h` so existing reports are unchanged.
// When wrapLabel is set, the first cell wraps and the row grows to fit it.
function labelMetrics(doc, cols, values, { font, size, h, indent }) {
  const pad = 6 + indent;
  const inner = cols[0].w - pad - 6;
  const text = String(values?.[0] ?? "");
  const longest = text
    .split(/\s+/)
    .reduce((a, b) => (b.length > a.length ? b : a), "");

  // Shrink only until the longest word fits, then wrap the rest. No ellipsis.
  let drawSize = size;
  doc.font(font);
  while (drawSize > 6 && doc.fontSize(drawSize).widthOfString(longest) > inner) {
    drawSize -= 0.25;
  }

  doc.font(font).fontSize(drawSize);
  const textH = doc.heightOfString(text, { width: inner, align: "left" });
  return {
    pad,
    inner,
    drawSize,
    textH,
    rowH: Math.max(h, Math.ceil(textH + 8)),
  };
}

export function measureRowHeight(
  doc,
  cols,
  values,
  { font = "Helvetica", size = 9, h = 22, indent = 0, wrapLabel = false } = {},
) {
  if (!wrapLabel) return h;
  return labelMetrics(doc, cols, values, { font, size, h, indent }).rowH;
}

export function drawRow(
  doc,
  y,
  cols,
  values,
  {
    fill,
    font = "Helvetica",
    size = 9,
    color = THEME.ink,
    h = 22,
    indent = 0,
    wrapLabel = false,
    align,
  } = {},
) {
  const metrics = wrapLabel
    ? labelMetrics(doc, cols, values, { font, size, h, indent })
    : null;
  const rowH = metrics ? metrics.rowH : h;

  let x = MARGIN;
  cols.forEach((c, i) => {
    if (fill) doc.rect(x, y, c.w, rowH).fill(fill);
    doc.rect(x, y, c.w, rowH).lineWidth(0.5).stroke(THEME.line);

    const v = String(values[i] ?? "");
    const pad = 6 + (i === 0 ? indent : 0);
    const inner = c.w - pad - 6;

    if (metrics && i === 0) {
      const cursorY = doc.y;
      doc
        .fillColor(color)
        .font(font)
        .fontSize(metrics.drawSize)
        .text(v, x + metrics.pad, y + (rowH - metrics.textH) / 2 - 1, {
          width: metrics.inner,
          height: metrics.textH + 2,
          align: "left",
          lineBreak: true,
          ellipsis: false,
        });
      doc.y = cursorY;
    } else {
      // PDFKit still wraps when `width` is set, even with lineBreak: false.
      // Shrink so the value stays on one line inside the cell.
      let drawSize = size;
      doc.font(font);
      while (drawSize > 6 && doc.fontSize(drawSize).widthOfString(v) > inner) {
        drawSize -= 0.25;
      }
      doc
        .fillColor(v === "-" && i > 0 && !fill ? "#9CA3AF" : color)
        .font(font)
        .fontSize(drawSize)
        .text(v, x + pad, y + (rowH - drawSize) / 2 - 1, {
          width: inner,
          height: rowH - 2,
          align: align ?? (i === 0 ? "left" : "right"),
          lineBreak: false,
          ellipsis: true,
        });
    }
    x += c.w;
  });

  doc.fillColor(THEME.ink);
  return y + rowH;
}

// If the next block won't fit, start a new page and let onNewPage redraw the header.
export function ensureSpace(doc, y, needed, onNewPage) {
  if (y + needed > doc.page.height - 50) {
    doc.addPage();
    return onNewPage();
  }
  return y;
}

// Call once before doc.end(). The document must be created with bufferPages: true.
export function addFooters(doc, label) {
  const { start, count } = doc.bufferedPageRange();
  const cw = doc.page.width - MARGIN * 2;
  const generated = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  for (let i = 0; i < count; i++) {
    doc.switchToPage(start + i);
    const prev = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // stops PDFKit adding a blank page
    const y = doc.page.height - 30;

    doc
      .moveTo(MARGIN, y - 6)
      .lineTo(doc.page.width - MARGIN, y - 6)
      .lineWidth(0.5)
      .strokeColor(THEME.line)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(THEME.muted)
      .text(`${label}  |  Generated ${generated}`, MARGIN, y, {
        width: cw * 0.75,
        lineBreak: false,
      })
      .text(`Page ${i + 1} of ${count}`, MARGIN, y, {
        width: cw,
        align: "right",
        lineBreak: false,
      });

    doc.page.margins.bottom = prev;
  }
}
