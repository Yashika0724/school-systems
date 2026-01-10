// CSV Export Utilities

export function exportToCSV(data: Record<string, any>[], filename: string, headers?: Record<string, string>) {
  if (data.length === 0) return;

  // Use custom headers if provided, otherwise use keys from first object
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers 
    ? Object.values(headers).join(',') 
    : keys.join(',');

  const csvRows = data.map(row => 
    keys.map(key => {
      const value = row[key];
      // Escape quotes and wrap in quotes if contains comma or newline
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  const csvContent = [headerRow, ...csvRows].join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatCurrencyForExport(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  return amount.toFixed(2);
}
