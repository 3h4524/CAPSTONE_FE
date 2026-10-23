import type { Worksheet } from "exceljs";

import type { ReportColumnKind, ReportSection } from "@/helpers/revenue-report";

const HEADER_FILL = "FFF1F5F9"; // slate-100
const TITLE_COLOR = "FF0F172A"; // slate-900

const numberFormat = (kind: ReportColumnKind, currency: "VND" | "USD"): string | undefined => {
  switch (kind) {
    case "money":
      return currency === "VND" ? '#,##0" ₫"' : '"$"#,##0.00';
    case "percent":
      return '0.0"%"';
    case "number":
      return "#,##0.##";
    default:
      return undefined;
  }
};

/**
 * Writes the report as an .xlsx workbook: one worksheet per `sheet` name, sections on the same
 * sheet stacked with a blank row between them. exceljs is loaded on demand so it never weighs on
 * the dashboard's initial bundle.
 */
export async function toXlsx(sections: ReportSection[], currency: "VND" | "USD"): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "APCS Admin";
  workbook.created = new Date();

  const sheets = new Map<string, Worksheet>();
  const widths = new Map<string, number[]>();

  for (const section of sections) {
    let sheet = sheets.get(section.sheet);
    if (!sheet) {
      sheet = workbook.addWorksheet(section.sheet);
      sheets.set(section.sheet, sheet);
      widths.set(section.sheet, []);
    } else {
      sheet.addRow([]);
    }
    const colWidths = widths.get(section.sheet)!;

    const titleRow = sheet.addRow([section.title]);
    titleRow.font = { bold: true, size: 13, color: { argb: TITLE_COLOR } };

    const headerRow = sheet.addRow(section.columns.map((c) => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
    });
    // A sheet holding a single table keeps its header visible while scrolling.
    if (sections.filter((s) => s.sheet === section.sheet).length === 1) {
      sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
    }

    for (const values of section.rows) {
      const row = sheet.addRow(values.map((v) => (v === null ? null : v)));
      section.columns.forEach((column, i) => {
        const format = numberFormat(column.kind, currency);
        if (format) row.getCell(i + 1).numFmt = format;
      });
    }

    section.columns.forEach((column, i) => {
      const longest = Math.max(
        column.header.length,
        ...section.rows.map((r) => (r[i] === null ? 0 : String(r[i]).length + (column.kind === "money" ? 4 : 0)))
      );
      colWidths[i] = Math.max(colWidths[i] ?? 10, Math.min(longest + 2, 60));
    });
  }

  for (const [name, sheet] of sheets) {
    widths.get(name)!.forEach((width, i) => {
      sheet.getColumn(i + 1).width = width;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
