const { BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

function imageToBase64(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  const data = fs.readFileSync(filePath);
  // Detect actual format from magic bytes
  let mime = 'png';
  if (data[0] === 0xFF && data[1] === 0xD8) mime = 'jpeg';
  else if (data[0] === 0x89 && data[1] === 0x50) mime = 'png';
  else if (data[0] === 0x47 && data[1] === 0x49) mime = 'gif';
  return `data:image/${mime};base64,${data.toString('base64')}`;
}

function fillTemplate(html, student) {
  let result = html;
  const fields = {
    '{{symbolNo}}': student.symbolNo || '',
    '{{studentName}}': student.studentName || '',
    '{{gender}}': student.gender || '',
    '{{fatherName}}': student.fatherName || '',
    '{{dob}}': student.dob || '',
    '{{schoolName}}': student.schoolName || '',
    '{{address}}': student.address || '',
    '{{phone}}': student.phone || '',
    '{{email}}': student.email || '',
    '{{optionalI}}': student.optionalI || '',
    '{{optionalII}}': student.optionalII || '',
  };

  for (const [placeholder, value] of Object.entries(fields)) {
    result = result.split(placeholder).join(value);
  }

  // Handle photo — prefer embedded base64, fall back to file path
  const photoBase64 = student.photoBase64 || imageToBase64(student.photoPath);
  if (photoBase64) {
    result = result.split('{{photoSrc}}').join(photoBase64);
    result = result.split('{{photoDisplay}}').join('block');
    result = result.split('{{placeholderDisplay}}').join('none');
  } else {
    result = result.split('{{photoSrc}}').join('');
    result = result.split('{{photoDisplay}}').join('none');
    result = result.split('{{placeholderDisplay}}').join('flex');
  }

  return result;
}

async function generatePDF(students, type, mainWindow) {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const printCss = fs.readFileSync(path.join(templatesDir, 'print.css'), 'utf-8');

  let applicationTemplate = '';
  let admitCardTemplate = '';

  if (type === 'application' || type === 'combined') {
    applicationTemplate = fs.readFileSync(path.join(templatesDir, 'applicationForm.html'), 'utf-8');
  }
  if (type === 'admitcard' || type === 'combined') {
    admitCardTemplate = fs.readFileSync(path.join(templatesDir, 'admitCard.html'), 'utf-8');
  }

  // Embed logos as base64
  const logoPabson = imageToBase64(path.join(__dirname, '..', '..', 'assets', 'logo-pabson.png'));
  const logoNpabson = imageToBase64(path.join(__dirname, '..', '..', 'assets', 'logo-npabson.png'));

  function applyLogos(html) {
    return html.split('{{logoPabson}}').join(logoPabson).split('{{logoNpabson}}').join(logoNpabson);
  }

  // Build pages — each page is a full A4 page
  const pages = [];
  for (const student of students) {
    if (type === 'combined') {
      // Both application form and admit card on ONE page
      const appHtml = applyLogos(fillTemplate(applicationTemplate, student));
      const admitHtml = applyLogos(fillTemplate(admitCardTemplate, student));
      pages.push(`<div class="page">
        ${appHtml}
        <hr class="dashed-separator">
        ${admitHtml}
      </div>`);
    } else if (type === 'application') {
      const appHtml = applyLogos(fillTemplate(applicationTemplate, student));
      pages.push(`<div class="page">${appHtml}</div>`);
    } else if (type === 'admitcard') {
      const admitHtml = applyLogos(fillTemplate(admitCardTemplate, student));
      pages.push(`<div class="page">${admitHtml}</div>`);
    }
  }

  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${printCss}</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;

  // Save dialog
  const typeLabel = type === 'application' ? 'Application Forms' :
                    type === 'admitcard' ? 'Admit Cards' : 'Application Forms & Admit Cards';
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${typeLabel}`,
    defaultPath: `${typeLabel.replace(/ /g, '_')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  // Create hidden window for PDF rendering
  const hiddenWin = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: { offscreen: true },
  });

  // Write HTML to temp file to avoid data URL length limits
  const tmpFile = path.join(os.tmpdir(), `examform-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, fullHTML, 'utf-8');

  try {
    await hiddenWin.loadFile(tmpFile);

    // Wait for images to load
    await hiddenWin.webContents.executeJavaScript(`
      new Promise(resolve => {
        const images = document.querySelectorAll('img');
        if (images.length === 0) return resolve();
        let loaded = 0;
        images.forEach(img => {
          if (img.complete) { loaded++; if (loaded === images.length) resolve(); }
          else {
            img.onload = img.onerror = () => { loaded++; if (loaded === images.length) resolve(); };
          }
        });
      })
    `);

    const pdfBuffer = await hiddenWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    fs.writeFileSync(filePath, pdfBuffer);
    return { success: true, filePath };
  } finally {
    hiddenWin.destroy();
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

module.exports = { generatePDF };
