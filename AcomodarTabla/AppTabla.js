function generateExcel() {
    const file = document.getElementById('file1').files[0];

    if (!file) {
        alert('Por favor, cargue un archivo.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

        // Procesar datos desde la fila 7 incluida
        const processedData = rows.slice(6).map(row => {
            const sku = row[2] ? row[2].toString().replace(/^'/, '') : ''; // Columna 3 (sin el "'")
            const description = row[3] || ''; // Columna 4
            const stock = row[5] || ''; // Columna 6
            let pvp = row[10]; // Columna 11 (K)

            if (pvp != null && !isNaN(pvp)) {
                pvp = Math.floor(parseFloat(pvp) * 1.21); // Aplica el IVA y elimina decimales
            } else {
                pvp = ''; // Si no es válido, queda vacío
            }

            return [sku, description, stock, pvp];
        });

        // Agregar encabezados
        const headers = ['SKU', 'Descripción', 'Stock Físico', 'PVP'];
        const finalData = [headers, ...processedData];

        // Crear un nuevo archivo Excel
        const newSheet = XLSX.utils.aoa_to_sheet(finalData);

        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Nuevo Archivo');

        const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        const link = document.getElementById('download-link');
        link.href = URL.createObjectURL(blob);
        link.download = 'nuevo_archivo.xlsx';
        link.style.display = 'block';
    };

    reader.readAsArrayBuffer(file);
}
