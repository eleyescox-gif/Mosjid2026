const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Replace order of pad-subbar-row and pad-divider-line
const target1 = '<div class="pad-subbar-row">';
const target2 = '<div class="pad-divider-line"></div>';

if (code.includes(target1) && code.includes(target2)) {
    const idx1 = code.indexOf(target1);
    const idx2 = code.indexOf(target2, idx1);
    
    if (idx1 !== -1 && idx2 !== -1) {
        const subbarBlock = code.substring(idx1, idx2).trimEnd();
        const dividerBlock = '<div class="pad-divider-line"></div>';
        
        // Construct new header HTML layout
        const oldSection = code.substring(idx1, idx2 + dividerBlock.length);
        const newSection = dividerBlock + '\n        ' + subbarBlock;
        
        code = code.replace(oldSection, newSection);
        console.log('✅ Swapped pad-divider-line to sit ABOVE pad-subbar-row');
    }
}

// Update CSS rules
const oldCss1 = ".pad-subbar-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #111; margin-top: 6px; padding: 2px 2px; font-weight: 600; }";
const oldCss2 = ".pad-divider-line { border-bottom: 3px double #000; margin-top: 4px; margin-bottom: 12px; }";

const newCss1 = ".pad-divider-line { border-bottom: 3px double #000; margin-top: 6px; margin-bottom: 6px; }";
const newCss2 = ".pad-subbar-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #111; margin-top: 4px; margin-bottom: 14px; padding: 0 2px; font-weight: 600; }";

if (code.includes(oldCss1)) {
    code = code.replace(oldCss1, newCss1);
}
if (code.includes(oldCss2)) {
    code = code.replace(oldCss2, newCss2);
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js updated successfully');
