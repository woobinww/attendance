// attendanceGenerator.js
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const csv = require('csv-parser');

async function loadEmployees(csvPath, department, targetYear, targetMonth) {
  return new Promise((resolve, reject) => {
    const employees = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const 입사일 = dayjs(row['입사일']);
        const 퇴사일 = row['퇴사일'] ? dayjs(row['퇴사일']) : null;
        const startOfMonth = dayjs(`${targetYear}-${targetMonth}-01`);
        const endOfMonth = startOfMonth.endOf('month');

        if (
          row['부서'] === department &&
          ['rd', 'rn', 'an'].includes(row['직종']) &&
          입사일.isBefore(endOfMonth.add(1, 'day')) &&
          (!퇴사일 || 퇴사일.isAfter(startOfMonth.subtract(1, 'day')))
        ) {
          employees.push({
            이름: row['이름'],
            부서: row['부서'],
            직종: row['직종'],
            입사일: 입사일.format('YYYY-MM-DD'),
          });
        }
      })
      .on('end', () => {
        const order = { rd: 1, rn: 2, an: 3 };
        employees.sort((a, b) => {
          if (order[a.직종] !== order[b.직종]) {
            return order[a.직종] - order[b.직종];
          }
          return a.입사일.localeCompare(b.입사일);
        });
        resolve(employees);
      })
      .on('error', reject);
  });
}

async function loadAttendance(csvPath) {
  return new Promise((resolve, reject) => {
    const data = {};
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const key = `${row.name}|${row.date}`;
        data[key] = row;
      })
      .on('end', () => resolve(data))
      .on('error', reject);
  });
}

function copyCellFormat(srcCell, destCell) {
  const { border, fill, alignment, numFmt, font } = srcCell.style || {};
  destCell.style = { font, border, fill, alignment, numFmt };
}

async function generateSheet({ templatePath, outputPath, csvPath, attendancePath, targetYear, targetMonth, department }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.getWorksheet('근무현황');
  if (!sheet) throw new Error('can not find worksheet');

  sheet.getCell('A1').value = `■ ${targetYear}년 ${targetMonth.toString().padStart(2, '0')}월 근무 현황 ■`;

  const employees = await loadEmployees(csvPath, department, targetYear, targetMonth);
  const startRow = 5;

  // 직원 수에 맞게 아래로 삽입
  const rowsPerEmployee = 4;
  const baseRow = 5;
  const akColIndex = 37; // A = 1, ... , A = 37
  const templateRows = [];

  // (employees.length - 1)명 만큼 4행 단위로 삽입
  for (let i = 1; i < employees.length; i++) {
    sheet.spliceRows(baseRow + i * rowsPerEmployee, 0, ...Array(rowsPerEmployee).fill([]));

    for (let r = 0; r < rowsPerEmployee; r++) {
      const srcRow = sheet.getRow(startRow + r);
      const destRow = sheet.getRow(startRow + i * rowsPerEmployee + r);

      for (let c = 1; c <= akColIndex; c++) {
        const srcCell = srcRow.getCell(c);
        const destCell = destRow.getCell(c);

        // 값 복사
        destCell.value = srcCell.value;
        // 서식 복사
        copyCellFormat(srcCell, destCell);
      }
    }
  }

  const startCol = 5;
  const totalDays = dayjs(`${targetYear}-${targetMonth}-01`).daysInMonth();
  const saturdayCols = [], sundayCols = [];
  for (let day = 1; day <= totalDays; day++) {
    const date = dayjs(`${targetYear}-${targetMonth}-${day}`);
    const col = startCol + day - 1;
    const dow = date.day();
    if (dow === 6) saturdayCols.push(col);
    if (dow === 0) sundayCols.push(col);
  }

  // 마지막열 수식 직접 입력
  for (let i = 0; i < employees.length; i++) {
    const baseRow = startRow + i * 4;

    sheet.getCell(`AJ${baseRow}`).value = { formula: `SUM(E${baseRow}:AI${baseRow})` };
    sheet.getCell(`AJ${baseRow + 1}`).value = { formula: `SUM(E${baseRow + 1}:AI${baseRow + 1})` };
    sheet.getCell(`AJ${baseRow + 2}`).value = { formula: `SUM(E${baseRow + 2}:AI${baseRow + 2})` };
    sheet.getCell(`AJ${baseRow + 3}`).value = { formula: `SUM(E${baseRow + 3}:AI${baseRow + 3})` };
    sheet.getCell(`AK${baseRow + 2}`).value = { formula: `SUM(AJ${baseRow + 1}:AJ${baseRow + 2})` };
  }

  const attendanceData = await loadAttendance(attendancePath);

  employees.forEach((emp, i) => {
    const baseRow = startRow + i * 4;
    sheet.getCell(`A${baseRow}`).value = i + 1;
    sheet.getCell(`B${baseRow}`).value = emp.이름;
    sheet.getCell(`C${baseRow}`).value = emp.입사일;
    sheet.getCell(`D${baseRow}`).value = '근태';
    sheet.getCell(`D${baseRow + 1}`).value = '연장';
    sheet.getCell(`D${baseRow + 2}`).value = '휴일';
    sheet.getCell(`D${baseRow + 3}`).value = '야간';

    for (let d = 1; d <= totalDays; d++) {
      const col = startCol + d - 1;
      const dateStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const key = `${emp.이름}|${dateStr}`;
      const record = attendanceData[key];
      if (!record) continue;

      if (record.off || record.flexOt) {
        const label = record.off === '오전반차' ? '4전반' :
                      record.off === '오후반차' ? '4후반' :
                      record.off === '연차' ? '연차' : '';
        if (label) sheet.getCell(baseRow, col).value = label;
      }
      if (record.ot) {
        const val = isNaN(record.ot) ? record.ot : parseFloat(record.ot);
        sheet.getCell(baseRow + 1, col).value = val;
      }
      if (record.holidayOt) {
        const val = isNaN(record.holidayOt) ? record.holidayOt : parseFloat(record.holidayOt);
        sheet.getCell(baseRow + 2, col).value = val;
      }
      if (record.nightOt) {
        const val = isNaN(record.nightOt) ? record.nightOt : parseFloat(record.nightOt);
        sheet.getCell(baseRow + 3, col).value = val;
      }
      if (record.flexOt) {
        const val = isNaN(record.flexOt) ? record.flexOt : parseFloat(record.flexOt);
        sheet.getCell(baseRow, col).value = val;
      }
      if (record.note) sheet.getCell(baseRow, col).note = record.note;
    }
  });


  const fillWhite = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  const fillGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } };
  const lastRow = startRow + employees.length * 4 - 1;

  // 주말 날짜 셀만 회색으로 덮어쓰기
  for (let day = 1; day <= totalDays; day++) {
    const date = dayjs(`${targetYear}-${targetMonth}-${day}`);
    const dow = date.day(); // 일: 0, 토: 6
    if (dow === 0 || dow === 6) {
      const col = startCol + day - 1;
      for (let row = startRow; row <= lastRow; row++) {
        const cell = sheet.getCell(row, col);
        const { border, font, alignment, numFmt } = cell.style || {};
        cell.style = {};
        cell.style = {
          border,
          font,
          alignment,
          numFmt,
          fill: fillGray
        };
      }
    }
  }
  await workbook.xlsx.writeFile(outputPath);
  console.log('📄 근무 현황표 생성 완료:', outputPath);
}

module.exports = { generateSheet };
