const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');

console.log('=== MOSQUE APP LOGIC AUDIT ===\n');

// 1. Check generateAdvancedPrintReport function scope
const funcStart = code.indexOf('function generateAdvancedPrintReport()');
const nextFunc = code.indexOf('\nfunction ', funcStart + 100);
console.log('1. generateAdvancedPrintReport spans:', funcStart, '->', nextFunc);

const padHeaderInsideReport = code.indexOf('function getPadHeaderHTML', funcStart);
const padCSSInsideReport = code.indexOf('function getPadCSS', funcStart);
console.log('   getPadHeaderHTML defined inside generateAdvancedPrintReport:', 
    padHeaderInsideReport > -1 && padHeaderInsideReport < nextFunc ? 'BUG: YES (nested function)' : 'OK (external)');
console.log('   getPadCSS defined inside generateAdvancedPrintReport:', 
    padCSSInsideReport > -1 && padCSSInsideReport < nextFunc ? 'BUG: YES (nested function)' : 'OK (external)');

// 2. Check selectedYear usage in generateAdvancedPrintReport  
const selYearInReport = code.indexOf('selectedYear', funcStart);
if (selYearInReport > -1 && selYearInReport < nextFunc + 10000) {
    console.log('\n2. selectedYear used in generateAdvancedPrintReport context:');
    console.log('   POTENTIAL BUG: selectedYear is used but may not be defined in scope!');
    console.log('   Context:', code.substring(selYearInReport - 20, selYearInReport + 60));
} else {
    console.log('\n2. selectedYear: OK (not used in generateAdvancedPrintReport)');
}

// 3. Member ID collision risk
const newIdIdx = code.indexOf("newId = 'member-' + (state.members.length + 1)");
console.log('\n3. Member ID generation (collision risk):');
if (newIdIdx > -1) {
    console.log('   Using state.members.length + 1 for ID - RISK of collision when members are deleted!');
    console.log('   Better approach: use Date.now() or UUID');
}

// 4. Receipt number empty check  
const receiptEmptyCheck = code.indexOf('!receiptNo');
console.log('\n4. Receipt number empty validation:', receiptEmptyCheck > -1 ? 'HAS check' : 'NO check - payments can have empty receipt numbers');

// 5. Check if handleEasyPaymentSubmit validates receipt number
const easyPayFunc = code.indexOf('function handleEasyPaymentSubmit');
const easyPayEnd = code.indexOf('\nfunction ', easyPayFunc + 100);
const receiptInEasy = code.substring(easyPayFunc, easyPayEnd).indexOf('receiptNo');
console.log('\n5. Receipt No handling in handleEasyPaymentSubmit:', receiptInEasy > -1 ? 'Present' : 'Missing');

// 6. Check for NaN safety in calculateMemberTotalDue
const dueFunc = code.indexOf('function calculateMemberTotalDue');
const dueFuncEnd = code.indexOf('\nfunction ', dueFunc + 100);
const nanCheck = code.substring(dueFunc, dueFuncEnd).includes('isNaN') || 
                 code.substring(dueFunc, dueFuncEnd).includes('parseFloat');
console.log('\n6. NaN safety in calculateMemberTotalDue:', nanCheck ? 'Has parseFloat' : 'Potential NaN risk');

// 7. Check processAdvanceDeductions infinite loop protection
const advFunc = code.indexOf('function processAdvanceDeductions');
const advFuncEnd = code.indexOf('\nfunction ', advFunc + 100);
const hasBreak = code.substring(advFunc, advFuncEnd).includes('break');
const hasFutureLimit = code.substring(advFunc, advFuncEnd).includes('+ 2');
console.log('\n7. Advance deduction infinite loop protection:', 
    hasBreak && hasFutureLimit ? 'OK (has year+2 limit and break)' : 'POTENTIAL infinite loop risk!');

// 8. Check login - double logging issue 
const loginFunc = code.indexOf('function handleLogin');
const loginEnd = code.indexOf('\nfunction ', loginFunc + 100);
const masterCheck = code.substring(loginFunc, loginEnd).includes('DEFAULT_USERS');
const stateCheck = code.substring(loginFunc, loginEnd).includes('state.users');
console.log('\n8. Login uses master override + state check:', masterCheck && stateCheck ? 'OK' : 'Issue with login');

