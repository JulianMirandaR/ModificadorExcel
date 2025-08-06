function generateCombinedExcel() {
    const file1 = document.getElementById('file1').files[0]; // GNIK
    const file2 = document.getElementById('file2').files[0]; // Stock/DOT (principal)
    const file3 = document.getElementById('file3').files[0]; // Costo

    if (!file1 || !file2 || !file3) {
        alert("Por favor, cargá los tres archivos.");
        return;
    }

    Promise.all([readExcel(file1), readExcel(file2), readExcel(file3)]).then(([gnikData, stockData, costoData]) => {
        const gnikRows = XLSX.utils.sheet_to_json(gnikData.Sheets[gnikData.SheetNames[0]], { header: 1 });
        const stockRows = XLSX.utils.sheet_to_json(stockData.Sheets[stockData.SheetNames[0]], { header: 1 });
        const costoRows = XLSX.utils.sheet_to_json(costoData.Sheets[costoData.SheetNames[0]], { header: 1 });

        const gnikMap = new Map();
        const costoMap = new Map();

        // Armar map de GNIK (clave: SKU)
        for (let i = 6; i < gnikRows.length; i++) {
            const sku = (gnikRows[i][2] || '').toString().replace(/^'/, '');
            const descripcion = gnikRows[i][3] || '';
            const precioBase = parseFloat(gnikRows[i][10]);
            const pvpConIVA = precioBase ? Math.floor(precioBase * 1.21) : '';
            gnikMap.set(sku, { descripcion, pvpConIVA });
        }

        // Armar map de costo (clave: SKU)
        for (let i = 1; i < costoRows.length; i++) {
            const sku = (costoRows[i][0] || '').toString().replace(/^'/, '');
            const costo = parseFloat(costoRows[i][1]) || 0;
            costoMap.set(sku, costo);
        }

        // Procesar desde archivo 2 (Stock/DOT)
        const finalData = [
            ['SKU', 'Descripción', 'PVP con IVA', 'Stock', 'DOT', 'Precio Costo', 'Precio ML', 'Precio Mínimo']
        ];

        for (let i = 1; i < stockRows.length; i++) {
            const row = stockRows[i];
            const sku = (row[0] || '').toString().replace(/^'/, '');
            if (!sku) continue;

            let stock = row[2];
            if (stock != null && stock !== '') {
                stock = parseInt(stock.toString().replace(/\s/g, ''));
                if (isNaN(stock)) stock = null;
            } else {
                stock = null;
            }
            const dot = row[3] || '';

            const gnik = gnikMap.get(sku) || {};
            const descripcion = gnik.descripcion || '';
            const pvpConIVA = gnik.pvpConIVA || '';

            let costo = costoMap.get(sku) || '';
            if (costo) {
                costo = Math.round(costo);
            }
            let precioML = '', precioMin = '';

            if (costo) {
                precioML = Math.round(costo *1.21/ 0.87 / 0.87 / 0.98 + 15000);
                precioMin = Math.round(costo *1.21/ 0.95 / 0.87 / 0.98 + 15000);
            }

            finalData.push([
                sku, descripcion, pvpConIVA, stock, dot, costo || '', precioML, precioMin
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
