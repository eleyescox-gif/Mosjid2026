const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Target 1: Swap order of pad-subbar-row and pad-divider-line in getPadHeaderHTML
const oldHeaderHTML = `        <div class="pad-subbar-row">
            <div class="pad-memo-ref">\${fullRefNo}</div>
            <div class="pad-publish-date"><strong>প্রকাশ তারিখ:</strong> \${printDate}</div>
        </div>
        <div class="pad-divider-line"></div>`;

const newHeaderHTML = `        <div class="pad-divider-line"></div>
        <div class="pad-subbar-row">
            <div class="pad-memo-ref">\${fullRefNo}</div>
            <div class="pad-publish-date"><strong>প্রকাশ তারিখ:</strong> \${printDate}</div>
        </div>`;

// Target 2: Adjust CSS margins in getPadCSS so divider line sits cleanly above subbar row
const oldCSS = `.pad-subbar-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #111; margin-top: 6px; padding: 2px 2px; font-weight: 600; }
    .pad-divider-line { border-bottom: 3px double #000; margin-top: 4px; margin-bottom: 12px; }`;

const newCSS = `.pad-divider-line { border-bottom: 3px double #000; margin-top: 6px; margin-bottom: 6px; }
    .pad-subbar-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #111; margin-top: 4px; margin-bottom: 14px; padding: 0 2px; font-weight: 600; }`;

let updated = false;

if (code.includes(oldHeaderHTML)) {
    code = code.replace(oldHeaderHTML, newHeaderHTML);
    console.log('✅ Swapped pad-divider-line and pad-subbar-row order in getPadHeaderHTML');
    updated = true;
} else {
    console.log('❌ oldHeaderHTML not found');
}

if (code.includes(oldCSS)) {
    code = code.replace(oldCSS, newCSS);
    console.log('✅ Updated pad-divider-line and pad-subbar-row CSS margins in getPadCSS');
    updated = true;
} else {
    console.log('❌ oldCSS not found');
}

if (updated) {
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ app.js successfully saved');
}
