const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. txAmount input field
html = html.replace(
    '<input type="number" id="txAmount" class="form-control" placeholder="যেমন: ৫০০" required min="1">',
    '<input type="number" id="txAmount" class="form-control" placeholder="যেমন: ৫০০.০০" required min="0.01" step="any">'
);

// 2. Initial bank & cash balances
html = html.replace(
    '<input type="number" id="setInitialBankBalance" class="form-control" min="0" value="0" required>',
    '<input type="number" id="setInitialBankBalance" class="form-control" min="0" step="any" value="0" required>'
);
html = html.replace(
    '<input type="number" id="setInitialCashBalance" class="form-control" min="0" value="0" required>',
    '<input type="number" id="setInitialCashBalance" class="form-control" min="0" step="any" value="0" required>'
);

// 3. Member custom fee
html = html.replace(
    '<input type="number" id="mCustomFee" class="form-control" value="150" min="0" required>',
    '<input type="number" id="mCustomFee" class="form-control" value="150" min="0" step="any" required>'
);

// 4. Easy payment amount
html = html.replace(
    '<input type="number" id="epAmount" class="form-control" placeholder="টাকা লিখুন" required min="1"',
    '<input type="number" id="epAmount" class="form-control" placeholder="টাকা লিখুন" required min="0.01" step="any"'
);

// 5. President waiver amount
html = html.replace(
    '<input type="number" id="wpAmount" class="form-control" placeholder="মওকুফের পরিমাণ লিখুন" required min="1">',
    '<input type="number" id="wpAmount" class="form-control" placeholder="মওকুফের পরিমাণ লিখুন" required min="0.01" step="any">'
);

// 6. Arrears adjustment amount
html = html.replace(
    '<input type="number" id="adjAmount" class="form-control" placeholder="টাকা লিখুন" required min="1"',
    '<input type="number" id="adjAmount" class="form-control" placeholder="টাকা লিখুন" required min="0.01" step="any"'
);

fs.writeFileSync('index.html', html, 'utf8');
console.log('✅ index.html updated with step="any" for floating/decimal amounts like 2.8');
