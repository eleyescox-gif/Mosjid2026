const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// The broken section looks like:
// function openModal(modalId) {
//     document.getElementById(modalId).classList.add('active');
// }
//     const type = document.getElementById('mType').value;
//     ...

const brokenPattern = `function openModal(modalId) {\r\n    document.getElementById(modalId).classList.add('active');\r\n}\r\n    const type = document.getElementById('mType').value;\r\n    const customFee = document.getElementById('mCustomFee');\r\n    if (type === 'General') customFee.value = 150;\r\n    else if (type === 'Poor') customFee.value = 100;\r\n    else if (type === 'Free') customFee.value = 0;\r\n}`;

const fixedCode = `function openModal(modalId) {\r\n    document.getElementById(modalId).classList.add('active');\r\n}\r\n\r\nfunction closeModal(modalId) {\r\n    document.getElementById(modalId).classList.remove('active');\r\n}\r\n\r\nfunction closeModalOnOverlay(e) {\r\n    if (e.target.classList.contains('modal-overlay')) {\r\n        e.target.classList.remove('active');\r\n    }\r\n}\r\n\r\n// Add Member Fee Auto Adjuster\r\nfunction adjustFeeAmountInput() {\r\n    const type = document.getElementById('mType').value;\r\n    const customFee = document.getElementById('mCustomFee');\r\n    if (type === 'General') customFee.value = 150;\r\n    else if (type === 'Poor') customFee.value = 100;\r\n    else if (type === 'Free') customFee.value = 0;\r\n}`;

if (code.includes(brokenPattern)) {
    code = code.replace(brokenPattern, fixedCode);
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ Fixed: closeModal, closeModalOnOverlay, adjustFeeAmountInput restored');
} else {
    console.log('❌ Broken pattern not found. Checking current state...');
    
    // Check if the functions already exist
    const hasCloseModal = code.includes('function closeModal(');
    const hasCloseModalOnOverlay = code.includes('function closeModalOnOverlay(');
    const hasAdjustFee = code.includes('function adjustFeeAmountInput(');
    
    console.log('closeModal exists:', hasCloseModal);
    console.log('closeModalOnOverlay exists:', hasCloseModalOnOverlay);
    console.log('adjustFeeAmountInput exists:', hasAdjustFee);
}
