/**
 * Utility functions for generating safe, standard-compliant CSV files.
 * - Adds UTF-8 BOM (\uFEFF) to ensure non-ASCII (e.g., Bengali) text displays correctly in Excel.
 * - Sanitizes cells to prevent CSV Formula Injection warnings in spreadsheet software.
 * - Correctly quotes and escapes commas, double quotes, and line breaks.
 */

export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);

  // Prevent Excel / LibreOffice CSV injection security warnings
  // If text begins with dangerous formula characters (=, +, -, @, tab, carriage return)
  // and is not a valid plain number:
  if (/^[=+\-@\t\r]/.test(str)) {
    const isNumber = !isNaN(Number(str)) && str.trim() !== "";
    if (!isNumber) {
      str = `'${str}`;
    }
  }

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');

  // Enclose in quotes if the string contains quotes, commas, newlines, or begins with single quote
  if (/[",\n\r]/.test(escaped) || str.startsWith("'")) {
    return `"${escaped}"`;
  }
  return escaped;
}

/**
 * Converts an array of objects into a safe CSV string with UTF-8 BOM.
 */
export function jsonToCsv(data: Record<string, any>[], explicitHeaders?: string[]): string {
  if (!data || data.length === 0) {
    if (explicitHeaders && explicitHeaders.length > 0) {
      return "\uFEFF" + explicitHeaders.map(h => sanitizeCsvCell(h)).join(",");
    }
    return "\uFEFF";
  }

  const headers = explicitHeaders || Object.keys(data[0]);
  const headerLine = headers.map(h => sanitizeCsvCell(h)).join(",");

  const rowLines = data.map(row => {
    return headers.map(header => sanitizeCsvCell(row[header])).join(",");
  });

  return "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
}

/**
 * Converts a 2D array (rows & columns) into a safe CSV string with UTF-8 BOM.
 */
export function arrayToCsv(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(h => sanitizeCsvCell(h)).join(",");
  const rowLines = rows.map(row => row.map(cell => sanitizeCsvCell(cell)).join(","));

  return "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
}

/**
 * Triggers a client-side safe CSV file download.
 */
export function downloadCsv(csvContent: string, fileName: string): void {
  const cleanFileName = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", cleanFileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Directly exports an array of objects to a safe CSV file download.
 */
export function exportJsonToCsvFile(
  data: Record<string, any>[],
  fileName: string,
  explicitHeaders?: string[]
): void {
  const csv = jsonToCsv(data, explicitHeaders);
  downloadCsv(csv, fileName);
}
