const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. Update calculateMemberTotalDue
const oldCalcDue = `    const openingArrears = parseFloat(member.opening_arrears || 0);
    const due = (totalExpected + openingArrears) - totalPaid;
    return due > 0 ? due : 0;`;

const newCalcDue = `    const openingArrears = parseFloat(member.opening_arrears || 0);
    const advance = parseFloat(member.advance_balance || 0);
    const due = (totalExpected + openingArrears) - totalPaid - advance;
    return due > 0 ? due : 0;`;

if (code.includes(oldCalcDue)) {
    code = code.replace(oldCalcDue, newCalcDue);
    console.log('✅ Updated calculateMemberTotalDue');
}

// 2. Update processAdvanceDeductions
const oldProcessAdv = `function processAdvanceDeductions() {
    let stateChanged = false;
    const now = new Date();

    state.members.forEach(member => {
        if (member.status !== 'Active' || member.member_type === 'Free') return;
        
        let advance = parseFloat(member.advance_balance || 0);
        if (advance <= 0) return;

        const fee = parseFloat(member.monthly_fee || 0);`;

const newProcessAdv = `function processAdvanceDeductions() {
    let stateChanged = false;
    const now = new Date();

    state.members.forEach(member => {
        if (member.status !== 'Active' || member.member_type === 'Free') return;
        
        let advance = parseFloat(member.advance_balance || 0);
        if (advance <= 0) return;

        // Deduct from opening arrears first if any exists!
        let openingArrears = parseFloat(member.opening_arrears || 0);
        if (openingArrears > 0) {
            const payForOpening = Math.min(advance, openingArrears);
            member.opening_arrears = openingArrears - payForOpening;
            advance -= payForOpening;
            stateChanged = true;
        }
        if (advance <= 0) {
            member.advance_balance = 0;
            stateChanged = true;
            return;
        }

        const fee = parseFloat(member.monthly_fee || 0);`;

if (code.includes(oldProcessAdv)) {
    code = code.replace(oldProcessAdv, newProcessAdv);
    console.log('✅ Updated processAdvanceDeductions');
}

// 3. Update handleEasyPaymentSubmit
const oldEasySubmitFull = `function handleEasyPaymentSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;
    const mode = 'CASH'; // Default mode is Cash

    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (totalPaid <= 0) {
        alert("দয়া করে সঠিক অর্থ পরিশোধ এন্ট্রি দিন!");
        return;
    }

    let remainingPaid = totalPaid;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthLimit = now.getMonth() + 1;

    const joinParts = (member.join_date || '2025-01-01').split('-');`;

const newEasySubmitFull = `function handleEasyPaymentSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;
    const mode = 'CASH'; // Default mode is Cash

    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (totalPaid <= 0) {
        alert("দয়া করে সঠিক অর্থ পরিশোধ এন্ট্রি দিন!");
        return;
    }

    // Strict Rule: No payment in past months before current active month
    const nowValidation = new Date();
    const currentMonthStart = nowValidation.getFullYear() + '-' + String(nowValidation.getMonth() + 1).padStart(2, '0') + '-01';
    if (date < currentMonthStart) {
        alert("চলতি মাসের পূর্ববর্তী কোনো মাসের তারিখে চাঁদা আদায় এন্ট্রি করা যাবে না! অনুগ্রহ করে চলতি মাসের (" + BANGLA_MONTHS[nowValidation.getMonth() + 1] + ") বা তার পরবর্তী তারিখ নির্বাচন করুন।");
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
    }

    let remainingPaid = totalPaid;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthLimit = now.getMonth() + 1;

    // Step 1: Clear opening arrears first before monthly allocations!
    let openingArrears = parseFloat(member.opening_arrears || 0);
    if (openingArrears > 0 && remainingPaid > 0) {
        const payForOpening = Math.min(remainingPaid, openingArrears);
        member.opening_arrears = openingArrears - payForOpening;
        remainingPaid -= payForOpening;
    }

    const joinParts = (member.join_date || '2025-01-01').split('-');`;

if (code.includes(oldEasySubmitFull)) {
    code = code.replace(oldEasySubmitFull, newEasySubmitFull);
    console.log('✅ Updated handleEasyPaymentSubmit');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully written');
