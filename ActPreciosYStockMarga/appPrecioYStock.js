function processFiles() {
    const file1 = document.getElementById('file1').files[0];
    const file2 = document.getElementById('file2').files[0];

    if (!file1 || !file2) {
        alert('Por favor, cargue ambos archivos.');
        return;
    }

    const reader1 = new FileReader();
    const reader2 = new FileReader();

    reader1.onload = function(e) {
        const data1 = new Uint8Array(e.target.result);
        const workbook1 = XLSX.read(data1, { type: 'array' });
        const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
        const newPricesAndStock = XLSX.utils.sheet_to_json(sheet1, { header: 1, raw: true });

        reader2.onload = function(e) {
            const data2 = new Uint8Array(e.target.result);
            const workbook2 = XLSX.read(data2, { type: 'array' });
            const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
            const productList = XLSX.utils.sheet_to_json(sheet2, { header: 1, raw: true });

            // Limpia los valores y procesa precios y stock desde el archivo de entrada
            const cleanedData = newPricesAndStock.slice(6).map(row => {
                if (row[2]) {
                    row[2] = row[2].toString().replace(/^'/, ''); // Remueve el carácter "'"
                }
                return row;
            });

            // Crear un mapa para buscar precios y stock por SKU
            const dataMap = {};
            cleanedData.forEach(row => {
                const sku = row[2];
                let price = row[1]; // Columna del precio
                const stock = row[5]; // Columna F es el índice 5
                
                // Verifica si el precio es un número válido antes de aplicar el IVA
                if (price != null && !isNaN(price)) {
                    price = parseFloat(price) * 1.21; // Aplica el IVA del 21%
                } else {
                    price = null; // Si no es válido, asigna null
                }
                
                if (sku) {
                    dataMap[sku] = {
                        price: price,
                        stock: stock != null ? stock : null
                    };
                }
            });

            // Actualizar precios y stock en la lista completa
            const updatedProducts = productList.map((product, index) => {
                if (index > 0) { // Omite la fila de encabezado
                    const sku = product[0];
                    if (dataMap[sku]) {
                        if (dataMap[sku].price != null) {
                            product[1] = dataMap[sku].price; // Actualiza el precio en la columna 2
                        }
                        if (dataMap[sku].stock != null) {
                            product[3] = dataMap[sku].stock; // Actualiza el stock en la columna 4
                        }
                    }
                }
                return product;
            });

            // Crear un nuevo archivo Excel con los datos actualizados
            const newSheet = XLSX.utils.aoa_to_sheet(updatedProducts);
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Productos Actualizados');

            const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/octet-stream' });

            const link = document.getElementById('download-link');
            link.href = URL.createObjectURL(blob);
            link.download = 'productos_actualizados.xlsx';
            link.style.display = 'block';
        };

        reader2.readAsArrayBuffer(file2);
    };

    reader1.readAsArrayBuffer(file1);
}