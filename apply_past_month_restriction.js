const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. In handleTransactionSubmit: Add past month check
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

    // Strict Rule: No transaction in past months before current active month
    const now = new Date();
    const currentMonthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    if (date < currentMonthStart) {
        alert("চলতি মাসের পূর্ববর্তী কোনো মাসের তারিখে লেনদেন এন্ট্রি করা যাবে না! অনুগ্রহ করে চলতি মাসের (" + BANGLA_MONTHS[now.getMonth() + 1] + ") বা তার পরবর্তী তারিখ নির্বাচন করুন।");
        return;
    }`;

if (code.includes(oldTxSubmit)) {
    code = code.replace(oldTxSubmit, newTxSubmit);
    console.log('✅ Added past month validation in handleTransactionSubmit');
}

// 2. In handleEasyPaymentSubmit: Add past month check & duplicate check
const oldEasySubmit = `function handleEasyPaymentSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;
    const mode = 'CASH'; // Default mode is Cash`;

const newEasySubmit = `function handleEasyPaymentSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;
    const mode = 'CASH'; // Default mode is Cash

    // Strict Rule: No payment in past months before current active month
    const now = new Date();
    const currentMonthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    if (date < currentMonthStart) {
        alert("চলতি মাসের পূর্ববর্তী কোনো মাসের তারিখে চাঁদা আদায় এন্ট্রি করা যাবে না! অনুগ্রহ করে চলতি মাসের (" + BANGLA_MONTHS[now.getMonth() + 1] + ") বা তার পরবর্তী তারিখ নির্বাচন করুন।");
        return;
    }

    // Double-posting protection: Check if same receipt number was already posted
    if (receiptNo) {
        const existingTx = (state.transactions || []).find(t => 
            t.transaction_type === 'INCOME' && 
            t.receipt_no && 
            String(t.receipt_no).trim() === receiptNo &&
            t.date === date
        );
        if (existingTx) {
            alert('রশিদ নম্বর "' + englishToBanglaNum(receiptNo) + '" আজকের তারিখে ইতিমধ্যে এন্ট্রি করা হয়েছে! একই রশিদ পুনরায় পোস্ট করা যাবে না।');
            return;
        }
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        setTimeout(() => { if (submitBtn) submitBtn.disabled = false; }, 3000);
    }`;

if (code.includes(oldEasySubmit)) {
    code = code.replace(oldEasySubmit, newEasySubmit);
    console.log('✅ Added past month validation in handleEasyPaymentSubmit');
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

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully written');