// 9. Check committee add function
const commSubmit = code.indexOf('function handleAddCommitteeSubmit');
if (commSubmit > -1) {
    const commEnd = code.indexOf('\nfunction ', commSubmit + 100);
    const hasSaveState = code.substring(commSubmit, commEnd).includes('saveState()');
    const hasRefresh = code.substring(commSubmit, commEnd).includes('refreshAppUI') || 
                       code.substring(commSubmit, commEnd).includes('renderCommitteeView');
    console.log('\n9. handleAddCommitteeSubmit - saveState:', hasSaveState ? 'OK' : 'BUG: missing saveState!');
    console.log('   handleAddCommitteeSubmit - refreshUI:', hasRefresh ? 'OK' : 'BUG: missing refresh!');
} else {
    console.log('\n9. handleAddCommitteeSubmit: NOT FOUND - missing function!');
}

// 10. Check switchView for committee tab
const switchViewFunc = code.indexOf('function switchView');
const switchViewEnd = code.indexOf('\nfunction ', switchViewFunc + 100);
const hasCommitteeView = code.substring(switchViewFunc, switchViewEnd).includes('committee');
console.log('\n10. switchView handles committee tab:', hasCommitteeView ? 'OK' : 'Missing committee case!');

// 11. Check for potential XSS in innerHTML assignments  
const innerHTMLCount = (code.match(/\.innerHTML\s*=/g) || []).length;
console.log('\n11. innerHTML assignments (XSS potential):', innerHTMLCount, 
    '(acceptable for trusted data app, user data should be sanitized)');

// 12. Check saveState completeness
const saveStateFunc = code.indexOf('function saveState');
const saveStateEnd = code.indexOf('\nfunction ', saveStateFunc + 100);
const saveStateBody = code.substring(saveStateFunc, saveStateEnd);
const saves = ['mosque_members', 'mosque_transactions', 'mosque_subscriptions', 
               'mosque_users', 'mosque_settings', 'mosque_committee', 'mosque_global_recycle_bin'];
console.log('\n12. saveState completeness:');
saves.forEach(key => {
    const found = saveStateBody.includes(key);
    console.log('   ' + key + ':', found ? 'OK' : 'MISSING!');
});

// 13. Check cleanupPermanentlyDeletedMembers function
const cleanupFunc = code.indexOf('function cleanupPermanentlyDeletedMembers');
console.log('\n13. cleanupPermanentlyDeletedMembers exists:', cleanupFunc > -1 ? 'OK' : 'MISSING - called in loadState but not defined!');

// 14. Check printMemberStatement function
const printMemberStatement = code.indexOf('function printMemberStatement');
console.log('\n14. printMemberStatement exists:', printMemberStatement > -1 ? 'OK' : 'MISSING');

// 15. Check renderCommitteeView function
const renderCommView = code.indexOf('function renderCommitteeView');
console.log('\n15. renderCommitteeView exists:', renderCommView > -1 ? 'OK' : 'MISSING');

// 16. Check filterCommitteeCategory function
const filterComm = code.indexOf('function filterCommitteeCategory');
console.log('\n16. filterCommitteeCategory exists:', filterComm > -1 ? 'OK' : 'MISSING');

// 17. Check renderCommitteeDashboard function
const renderCommDash = code.indexOf('function renderCommitteeDashboard');
console.log('\n17. renderCommitteeDashboard exists:', renderCommDash > -1 ? 'OK' : 'MISSING');

// 18. Sub-id collision check
const subIdPattern = code.indexOf("id: `sub-\${memberId}-\${year}-\${m}`");
console.log('\n18. Subscription ID pattern (may duplicate if sub already exists):');
// Check if subscriptions are checked before push
const beforePush = code.substring(subIdPattern - 200, subIdPattern + 50);
console.log('   Context has find() before push:', beforePush.includes('.find(') ? 'OK' : 'Risk of duplicate sub records');

console.log('\n=== AUDIT COMPLETE ===');
