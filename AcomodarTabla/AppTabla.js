function updateFileName(input) {
    const fileNameSpan = document.getElementById(input.id + '-name');
    if (input.files && input.files.length > 0) {
        fileNameSpan.textContent = input.files[0].name;
    } else {
        fileNameSpan.textContent = 'Ningún archivo seleccionado';
    }
}

function showLoading() {
    document.getElementById('loading-overlay').classList.add('visible');
    const statusDiv = document.getElementById('status-message');
    statusDiv.style.display = 'none';
    statusDiv.classList.remove('success', 'error');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('visible');
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                resolve(workbook);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function generateExcel() {
    const file = document.getElementById('file1').files[0];

    if (!file) {
        showStatus('Por favor, seleccione un archivo.', 'error');
        return;
    }

    showLoading();

    try {
        const workbook = await readExcelFile(file);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

        // Process data starting from 7th row
        const processedData = rows.slice(6).map(row => {
            const sku = row[2] ? row[2].toString().replace(/^'/, '') : '';
            const description = row[3] || '';
            const stock = row[5] || '';
            let pvp = row[10];

            if (pvp != null && !isNaN(pvp)) {
                pvp = Math.floor(parseFloat(pvp) * 1.21);
            } else {
                pvp = '';
            }

            return [sku, description, stock, pvp];
        });

        const headers = ['SKU', 'Descripción', 'Stock Físico', 'PVP'];
        const finalData = [headers, ...processedData];

        const newSheet = XLSX.utils.aoa_to_sheet(finalData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Nuevo Archivo');

        const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        const link = document.getElementById('download-link');
        link.href = URL.createObjectURL(blob);
        link.download = 'nuevo_archivo.xlsx';
        link.style.display = 'block';
        link.textContent = 'Descargar Nuevo Archivo';

        showStatus('Archivo generado correctamente.', 'success');

    } catch (error) {
        console.error('Error generando excel:', error);
        showStatus('Error al procesar el archivo.', 'error');
    } finally {
        hideLoading();
    }
}
