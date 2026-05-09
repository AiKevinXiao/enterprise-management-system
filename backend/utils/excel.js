/**
 * Excel 工具函数
 * 封装 xlsx，提供统一的导出/导入能力
 */
const XLSX = require('xlsx');

/**
 * 将数据数组转换为 Excel Buffer
 * @param {Array} data 数据数组，每项为对象
 * @param {string} sheetName 工作表名
 * @returns {Buffer} Excel 文件 Buffer
 */
function exportToExcel(data, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 解析 Excel 文件 Buffer，返回 JS 对象数组
 * @param {Buffer} buffer
 * @returns {Array} 对象数组
 */
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: null });
}

/**
 * 通用列宽自动适应
 * @param {object} worksheet
 */
function autoFitColumns(worksheet) {
  // xlsx 没有内置 autoFit，这里设置固定合理宽度
  const colWidths = { wch: 18 };
  worksheet['!cols'] = [
    { wch: 12 }, // 第1列
    { wch: 15 }, // 第2列
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
  ];
}

module.exports = { exportToExcel, parseExcel, autoFitColumns };
