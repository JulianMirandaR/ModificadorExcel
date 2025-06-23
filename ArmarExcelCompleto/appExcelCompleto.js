function generateCombinedExcel() {
    const file1 = document.getElementById('file1').files[0]; // GNIK
    const file2 = document.getElementById('file2').files[0]; // Stock/DOT
    const file3 = document.getElementById('file3').files[0]; // Costo

    if (!file1 || !file2 || !file3) {
        alert("Por favor, cargá los tres archivos.");
        return;
    }

    Promise.all([readExcel(file1), readExcel(file2), readExcel(file3)]).then(([gnikData, stockData, costoData]) => {
        const gnikRows = XLSX.utils.sheet_to_json(gnikData.Sheets[gnikData.SheetNames[0]], { header: 1 });
        const stockRows = XLSX.utils.sheet_to_json(stockData.Sheets[stockData.SheetNames[0]], { header: 1 });
        const costoRows = XLSX.utils.sheet_to_json(costoData.Sheets[costoData.SheetNames[0]], { header: 1 });

        const stockMap = new Map();
        const costoMap = new Map();

        // Armar stock y dot map
        for (let i = 1; i < stockRows.length; i++) {
            const sku = (stockRows[i][0] || '').toString().replace(/^ /, '');
            const stock = (stockRows[i][2] || '').toString().replace(/^ /, '');
            const dot = stockRows[i][3] || '';
            stockMap.set(sku, { stock, dot });
        }

        // Armar costo map
        for (let i = 1; i < costoRows.length; i++) {
            const sku = (costoRows[i][0] || '').toString().replace(/^'/, '');
            const costo = parseFloat(costoRows[i][5]) || 0;
            costoMap.set(sku, costo);
        }

        // Procesar GNIK
        const finalData = [
            ['SKU', 'Descripción', 'PVP con IVA', 'Stock', 'DOT', 'Precio Costo', 'Precio ML', 'Precio Mínimo']
        ];

        for (let i = 6; i < gnikRows.length; i++) {
            const row = gnikRows[i];
            const sku = (row[2] || '').toString().replace(/^'/, '');
            const descripcion = row[3] || '';
            const precioBase = parseFloat(row[10]);
            const pvpConIVA = precioBase ? Math.floor(precioBase * 1.21) : '';

            const stockDot = stockMap.get(sku) || { stock: '', dot: '' };
            const costo = costoMap.get(sku) || '';

            let precioML = '';
            let precioMin = '';

            if (costo) {
                precioML = Math.round(costo / 0.87 / 0.87 / 0.98 + 15000);
                precioMin = Math.round(costo / 0.95 / 0.87 / 0.98 + 15000);
            }

            finalData.push([
                sku, descripcion, pvpConIVA,
                stockDot.stock, stockDot.dot,
                costo || '', precioML, precioMin
            ]);
        }

        const newSheet = XLSX.utils.aoa_to_sheet(finalData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Final');

        const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        const link = document.getElementById('download-link');
        link.href = URL.createObjectURL(blob);
        link.download = 'archivo_final.xlsx';
        link.style.display = 'block';
    });
}

function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            resolve(workbook);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}
