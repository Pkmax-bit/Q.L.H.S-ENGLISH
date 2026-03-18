const XLSX = require('xlsx');

const exportToExcel = (data, sheetName = 'Sheet1', columns = null) => {
  let exportData = data;

  if (columns) {
    exportData = data.map(row => {
      const filtered = {};
      columns.forEach(col => {
        filtered[col.header || col.key] = row[col.key];
      });
      return filtered;
    });
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  if (columns) {
    const colWidths = columns.map(col => ({ wch: col.width || 20 }));
    worksheet['!cols'] = colWidths;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
};

module.exports = { exportToExcel };
