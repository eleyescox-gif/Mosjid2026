const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

const oldSort = `        // 2. Sort strictly by Receipt Number (numeric), then fallback to Date
        receiptList.sort((a, b) => {
            const numA = parseInt(a.receipt_no);
            const numB = parseInt(b.receipt_no);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            if (a.receipt_no !== '—' && b.receipt_no === '—') return -1;
            if (a.receipt_no === '—' && b.receipt_no !== '—') return 1;
            return new Date(a.date) - new Date(b.date);
        });`;

const newSort = `        // 2. Sort: 1st Priority = Date (Ascending), 2nd Priority = Receipt Number (Numeric Ascending)
        receiptList.sort((a, b) => {
            const dateA = new Date(a.date || '1970-01-01').getTime();
            const dateB = new Date(b.date || '1970-01-01').getTime();
            
            // 1st Priority: Date
            if (dateA !== dateB) {
                return dateA - dateB;
            }

            // 2nd Priority: Receipt Number (numeric)
            const numA = parseInt(a.receipt_no);
            const numB = parseInt(b.receipt_no);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            if (a.receipt_no !== '—' && b.receipt_no === '—') return -1;
            if (a.receipt_no === '—' && b.receipt_no !== '—') return 1;
            
            return String(a.receipt_no || '').localeCompare(String(b.receipt_no || ''));
        });`;

if (code.includes(oldSort)) {
    code = code.replace(oldSort, newSort);
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ Updated sort order: 1st Priority = Date, 2nd Priority = Receipt Number');
} else {
    console.log('⚠️ oldSort not matched directly, trying flexible replacement');
    const sortStart = "receiptList.sort((a, b) => {";
    const sortEnd = "});";
    const idx1 = code.indexOf(sortStart);
    if (idx1 !== -1) {
        const idx2 = code.indexOf(sortEnd, idx1);
        if (idx2 !== -1) {
            code = code.substring(0, idx1) + newSort.trim() + code.substring(idx2 + sortEnd.length);
            fs.writeFileSync('app.js', code, 'utf8');
            console.log('✅ Updated sort order via range replacement');
        }
    }
}
