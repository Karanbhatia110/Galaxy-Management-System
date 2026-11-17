/**
 * Galaxy Construction Management System — Report Generator
 *
 * Provides PDF and Excel report generation with Galaxy branding.
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ─── Branding Constants ─────────────────────────────────────────────
const BRAND = {
  name: 'Galaxy Construction',
  tagline: 'Building the Future',
  primaryColor: [108, 99, 255],    // #6C63FF
  secondaryColor: [0, 212, 170],   // #00D4AA
  darkBg: [10, 14, 26],            // #0A0E1A
  headerBg: [17, 24, 39],          // #111827
  textLight: [241, 245, 249],      // #F1F5F9
  textMuted: [148, 163, 184],      // #94A3B8
};

/**
 * Generate a branded PDF report using jsPDF + autoTable.
 *
 * @param {string} title - Report title.
 * @param {string[]} headers - Array of column header strings.
 * @param {Array<Array<string|number>>} data - 2D array of row data.
 * @param {string} filename - Output filename (without .pdf extension).
 */
export function generatePDF(title, headers, data, filename = 'report') {
  const doc = new jsPDF({
    orientation: headers.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Galaxy Brand Header ───────────────────────────────────────────
  // Dark background strip
  doc.setFillColor(...BRAND.darkBg);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Gradient accent line
  doc.setFillColor(...BRAND.primaryColor);
  doc.rect(0, 35, pageWidth, 1.5, 'F');

  // Company name
  doc.setTextColor(...BRAND.textLight);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND.name, 14, 16);

  // Tagline
  doc.setTextColor(...BRAND.textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND.tagline, 14, 22);

  // Report title
  doc.setTextColor(...BRAND.primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 30);

  // Generated date (right-aligned)
  doc.setTextColor(...BRAND.textMuted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dateStr = `Generated: ${new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  doc.text(dateStr, pageWidth - 14, 30, { align: 'right' });

  // ── Data Table ────────────────────────────────────────────────────
  doc.autoTable({
    head: [headers],
    body: data,
    startY: 42,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 4,
      lineColor: [30, 41, 59],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: BRAND.primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    margin: { top: 42, right: 14, bottom: 25, left: 14 },
    didDrawPage: (hookData) => {
      // Footer on every page
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();

      // Footer line
      doc.setDrawColor(...BRAND.primaryColor);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

      // Footer text
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.textMuted);
      doc.text(
        `${BRAND.name} — Confidential`,
        14,
        pageHeight - 10
      );
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth - 14,
        pageHeight - 10,
        { align: 'right' }
      );
    },
  });

  // Save the file
  const safeName = filename.replace(/\.pdf$/i, '');
  doc.save(`${safeName}.pdf`);
}

/**
 * Generate a branded Excel report using ExcelJS + file-saver.
 *
 * @param {string} title - Report title.
 * @param {string[]} headers - Array of column header strings.
 * @param {Array<Array<string|number>>} data - 2D array of row data.
 * @param {string} filename - Output filename (without .xlsx extension).
 */
export async function generateExcel(title, headers, data, filename = 'report') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = BRAND.name;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title || 'Report', {
    properties: { defaultRowHeight: 22 },
    views: [{ showGridLines: false }],
  });

  const colCount = headers.length;

  // ── Galaxy Brand Header ───────────────────────────────────────────
  // Row 1: Company name (merged across all columns)
  worksheet.mergeCells(1, 1, 1, colCount);
  const brandRow = worksheet.getRow(1);
  brandRow.height = 36;
  const brandCell = worksheet.getCell(1, 1);
  brandCell.value = BRAND.name;
  brandCell.font = {
    name: 'Calibri',
    size: 20,
    bold: true,
    color: { argb: 'FF6C63FF' },
  };
  brandCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0A0E1A' },
  };
  brandCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 2: Tagline
  worksheet.mergeCells(2, 1, 2, colCount);
  const taglineRow = worksheet.getRow(2);
  taglineRow.height = 20;
  const taglineCell = worksheet.getCell(2, 1);
  taglineCell.value = BRAND.tagline;
  taglineCell.font = {
    name: 'Calibri',
    size: 10,
    italic: true,
    color: { argb: 'FF94A3B8' },
  };
  taglineCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0A0E1A' },
  };
  taglineCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 3: Report title + generated date
  worksheet.mergeCells(3, 1, 3, Math.max(1, colCount - 2));
  const titleRow = worksheet.getRow(3);
  titleRow.height = 28;
  const titleCell = worksheet.getCell(3, 1);
  titleCell.value = title;
  titleCell.font = {
    name: 'Calibri',
    size: 14,
    bold: true,
    color: { argb: 'FFF1F5F9' },
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF111827' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Date cell
  if (colCount > 2) {
    worksheet.mergeCells(3, colCount - 1, 3, colCount);
  }
  const dateCell = worksheet.getCell(3, colCount > 2 ? colCount - 1 : colCount);
  dateCell.value = `Generated: ${new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
  dateCell.font = {
    name: 'Calibri',
    size: 9,
    color: { argb: 'FF94A3B8' },
  };
  dateCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF111827' },
  };
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Fill remaining cells in row 3 with dark bg
  for (let c = 1; c <= colCount; c++) {
    const cell = worksheet.getCell(3, c);
    if (!cell.fill || !cell.fill.fgColor) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF111827' },
      };
    }
  }

  // Row 4: Empty separator
  worksheet.getRow(4).height = 6;

  // ── Column Headers (Row 5) ────────────────────────────────────────
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6C63FF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF4A42CC' } },
    };
  });

  // ── Data Rows ─────────────────────────────────────────────────────
  data.forEach((rowData, index) => {
    const row = worksheet.addRow(rowData);
    row.height = 22;
    row.eachCell((cell) => {
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF334155' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alternate row shading
      if (index % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
    });
  });

  // ── Auto-fit column widths ────────────────────────────────────────
  worksheet.columns.forEach((column, i) => {
    const headerLen = String(headers[i] || '').length;
    let maxLen = headerLen;

    data.forEach((row) => {
      const cellLen = String(row[i] ?? '').length;
      if (cellLen > maxLen) maxLen = cellLen;
    });

    column.width = Math.min(Math.max(maxLen + 4, 12), 50);
  });

  // ── Footer Row ────────────────────────────────────────────────────
  const footerRowNum = worksheet.lastRow.number + 2;
  worksheet.mergeCells(footerRowNum, 1, footerRowNum, colCount);
  const footerCell = worksheet.getCell(footerRowNum, 1);
  footerCell.value = `${BRAND.name} — Confidential | Generated on ${new Date().toLocaleDateString('en-IN')}`;
  footerCell.font = {
    name: 'Calibri',
    size: 8,
    italic: true,
    color: { argb: 'FF94A3B8' },
  };
  footerCell.alignment = { horizontal: 'center' };

  // ── Export ─────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeName = filename.replace(/\.xlsx$/i, '');
  saveAs(blob, `${safeName}.xlsx`);
}
