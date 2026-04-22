
import * as fs from 'fs';
import * as XLSX from 'xlsx';
XLSX.set_fs(fs);

const filePath = 'C:/Users/rsaci/Desktop/Projets/Arrivio/gabarits iEDEC/Information et orientation_Bulk Upload Template_2025-10-25_VER_1334.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // We only need the first row to see headers
    const headers = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        const cell = worksheet[address];
        headers.push(cell ? cell.v : `Column ${C}`);
    }
    
    console.log('HEADERS_START');
    console.log(JSON.stringify(headers, null, 2));
    console.log('HEADERS_END');
} catch (error) {
    console.error('Error reading Excel:', error);
}
