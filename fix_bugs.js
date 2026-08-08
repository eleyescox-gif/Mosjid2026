const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Fix Bug 1: selectedYear undefined in generateAdvancedPrintReport
// Replace the exact bytes in the file
const bugStr = "englishToBanglaNum(selectedYear.toString()))}\r\n<div class=\"sstrip\">";
const fixStr = "englishToBanglaNum(startDate.substring(0,4)))}\r\n<div class=\"sstrip\">";

if (code.includes(bugStr)) {
    code = code.replace(bugStr, fixStr);
    console.log('Bug 1 FIXED: selectedYear replaced with startDate.substring(0,4)');
} else {
    // Try without \r\n
    const bugStr2 = "englishToBanglaNum(selectedYear.toString()))}\n<div class=\"sstrip\">";
    const fixStr2 = "englishToBanglaNum(startDate.substring(0,4)))}\n<div class=\"sstrip\">";
    if (code.includes(bugStr2)) {
        code = code.replace(bugStr2, fixStr2);
        console.log('Bug 1 FIXED (LF version): selectedYear replaced with startDate.substring(0,4)');
    } else {
        console.log('Bug 1: Could not find exact string, trying partial match...');
        const idx = code.indexOf('selectedYear.toString()');
        if (idx > -1) {
            // Find the surrounding template literal context
            const before = code.substring(idx - 100, idx + 200);
            console.log('Context:', JSON.stringify(before));
        }
    }
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('File saved.');
