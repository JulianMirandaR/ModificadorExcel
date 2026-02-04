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
        const newPricesAndStock = XLSX.utils.sheet_to_json(sheet1, { header: 1, raw: true });

        const workbook2 = await readExcelFile(file2);
        const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
        const productList = XLSX.utils.sheet_to_json(sheet2, { header: 1, raw: true });

        const cleanedData = newPricesAndStock.slice(6).map(row => {
            if (row[2]) {
                row[2] = row[2].toString().replace(/^'/, '');
            }
            return row;
        });

        const dataMap = {};
        cleanedData.forEach(row => {
            const sku = row[2];
            let price = row[1]; // Columna del precio (Index 1) - Check if this should be K (index 10) based on HTML text, but JS said row[1]. 
            // The original logic was row[1]. The HTML text says "Precios en Columna K" (index 10).
            // However, the original code used row[1]. I will stick to the original code logic to avoid breaking it, 
            // but the user might want to verify column mapping if the text is correct.
            // Wait, looking at original code:
            // "let price = row[1]; // Columna del precio"
            // "const stock = row[5]; // Columna F es el índice 5"
            // So I will replicate this exactly.

            const stock = row[5];

            if (price != null && !isNaN(price)) {
                price = parseFloat(price) * 1.21;
            } else {
                price = null;
            }

            if (sku) {
                dataMap[sku] = {
                    price: price,
                    stock: stock != null ? stock : null
                };
            }
        });

        const updatedProducts = productList.map((product, index) => {
            if (index > 0) {
                const sku = product[0];
                if (dataMap[sku]) {
                    if (dataMap[sku].price != null) {
                        product[1] = dataMap[sku].price;
                    }
                    if (dataMap[sku].stock != null) {
                        product[3] = dataMap[sku].stock;
                    }
                }
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

        showStatus('Proceso completado con éxito.', 'success');

    } catch (error) {
        console.error('Error procesando archivos:', error);
        showStatus('Ocurrió un error al procesar los archivos.', 'error');
    } finally {
        hideLoading();
    }
}