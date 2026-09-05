const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. Add fixImamSalaryTransactionDate function
const fixImamFunc = `
// Auto-correct wrongly dated Imam salary transaction from March 2026 to 04/09/2026 (4 September 2026)
function fixImamSalaryTransactionDate() {
    if (!state.transactions || !Array.isArray(state.transactions)) return false;
    let changed = false;

    state.transactions.forEach(tx => {
        if (!tx) return;
        const isImamSalary = tx.category === 'ImamSalary' || 
                             (tx.description && tx.description.includes('ইমাম')) ||
                             (parseFloat(tx.amount || 0) === 6600 && tx.transaction_type === 'EXPENSE');
        
        if (isImamSalary && tx.date && (tx.date.startsWith('2026-03') || tx.date === '2026-03-04')) {
            console.log('✅ Corrected Imam salary transaction date from', tx.date, 'to 2026-09-04');
            tx.date = '2026-09-04';
            changed = true;
        }
    });

    return changed;
}
`;

if (!code.includes('function fixImamSalaryTransactionDate')) {
    code = code.replace('function deduplicateTransactions() {', fixImamFunc + '\nfunction deduplicateTransactions() {');
    console.log('✅ Added fixImamSalaryTransactionDate function');
}

// 2. Call fixImamSalaryTransactionDate in loadState() and syncStateFromCloud()
if (code.includes('if (deduplicateTransactions()) { saveState(); }')) {
    code = code.replace(
        'if (deduplicateTransactions()) { saveState(); }',
        'const cleanedDupes = deduplicateTransactions();\n    const fixedImamDate = fixImamSalaryTransactionDate();\n    if (cleanedDupes || fixedImamDate) { saveState(); }'
    );
    console.log('✅ Added fixImamSalaryTransactionDate call in loadState()');
}

if (code.includes('deduplicateTransactions();')) {
    code = code.replace(
        'deduplicateTransactions();',
        'deduplicateTransactions();\n    fixImamSalaryTransactionDate();'
    );
    console.log('✅ Added fixImamSalaryTransactionDate call in syncStateFromCloud()');
}

// 3. Update DOMContentLoaded to enforce min date on txDate and epDate
const oldDomInit = `    // Set default dates to current date
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('txDate')) document.getElementById('txDate').value = today;
    if (document.getElementById('epDate')) document.getElementById('epDate').value = today;`;

const newDomInit = `    // Set default dates to current date and enforce current month minimum constraint
    const nowObj = new Date();
    const today = nowObj.toISOString().split('T')[0];
    const currentMonthStart = nowObj.getFullYear() + '-' + String(nowObj.getMonth() + 1).padStart(2, '0') + '-01';
    
    if (document.getElementById('txDate')) {
        document.getElementById('txDate').value = today;
        document.getElementById('txDate').min = currentMonthStart;
    }
    if (document.getElementById('epDate')) {
        document.getElementById('epDate').value = today;
        document.getElementById('epDate').min = currentMonthStart;
    }`;

if (code.includes(oldDomInit)) {
    code = code.replace(oldDomInit, newDomInit);
    console.log('✅ Updated DOMContentLoaded with min date constraint');
}

// 4. Update handleTransactionSubmit with date validation check
const oldTxSubmit = `function handleTransactionSubmit(e) {
    e.preventDefault();
    
    if (state.currentUser.role === 'secretary') {
        alert("আপনার এই লেনদেন এন্ট্রি করার অনুমতি নেই!");
        return;
    }

    const type = document.getElementById('txType').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    const mode = document.getElementById('txMode').value;
    const date = document.getElementById('txDate').value;`;

const newTxSubmit = `function handleTransactionSubmit(e) {
    e.preventDefault();
    
    if (state.currentUser.role === 'secretary') {
        alert("আপনার এই লেনদেন এন্ট্রি করার অনুমতি নেই!");
        return;
    }

    const type = document.getElementById('txType').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    const mode = document.getElementById('txMode').value;
    const date = document.getElementById('txDate').value;

    // Strict Validation: Cannot enter transaction for past months before current active month
    const now = new Date();
    const currentMonthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    if (date < currentMonthStart) {
        alert("চলতি মাসের পূর্ববর্তী কোনো মাসের তারিখে লেনদেন এন্ট্রি করা যাবে না! অনুগ্রহ করে চলতি মাসের (" + BANGLA_MONTHS[now.getMonth() + 1] + ") বা তার পরবর্তী তারিখ নির্বাচন করুন।");
        return;
    }`;

if (code.includes(oldTxSubmit)) {
    code = code.replace(oldTxSubmit, newTxSubmit);
    console.log('✅ Added past-month prevention in handleTransactionSubmit');
}

// 5. Update handleEasyPaymentSubmit with date validation check
const oldEpDateCheck = `    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;`;

const newEpDateCheck = `    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;

    // Strict Validation: Cannot enter subscription for past months before current active month
    const nowValidation = new Date();
    const currentMonthStart = nowValidation.getFullYear() + '-' + String(nowValidation.getMonth() + 1).padStart(2, '0') + '-01';
    if (date < currentMonthStart) {
        alert("চলতি মাসের পূর্ববর্তী কোনো মাসের তারিখে চাঁদা আদায় এন্ট্রি করা যাবে না! অনুগ্রহ করে চলতি মাসের (" + BANGLA_MONTHS[nowValidation.getMonth() + 1] + ") বা তার পরবর্তী তারিখ নির্বাচন করুন।");
        return;
    }`;

if (code.includes(oldEpDateCheck)) {
    code = code.replace(oldEpDateCheck, newEpDateCheck);
    console.log('✅ Added past-month prevention in handleEasyPaymentSubmit');
}

// 6. Update openMemberDetails to set min on epDate
if (code.includes("document.getElementById('epReceiptNo').value = '';")) {
    code = code.replace(
        "document.getElementById('epReceiptNo').value = '';",
        "document.getElementById('epReceiptNo').value = '';\n        const nowDt = new Date();\n        const curMStart = nowDt.getFullYear() + '-' + String(nowDt.getMonth() + 1).padStart(2, '0') + '-01';\n        if (document.getElementById('epDate')) { document.getElementById('epDate').min = curMStart; }"
    );
    console.log('✅ Set min date constraint in openMemberDetails()');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully saved');
