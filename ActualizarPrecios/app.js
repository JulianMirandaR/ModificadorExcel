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
    document.getElementById('status-message').className = 'status-message'; // Reset
    document.getElementById('status-message').style.display = 'none';
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

async function processFiles() {
    const file1 = document.getElementById('file1').files[0];
    const file2 = document.getElementById('file2').files[0];

    if (!file1 || !file2) {
        showStatus('Por favor, cargue ambos archivos.', 'error');
        return;
    }

    showLoading();

    try {
        const workbook1 = await readExcelFile(file1);
        const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
        const newPrices = XLSX.utils.sheet_to_json(sheet1, { header: 1, raw: true });

        const workbook2 = await readExcelFile(file2);
        const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
        const productList = XLSX.utils.sheet_to_json(sheet2, { header: 1, raw: true });

        const priceMap = {};
        newPrices.forEach(item => {
            if (item[0] && item[1] != null) {
                priceMap[item[0]] = item[1];
            }
        });

        const updatedProducts = productList.map(product => {
            const sku = product[0];
            if (priceMap[sku] != null) {
                product[1] = priceMap[sku];
            }
            return product;
        });

        const newSheet = XLSX.utils.aoa_to_sheet(updatedProducts);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Productos Actualizados');

        const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        const link = document.getElementById('download-link');
        link.href = URL.createObjectURL(blob);
        link.download = 'productos_actualizados.xlsx';
        link.style.display = 'block';
        link.textContent = 'Descargar Archivo Actualizado'; 
        
        // Auto click to download (optional, but often preferred) or just show message
        showStatus('Proceso completado con éxito. Puede descargar el archivo abajo.', 'success');

    } catch (error) {
        console.error('Error procesando archivos:', error);
        showStatus('Ocurrió un error al procesar los archivos. Verifique que sean válidos.', 'error');
    } finally {
        hideLoading();
    }
}