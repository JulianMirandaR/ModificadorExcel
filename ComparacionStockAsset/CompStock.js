function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            resolve(rows);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function compareStocks() {
    const fileOld = document.getElementById('fileOld').files[0];
    const fileNew = document.getElementById('fileNew').files[0];

    if (!fileOld || !fileNew) {
        alert("Por favor, subí ambos archivos.");
        return;
    }

    const [oldRows, newRows] = await Promise.all([readExcel(fileOld), readExcel(fileNew)]);

    const oldMap = new Map();
    const newMap = new Map();

    // Armar map archivo viejo
    for (let i = 1; i < oldRows.length; i++) {
        const sku = (oldRows[i][0] || '').toString().trim();
        const stock = parseInt(oldRows[i][2]);
        if (sku && !isNaN(stock)) oldMap.set(sku, stock);
    }

    // Armar map archivo nuevo
    for (let i = 1; i < newRows.length; i++) {
        const sku = (newRows[i][0] || '').toString().trim();
        const stock = parseInt(newRows[i][2]);
        if (sku && !isNaN(stock)) newMap.set(sku, stock);
    }

    const resultadosTexto = [];
    const resultadosExcel = [['SKU', 'Stock Anterior', 'Stock Actual', 'Estado']];

    for (let [sku, oldStock] of oldMap) {
        const newStock = newMap.has(sku) ? newMap.get(sku) : 0;

        // Ignorar si stock no cambió o ya era bajo/0
        if (oldStock <= 3 || oldStock === newStock) continue;

        if (!newMap.has(sku) || newStock === 0) {
            resultadosTexto.push(`❌ ${sku}: Ya no hay stock (antes había ${oldStock})`);
            resultadosExcel.push([sku, oldStock, newStock, 'Sin stock']);
        } else if (newStock <= 3 && newStock < oldStock) {
            resultadosTexto.push(`⚠️ ${sku}: Stock bajo (${newStock}) - antes tenía ${oldStock}`);
            resultadosExcel.push([sku, oldStock, newStock, 'Stock bajo']);
        }
    }

    // Mostrar en pantalla
    document.getElementById('resultados').textContent = resultadosTexto.length
        ? resultadosTexto.join('\n')
        : '✅ Todo en orden. No hay productos con faltante ni bajo stock.';

    // Generar Excel
    if (resultadosExcel.length > 1) {
        const worksheet = XLSX.utils.aoa_to_sheet(resultadosExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        const link = document.getElementById('download-link');
        link.href = URL.createObjectURL(blob);
        link.download = 'stock_comparado.xlsx';
        link.style.display = 'inline-block';
        link.textContent = '📥 Descargar Excel de Resultados';
    } else {
        document.getElementById('download-link').style.display = 'none';
    }
}