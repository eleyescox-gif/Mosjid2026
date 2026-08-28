const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. Add deduplicateTransactions helper function at top
const deduplicateFunc = `
// Universal Transaction Deduplicator (Removes accidental double-postings)
function deduplicateTransactions() {
    if (!state.transactions || !Array.isArray(state.transactions)) return false;
    
    const seenReceipts = new Set();
    const cleanTransactions = [];
    let hasDuplicates = false;

    state.transactions.forEach(tx => {
        if (!tx) return;
        const rNo = tx.receipt_no ? String(tx.receipt_no).trim() : '';
        const memberId = tx.member_id || '';
        const txDate = tx.date || '';
        const amt = parseFloat(tx.amount || 0).toFixed(2);
        
        // If it's a member fee income with a valid receipt number
        if (tx.transaction_type === 'INCOME' && rNo && rNo !== '—' && rNo.toUpperCase() !== 'ADVANCE') {
            const key = 'M_' + memberId + '_R_' + rNo + '_D_' + txDate + '_A_' + amt;
            if (!seenReceipts.has(key)) {
                seenReceipts.add(key);
                cleanTransactions.push(tx);
            } else {
                hasDuplicates = true;
                console.warn('Auto-removing duplicate transaction entry:', tx);
            }
        } else {
            cleanTransactions.push(tx);
        }
    });

    if (hasDuplicates) {
        state.transactions = cleanTransactions;
        return true;
    }
    return false;
}
`;

// Insert deduplicateFunc after window.state = state;
if (!code.includes('function deduplicateTransactions')) {
    code = code.replace('window.state = state;', 'window.state = state;\n' + deduplicateFunc);
    console.log('✅ Added deduplicateTransactions function');
}

// 2. Call deduplicateTransactions inside loadState() and syncStateFromCloud()
if (code.includes('// Process any pending advance payments')) {
    code = code.replace(
        '// Process any pending advance payments',
        '// Auto-clean any accidental double-posting\n    if (deduplicateTransactions()) { saveState(); }\n    \n    // Process any pending advance payments'
    );
    console.log('✅ Added deduplicateTransactions in loadState()');
}

if (code.includes('state.transactions = ensureArray(cloudState.transactions);')) {
    code = code.replace(
        'state.transactions = ensureArray(cloudState.transactions);',
        'state.transactions = ensureArray(cloudState.transactions);\n    deduplicateTransactions();'
    );
    console.log('✅ Added deduplicateTransactions in syncStateFromCloud()');
}

// 3. Add Duplicate Check and Double-Click Protection in handleEasyPaymentSubmit
const oldEasyPayStart = `function handleEasyPaymentSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;`;

const newEasyPayStart = `function handleEasyPaymentSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;

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

if (code.includes(oldEasyPayStart)) {
    code = code.replace(oldEasyPayStart, newEasyPayStart);
    console.log('✅ Added duplicate check & double-click protection in handleEasyPaymentSubmit');
}

// 4. Update generateMonthlyMemberCollectionReport to have explicit deduplication
const oldLoop = `        (state.transactions || []).forEach(tx => {
            if (tx.transaction_type !== 'INCOME') return;
            const txDate = tx.date || '';
            
            // STRICT FILTER: Transaction date must strictly belong to this selected month!
            if (!txDate.startsWith(monthPrefix)) return;

            const isMemberFee = (tx.member_id && state.members.some(m => m.id === tx.member_id)) ||
                                tx.category === 'Subscription' ||
                                tx.category === 'সদস্য চাঁদা' ||
                                tx.category === 'মাসিক চাঁদা' ||
                                tx.is_member_fee;

            const txMode = (tx.payment_mode === 'BANK' || tx.payment_method === 'BANK') ? 'BANK' : 'CASH';
            if (customMode && customMode !== 'ALL' && customMode !== txMode) return;

            if (isMemberFee && parseFloat(tx.amount || 0) > 0) {
                const member = (state.members || []).find(m => m.id === tx.member_id);
                
                // Never include phantom/internal deduction markers as receipt number
                let cleanReceiptNo = tx.receipt_no ? String(tx.receipt_no).trim() : '';
                if (cleanReceiptNo.toUpperCase() === 'ADVANCE' || cleanReceiptNo === '—') {
                    cleanReceiptNo = '';
                }

                receiptList.push({`;

const newLoop = `        const seenReceiptKeys = new Set();

        (state.transactions || []).forEach(tx => {
            if (tx.transaction_type !== 'INCOME') return;
            const txDate = tx.date || '';
            
            // STRICT FILTER: Transaction date must strictly belong to this selected month!
            if (!txDate.startsWith(monthPrefix)) return;

            const isMemberFee = (tx.member_id && state.members.some(m => m.id === tx.member_id)) ||
                                tx.category === 'Subscription' ||
                                tx.category === 'সদস্য চাঁদা' ||
                                tx.category === 'মাসিক চাঁদা' ||
                                tx.is_member_fee;

            const txMode = (tx.payment_mode === 'BANK' || tx.payment_method === 'BANK') ? 'BANK' : 'CASH';
            if (customMode && customMode !== 'ALL' && customMode !== txMode) return;

            if (isMemberFee && parseFloat(tx.amount || 0) > 0) {
                const member = (state.members || []).find(m => m.id === tx.member_id);
                
                // Never include phantom/internal deduction markers as receipt number
                let cleanReceiptNo = tx.receipt_no ? String(tx.receipt_no).trim() : '';
                if (cleanReceiptNo.toUpperCase() === 'ADVANCE' || cleanReceiptNo === '—') {
                    cleanReceiptNo = '';
                }

                // DEDUPLICATION: Prevent any duplicate entry from showing twice
                const dedupeKey = cleanReceiptNo ? 
                    ('M_' + (tx.member_id || '') + '_R_' + cleanReceiptNo + '_D_' + txDate + '_A_' + parseFloat(tx.amount || 0).toFixed(2)) : 
                    ('TX_' + tx.id);

                if (seenReceiptKeys.has(dedupeKey)) {
                    return; // Skip duplicate!
                }
                seenReceiptKeys.add(dedupeKey);

                receiptList.push({`;

if (code.includes(oldLoop)) {
    code = code.replace(oldLoop, newLoop);
    console.log('✅ Added deduplication in generateMonthlyMemberCollectionReport loop');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully updated');
