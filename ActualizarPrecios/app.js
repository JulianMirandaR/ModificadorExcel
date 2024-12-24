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
        const workbook1 = XLSX.read(data1, {type: 'array'});
        const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
        const newPrices = XLSX.utils.sheet_to_json(sheet1, {header: 1, raw: true});

        reader2.onload = function(e) {
            const data2 = new Uint8Array(e.target.result);
            const workbook2 = XLSX.read(data2, {type: 'array'});
            const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
            const productList = XLSX.utils.sheet_to_json(sheet2, {header: 1, raw: true});

            // Convert the new prices array to an object for quick lookup
            const priceMap = {};
            newPrices.forEach(item => {
                if (item[0] && item[1] != null) {
                    priceMap[item[0]] = item[1];
                }
            });

            // Update the prices in the product list without removing other columns
            const updatedProducts = productList.map(product => {
                const sku = product[0];
                if (priceMap[sku] != null) {
                    product[1] = priceMap[sku];  // Update the price in the second column
                }
                return product;
            });

            // Create a new sheet with the updated product list
            const newSheet = XLSX.utils.aoa_to_sheet(updatedProducts);
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Productos Actualizados');

            // Generate the new file and create a download link
            const wbout = XLSX.write(newWorkbook, {bookType: 'xlsx', type: 'array'});
            const blob = new Blob([wbout], {type: 'application/octet-stream'});

            const link = document.getElementById('download-link');
            link.href = URL.createObjectURL(blob);
            link.download = 'productos_actualizados.xlsx';
            link.style.display = 'block';
        };

        reader2.readAsArrayBuffer(file2);
    };

    reader1.readAsArrayBuffer(file1);
}