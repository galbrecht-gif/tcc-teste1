/**
 * Geração de relatórios em PDF e Excel.
 * As bibliotecas são carregadas sob demanda (import dinâmico) para não pesar o bundle
 * inicial nem executar no servidor.
 */

export type ReportColumn<T> = {
  header: string;
  value: (row: T) => string | number;
  width?: number;
};

function timestamp() {
  return new Date().toLocaleString("pt-BR");
}

export async function exportToPDF<T>({
  title,
  subtitle,
  columns,
  rows,
  filename,
}: {
  title: string;
  subtitle?: string;
  columns: ReportColumn<T>[];
  rows: T[];
  filename: string;
}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${subtitle ? subtitle + " — " : ""}Emitido em ${timestamp()}`, 14, 24);
  doc.text(`Total de registros: ${rows.length}`, 14, 29);

  autoTable(doc, {
    startY: 34,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(c.value(row) ?? ""))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [48, 66, 96], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

export async function exportToExcel<T>({
  columns,
  rows,
  filename,
  sheetName = "Relatório",
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  filename: string;
  sheetName?: string;
}) {
  const XLSX = await import("xlsx");
  const data = rows.map((row) => {
    const obj: Record<string, string | number> = {};
    columns.forEach((c) => {
      obj[c.header] = c.value(row);
    });
    return obj;
  });
  const sheet = XLSX.utils.json_to_sheet(data);
  sheet["!cols"] = columns.map((c) => ({ wch: c.width ?? Math.max(12, c.header.length + 4) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 30));
  XLSX.writeFile(book, `${filename}.xlsx`);
}
