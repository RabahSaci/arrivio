
const XLSX = require('xlsx');

const filePath = 'C:/Users/rsaci/Desktop/Projets/Arrivio/gabarits iEDEC/Information et orientation_Bulk Upload Template_2025-10-25_VER_1334.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: '' }).slice(0, 5);
    
    console.log('ROWS_START');
    console.log(JSON.stringify(rows, null, 2));
    console.log('ROWS_END');
} catch (error) {
    console.error('Error reading Excel:', error.message);
}
