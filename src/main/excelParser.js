const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Flexible column header aliases
const COLUMN_ALIASES = {
  symbolNo: ['symbol no', 'symbol no.', 'symbol number', 'sym no', 'sym no.'],
  studentName: ['student name', "student's full name", 'student full name', 'name', 'full name'],
  gender: ['gender', 'sex'],
  fatherName: ['father name', "father's name", 'father'],
  dob: ['dob', 'date of birth', "student's date of birth", 'birth date'],
  schoolName: ['school name', 'name of the school', 'school'],
  address: ['address', 'school address', 'address of the school'],
  phone: ['phone', 'tel', 'telephone', 'phone no', 'phone number', 'contact'],
  email: ['email', 'e-mail', 'email address'],
  optionalI: ['optional subject i', 'optional i', 'optional subject 1', 'optional 1', 'opt i', 'opt 1'],
  optionalII: ['optional subject ii', 'optional ii', 'optional subject 2', 'optional 2', 'opt ii', 'opt 2'],
  photo: ['photo', 'photo path', 'picture', 'image', 'student photo', 'student image', 'photo file', 'photograph'],
};

function matchColumn(header) {
  const normalized = String(header).toLowerCase().trim();
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalized)) return key;
  }
  return null;
}

async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  const excelDir = path.dirname(filePath);

  // Map header row to field names
  const headerRow = worksheet.getRow(1);
  const columnMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const field = matchColumn(cell.value);
    if (field) columnMap[colNumber] = field;
  });

  const students = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const student = {};
    for (const [colNumber, field] of Object.entries(columnMap)) {
      let value = row.getCell(parseInt(colNumber)).value;
      // Handle rich text cells
      if (value && typeof value === 'object' && value.richText) {
        value = value.richText.map(r => r.text).join('');
      }
      // Handle date objects
      if (value instanceof Date) {
        value = `${value.getFullYear()}/${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}`;
      }
      student[field] = value != null ? String(value) : '';
    }

    // Resolve photo path relative to excel file directory
    if (student.photo && student.photo.trim()) {
      const photoRaw = student.photo.trim().replace(/\\/g, '/');
      // Try multiple resolution strategies
      const candidates = [
        path.resolve(excelDir, photoRaw),
        path.resolve(excelDir, path.basename(photoRaw)),
        photoRaw, // absolute path as-is
      ];
      student.photoPath = candidates.find(p => fs.existsSync(p)) || '';
    } else {
      student.photoPath = '';
    }

    // Only add if there's at least a name or symbol number
    if (student.studentName || student.symbolNo) {
      students.push(student);
    }
  });

  return students;
}

module.exports = { parseExcel };
