import * as XLSX from "xlsx";

export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function toMatrix<T>(rows: T[], columns: ExportColumn<T>[]) {
  const head = columns.map((c) => c.header);
  const body = rows.map((r) => columns.map((c) => {
    const v = c.accessor(r);
    return v === null || v === undefined ? "" : v;
  }));
  return [head, ...body];
}

export function exportToCSV<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  const matrix = toMatrix(rows, columns);
  const csv = matrix
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes("\n") || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportToExcel<T>(rows: T[], columns: ExportColumn<T>[], filename: string, sheetName = "Sheet1") {
  const matrix = toMatrix(rows, columns);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function profileCompletion(p: {
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  degree?: string | null;
  german_level?: string | null;
  date_of_birth?: string | null;
}): number {
  const fields = [
    p.full_name, p.email, p.phone_number, p.country, p.city, p.address,
    p.degree, p.german_level, p.date_of_birth,
  ];
  const filled = fields.filter((v) => v && String(v).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

