const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. Reconciliation & Repair Function
const reconcileFunc = `
// Universal Reconciler: Fixes any misallocated advance payments where future months were marked advance while past months had dues
function reconcileMemberDuesAndAdvances() {
    if (!state.members || !Array.isArray(state.members)) return false;
    let stateChanged = false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 9 for September

    state.members.forEach(member => {
        if (!member || member.member_type === 'Free' || member.is_deleted) return;
        
        const memberId = member.id;
        const fee = parseFloat(member.monthly_fee || 0);
        
        // Find any future month subscriptions that took advance while past months were due
        const futureSubs = (state.subscriptions || []).filter(s => 
            s.member_id === memberId && 
            (s.year > currentYear || (s.year === currentYear && s.month > currentMonth)) &&
            parseFloat(s.amount_paid || 0) > 0 &&
            (s.receipt_no === 'ADVANCE' || !s.receipt_no)
        );

        if (futureSubs.length > 0) {
            let recoveredMoney = 0;
            futureSubs.forEach(fs => {
                recoveredMoney += parseFloat(fs.amount_paid || 0);
                fs.amount_paid = 0;
                fs.due_amount = fee;
                fs.status = 'Unpaid';
                fs.receipt_no = '';
                fs.last_payment_date = '';
                stateChanged = true;
            });

            // Re-apply recovered money to opening arrears first
            let openingArrears = parseFloat(member.opening_arrears || 0);
            if (openingArrears > 0 && recoveredMoney > 0) {
                const payOp = Math.min(recoveredMoney, openingArrears);
                member.opening_arrears = openingArrears - payOp;
                recoveredMoney -= payOp;
                stateChanged = true;
            }

            // Then re-apply to past/current months
            const joinParts = (member.join_date || '2025-01-01').split('-');
            const joinYear = parseInt(joinParts[0]) || 2025;
            const joinMonth = parseInt(joinParts[1]) || 1;

            for (let y = joinYear; y <= currentYear && recoveredMoney > 0; y++) {
                const startM = y === joinYear ? joinMonth : 1;
                const endM = y === currentYear ? currentMonth : 12;

                for (let m = startM; m <= endM && recoveredMoney > 0; m++) {
                    let sub = (state.subscriptions || []).find(s => s.member_id === memberId && s.year === y && s.month === m);
                    if (!sub) {
                        sub = {
                            id: 'sub-' + memberId + '-' + y + '-' + m,
                            member_id: memberId,
                            year: y,
                            month: m,
                            amount_paid: 0,
                            due_amount: fee,
                            status: 'Unpaid',
                            last_payment_date: ''
                        };
                        state.subscriptions.push(sub);
                    }

                    const curDue = fee - parseFloat(sub.amount_paid || 0);
                    if (curDue > 0) {
                        const pay = Math.min(recoveredMoney, curDue);
                        sub.amount_paid = parseFloat(sub.amount_paid || 0) + pay;
                        sub.due_amount = fee - sub.amount_paid;
                        sub.status = sub.due_amount <= 0 ? 'Paid' : 'Partial';
                        sub.receipt_no = sub.receipt_no || 'PAID';
                        sub.last_payment_date = sub.last_payment_date || (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01');
                        recoveredMoney -= pay;
                        stateChanged = true;
                    }
                }
            }

            // Any remaining is true advance
            member.advance_balance = parseFloat(member.advance_balance || 0) + recoveredMoney;
            stateChanged = true;
        }
    });

    return stateChanged;
}
`;

if (!code.includes('function reconcileMemberDuesAndAdvances')) {
    code = code.replace('function fixImamSalaryTransactionDate() {', reconcileFunc + '\nfunction fixImamSalaryTransactionDate() {');
    console.log('✅ Added reconcileMemberDuesAndAdvances function');
}

// 2. Update processAdvanceDeductions to clear opening_arrears first
const oldProcAdv = `    state.members.forEach(member => {
        if (member.status !== 'Active' || member.member_type === 'Free') return;
        
        let advance = parseFloat(member.advance_balance || 0);
        if (advance <= 0) return;

        const fee = parseFloat(member.monthly_fee || 0);`;

const newProcAdv = `    state.members.forEach(member => {
        if (member.status !== 'Active' || member.member_type === 'Free') return;
        
        let advance = parseFloat(member.advance_balance || 0);
        if (advance <= 0) return;

        // Step 1: Deduct from opening arrears first if any exists!
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

if (code.includes(oldProcAdv)) {
    code = code.replace(oldProcAdv, newProcAdv);
    console.log('✅ Updated processAdvanceDeductions with opening arrears deduction');
}

// 3. Update handleEasyPaymentSubmit to clear opening_arrears first
const oldEasyLogic = `    let remainingPaid = totalPaid;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthLimit = now.getMonth() + 1;

    const joinParts = (member.join_date || '2025-01-01').split('-');`;

const newEasyLogic = `    let remainingPaid = totalPaid;
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

if (code.includes(oldEasyLogic)) {
    code = code.replace(oldEasyLogic, newEasyLogic);
    console.log('✅ Updated handleEasyPaymentSubmit with opening arrears deduction');
}

// 4. Update calculateMemberTotalDue to account for advance_balance correctly
const oldDueCalc = `    const openingArrears = parseFloat(member.opening_arrears || 0);
    const due = (totalExpected + openingArrears) - totalPaid;
    return due > 0 ? due : 0;`;

const newDueCalc = `    const openingArrears = parseFloat(member.opening_arrears || 0);
    const advance = parseFloat(member.advance_balance || 0);
    const due = (totalExpected + openingArrears) - totalPaid - advance;
    return due > 0 ? due : 0;`;

if (code.includes(oldDueCalc)) {
    code = code.replace(oldDueCalc, newDueCalc);
    console.log('✅ Updated calculateMemberTotalDue calculation');
}

// 5. Call reconcileMemberDuesAndAdvances in loadState and syncStateFromCloud
if (code.includes('const fixedImamDate = fixImamSalaryTransactionDate();')) {
    code = code.replace(
        'const fixedImamDate = fixImamSalaryTransactionDate();',
        'const fixedImamDate = fixImamSalaryTransactionDate();\n    const reconciledDues = reconcileMemberDuesAndAdvances();'
    );
    code = code.replace(
        'if (cleanedDupes || fixedImamDate) { saveState(); }',
        'if (cleanedDupes || fixedImamDate || reconciledDues) { saveState(); }'
    );
    console.log('✅ Added reconcileMemberDuesAndAdvances call in loadState()');
}

if (code.includes('fixImamSalaryTransactionDate();')) {
    code = code.replace(
        'fixImamSalaryTransactionDate();',
        'fixImamSalaryTransactionDate();\n    reconcileMemberDuesAndAdvances();'
    );
    console.log('✅ Added reconcileMemberDuesAndAdvances call in syncStateFromCloud()');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully saved');
