let students = [];
let selectedIndices = new Set();

const uploadScreen = document.getElementById('upload-screen');
const previewScreen = document.getElementById('preview-screen');
const btnUpload = document.getElementById('btn-upload');
const btnBack = document.getElementById('btn-back');
const uploadError = document.getElementById('upload-error');
const fileInfo = document.getElementById('file-info');
const tableBody = document.getElementById('student-table-body');
const selectAllCheckbox = document.getElementById('select-all');
const selectedCount = document.getElementById('selected-count');
const btnGenApp = document.getElementById('btn-gen-app');
const btnGenAdmit = document.getElementById('btn-gen-admit');
const btnGenCombined = document.getElementById('btn-gen-combined');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'success', filePath = null) {
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
  const toast = document.createElement('div');
  toast.className = `toast ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg mb-2 flex items-center gap-3`;
  toast.innerHTML = `<span>${message}</span>`;
  if (filePath) {
    const btn = document.createElement('button');
    btn.textContent = 'Open Folder';
    btn.className = 'bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs font-semibold cursor-pointer';
    btn.onclick = () => window.api.openPath(filePath);
    toast.appendChild(btn);
  }
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function updateSelectedCount() {
  selectedCount.textContent = selectedIndices.size;
  const disabled = selectedIndices.size === 0;
  btnGenApp.disabled = disabled;
  btnGenAdmit.disabled = disabled;
  btnGenCombined.disabled = disabled;
}

function renderTable() {
  tableBody.innerHTML = '';
  students.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    const checked = selectedIndices.has(i) ? 'checked' : '';
    tr.innerHTML = `
      <td class="p-3"><input type="checkbox" class="student-cb w-4 h-4 rounded" data-index="${i}" ${checked}></td>
      <td class="p-3 font-medium">${s.symbolNo || ''}</td>
      <td class="p-3">${s.studentName || ''}</td>
      <td class="p-3">${s.gender || ''}</td>
      <td class="p-3">${s.fatherName || ''}</td>
      <td class="p-3">${s.dob || ''}</td>
      <td class="p-3">${s.schoolName || ''}</td>
      <td class="p-3">${s.optionalI || ''}</td>
      <td class="p-3">${s.optionalII || ''}</td>
    `;
    tableBody.appendChild(tr);
  });
  updateSelectedCount();
}

// Upload button
btnUpload.addEventListener('click', async () => {
  uploadError.classList.add('hidden');
  const result = await window.api.openExcelFile();
  if (result.canceled) return;
  if (!result.success) {
    uploadError.textContent = result.error || 'Failed to parse file.';
    uploadError.classList.remove('hidden');
    return;
  }
  students = result.students;
  selectedIndices = new Set(students.map((_, i) => i));
  fileInfo.textContent = `${result.filePath} — ${students.length} student(s)`;
  renderTable();
  selectAllCheckbox.checked = true;
  uploadScreen.classList.add('hidden');
  previewScreen.classList.remove('hidden');
});

// Back button
btnBack.addEventListener('click', () => {
  students = [];
  selectedIndices.clear();
  previewScreen.classList.add('hidden');
  uploadScreen.classList.remove('hidden');
});

// Select all
selectAllCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    selectedIndices = new Set(students.map((_, i) => i));
  } else {
    selectedIndices.clear();
  }
  document.querySelectorAll('.student-cb').forEach((cb, i) => {
    cb.checked = e.target.checked;
  });
  updateSelectedCount();
});

// Individual checkboxes
tableBody.addEventListener('change', (e) => {
  if (e.target.classList.contains('student-cb')) {
    const idx = parseInt(e.target.dataset.index);
    if (e.target.checked) selectedIndices.add(idx);
    else selectedIndices.delete(idx);
    selectAllCheckbox.checked = selectedIndices.size === students.length;
    updateSelectedCount();
  }
});

// Generate buttons
async function handleGenerate(type) {
  const selected = students.filter((_, i) => selectedIndices.has(i));
  if (selected.length === 0) return;

  progressBar.classList.remove('hidden');
  progressFill.style.width = '30%';
  progressText.textContent = 'Generating PDF...';
  btnGenApp.disabled = btnGenAdmit.disabled = btnGenCombined.disabled = true;

  try {
    progressFill.style.width = '60%';
    const result = await window.api.generatePDF(selected, type);
    progressFill.style.width = '100%';

    if (result.canceled) {
      progressText.textContent = 'Cancelled';
    } else if (result.success) {
      progressText.textContent = 'Done!';
      showToast('PDF generated successfully!', 'success', result.filePath);
    } else {
      progressText.textContent = 'Error';
      showToast(result.error || 'Failed to generate PDF', 'error');
    }
  } catch (err) {
    progressText.textContent = 'Error';
    showToast(err.message, 'error');
  }

  setTimeout(() => {
    progressBar.classList.add('hidden');
    progressFill.style.width = '0%';
    updateSelectedCount();
  }, 2000);
}

btnGenApp.addEventListener('click', () => handleGenerate('application'));
btnGenAdmit.addEventListener('click', () => handleGenerate('admitcard'));
btnGenCombined.addEventListener('click', () => handleGenerate('combined'));
