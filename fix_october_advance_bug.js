const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// Universal Subscription Rebuilder & Reconciler
const rebuildEngine = `
// =========================================================================
// Universal Mathematical Subscription & Advance Reconciler
// Re-calculates and aligns all member subscriptions strictly with real transactions
// Ensures no phantom advance in future months (e.g. October) when exact dues were paid.
// =========================================================================
function reconcileAllMemberSubscriptions() {
    if (!state.members || !Array.isArray(state.members)) return false;
    let stateChanged = false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // e.g. 9 for September

    state.members.forEach(member => {
        if (!member || member.member_type === 'Free' || member.is_deleted) return;
        
        const memberId = member.id;
        const fee = parseFloat(member.monthly_fee || 0);
        if (fee <= 0) return;

        // 1. Calculate actual total money paid in transactions for this member
        const memberTxs = (state.transactions || []).filter(t => 
            t.transaction_type === 'INCOME' && 
            t.member_id === memberId
        );
        
        let totalPaidReal = memberTxs.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        // Also clean up any false "[অগ্রিম জমা: ৳...]" tags in transaction descriptions if no advance exists
        memberTxs.forEach(tx => {
            if (tx.description && tx.description.includes('[অগ্রিম জমা:') && totalPaidReal <= (fee * 4)) {
                // If member only paid dues up to current month, remove false advance description
                const cleanDesc = tx.description.replace(/\s*\[অগ্রিম জমা:[^\]]+\]/, '').trim();
                if (cleanDesc !== tx.description) {
                    tx.description = cleanDesc;
                    stateChanged = true;
                }
            }
        });

        // 2. Clear all subscription records for this member
        (state.subscriptions || []).forEach(sub => {
            if (sub.member_id === memberId) {
                sub.amount_paid = 0;
                sub.due_amount = fee;
                sub.status = 'Unpaid';
                sub.receipt_no = '';
            }
        });

        let remainingMoney = totalPaidReal;

        // 3. Step A: Clear opening arrears first
        let openingArrears = parseFloat(member.initial_opening_arrears !== undefined ? member.initial_opening_arrears : (member.opening_arrears || 0));
        if (openingArrears > 0 && remainingMoney > 0) {
            const payOp = Math.min(remainingMoney, openingArrears);
            member.opening_arrears = openingArrears - payOp;
            remainingMoney -= payOp;
            stateChanged = true;
        }

        // 4. Step B: Chronologically pay months from join date up to CURRENT month (e.g. June -> September)
        const joinParts = (member.join_date || '2025-01-01').split('-');
        const joinYear = parseInt(joinParts[0]) || 2025;
        const joinMonth = parseInt(joinParts[1]) || 1;

        // Determine latest receipt number and payment date from transactions
        const latestTx = memberTxs.length > 0 ? memberTxs[memberTxs.length - 1] : null;
        const defaultReceipt = latestTx ? (latestTx.receipt_no || '') : '';
        const defaultPayDate = latestTx ? (latestTx.date || '') : '';

        for (let y = joinYear; y <= currentYear && remainingMoney > 0; y++) {
            const startM = y === joinYear ? joinMonth : 1;
            const endM = y === currentYear ? currentMonth : 12;

            for (let m = startM; m <= endM && remainingMoney > 0; m++) {
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

                const payThis = Math.min(remainingMoney, fee);
                sub.amount_paid = payThis;
                sub.due_amount = fee - payThis;
                sub.status = sub.due_amount <= 0 ? 'Paid' : (payThis > 0 ? 'Partial' : 'Unpaid');
                sub.last_payment_date = defaultPayDate || (y + '-' + String(m).padStart(2, '0') + '-01');
                sub.receipt_no = defaultReceipt;
                
                remainingMoney -= payThis;
                stateChanged = true;
            }
        }

        // 5. Step C: Only if remainingMoney > 0 after paying all months up to current month, apply to future months (October+)
        if (remainingMoney > 0) {
            member.advance_balance = remainingMoney;
            
            let futYear = currentYear;
            let futMonth = currentMonth + 1;
            
            while (remainingMoney > 0) {
                if (futMonth > 12) {
                    futMonth = 1;
                    futYear++;
                }

                let sub = (state.subscriptions || []).find(s => s.member_id === memberId && s.year === futYear && s.month === futMonth);
                if (!sub) {
                    sub = {
                        id: 'sub-' + memberId + '-' + futYear + '-' + futMonth,
                        member_id: memberId,
                        year: futYear,
                        month: futMonth,
                        amount_paid: 0,
                        due_amount: fee,
                        status: 'Unpaid',
                        last_payment_date: ''
                    };
                    state.subscriptions.push(sub);
                }

                const payFut = Math.min(remainingMoney, fee);
                sub.amount_paid = payFut;
                sub.due_amount = fee - payFut;
                sub.status = sub.due_amount <= 0 ? 'Paid' : 'Partial';
                sub.last_payment_date = defaultPayDate || (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01');
                sub.receipt_no = 'ADVANCE';

                remainingMoney -= payFut;
                futMonth++;
                stateChanged = true;
                if (futYear > currentYear + 2) break;
            }
        } else {
            // Exactly paid up to current month (or partial), NO advance in October+!
            member.advance_balance = 0;
            
            // Ensure all future months are clean with amount_paid = 0
            (state.subscriptions || []).forEach(sub => {
                if (sub.member_id === memberId && (sub.year > currentYear || (sub.year === currentYear && sub.month > currentMonth))) {
                    if (parseFloat(sub.amount_paid || 0) > 0) {
                        sub.amount_paid = 0;
                        sub.due_amount = fee;
                        sub.status = 'Unpaid';
                        sub.receipt_no = '';
                        sub.last_payment_date = '';
                        stateChanged = true;
                    }
                }
            });
        }
    });

    return stateChanged;
}
`;

// Replace reconcileMemberDuesAndAdvances with reconcileAllMemberSubscriptions
if (code.includes('function reconcileMemberDuesAndAdvances() {')) {
    const idx1 = code.indexOf('// Universal Reconciler');
    const startIdx = idx1 !== -1 ? idx1 : code.indexOf('function reconcileMemberDuesAndAdvances() {');
    const endIdx = code.indexOf('function fixImamSalaryTransactionDate() {');
    
    code = code.substring(0, startIdx).trimEnd() + '\n\n' + rebuildEngine + '\n\n' + code.substring(endIdx);
    console.log('✅ Replaced with reconcileAllMemberSubscriptions engine');
} else {
    code = rebuildEngine + '\n' + code;
    console.log('✅ Added reconcileAllMemberSubscriptions engine');
}

// Update loadState to call reconcileAllMemberSubscriptions
if (code.includes('const reconciledDues = reconcileMemberDuesAndAdvances();')) {
    code = code.replace('const reconciledDues = reconcileMemberDuesAndAdvances();', 'const reconciledDues = reconcileAllMemberSubscriptions();');
}

// Update syncStateFromCloud to call reconcileAllMemberSubscriptions
if (code.includes('reconcileMemberDuesAndAdvances();')) {
    code = code.replace('reconcileMemberDuesAndAdvances();', 'reconcileAllMemberSubscriptions();');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully saved');
