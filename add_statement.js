const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const insertBefore = '// Open Member Details (Hides monthly calendar grid as requested)\r\nfunction openMemberDetails(memberId) {';

const newFunctions = `// ================== MEMBER TRANSACTION STATEMENT ==================

// Global variable to track active statement member
var statementActiveMemberId = null;

function showMemberStatement(memberId) {
    var member = state.members.find(function(m) { return m.id === memberId; });
    if (!member) return;

    statementActiveMemberId = memberId;

    // Set member info in the modal header
    var realIndex = state.members.findIndex(function(m) { return m.id === member.id; }) + 1;
    var memberNum = englishToBanglaNum(String(realIndex).padStart(2, '0'));

    document.getElementById('statementModalName').innerHTML = '<i class="fa-solid fa-file-lines" style="margin-right:6px;"></i> লেনদেন বিবরণী';
    document.getElementById('stmtMemberName').innerHTML = member.name + ' <small style="color:var(--text-muted);font-weight:normal;">(সদস্য নং: ' + memberNum + ')</small>';
    document.getElementById('stmtMemberPhone').innerHTML = '<i class="fa-solid fa-phone"></i> ' + (member.phone ? englishToBanglaNum(member.phone) : '—');

    var typeClass = 'general';
    var typeLabel = 'সাধারণ';
    if (member.member_type === 'Poor') { typeClass = 'poor'; typeLabel = 'দরিদ্র'; }
    else if (member.member_type === 'Free') { typeClass = 'free'; typeLabel = 'ফ্রি (মওকুফ)'; }
    document.getElementById('stmtMemberType').innerHTML = '<span class="member-type-badge ' + typeClass + '">' + typeLabel + ' - ৳ ' + englishToBanglaNum((member.monthly_fee || 0).toString()) + '</span>';

    // Populate year selector dynamically
    var yearSelect = document.getElementById('statementYearSelect');
    var currentYear = new Date().getFullYear();
    var joinParts = (member.join_date || '2025-01-01').split('-');
    var joinYear = parseInt(joinParts[0]) || 2025;
    var startYear = Math.min(joinYear, 2025);
    var endYear = currentYear + 1;

    yearSelect.innerHTML = '';
    for (var y = endYear; y >= startYear; y--) {
        var opt = document.createElement('option');
        opt.value = y;
        opt.textContent = englishToBanglaNum(y.toString());
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // Set advance balance
    var advanceVal = parseFloat(member.advance_balance || 0);
    document.getElementById('stmtAdvanceBalance').innerHTML = advanceVal > 0 
        ? '৳ ' + englishToBanglaNum(advanceVal.toFixed(0)) 
        : '৳ ০';

    // Render the table for the selected year
    renderStatementTable();

    openModal('member-statement-modal');
}

function renderStatementTable() {
    var memberId = statementActiveMemberId;
    if (!memberId) return;

    var member = state.members.find(function(m) { return m.id === memberId; });
    if (!member) return;

    var yearSelect = document.getElementById('statementYearSelect');
    var selectedYear = parseInt(yearSelect.value) || new Date().getFullYear();

    var months = ['জানুয়ারি', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth() + 1;

    var joinParts = (member.join_date || '2025-01-01').split('-');
    var joinYear = parseInt(joinParts[0]) || 2025;
    var joinMonth = parseInt(joinParts[1]) || 1;
    var fee = member.member_type === 'Free' ? 0 : (parseFloat(member.monthly_fee) || 0);

    // Calculate opening arrears before selectedYear
    var runningArrear = parseFloat(member.opening_arrears || 0);
    if (joinYear < selectedYear) {
        for (var yy = joinYear; yy < selectedYear; yy++) {
            var sM = yy === joinYear ? joinMonth : 1;
            for (var mm = sM; mm <= 12; mm++) {
                var subPrev = state.subscriptions.find(function(s) { return s.member_id === memberId && s.year === yy && s.month === mm; });
                var monthFee = member.member_type === 'Free' ? 0 : (parseFloat(member.monthly_fee) || 0);
                var paidPrev = subPrev ? parseFloat(subPrev.amount_paid || 0) : 0;
                runningArrear = (runningArrear + monthFee) - paidPrev;
                if (runningArrear < 0) runningArrear = 0;
            }
        }
    }

    var openingArrearForYear = runningArrear;
    var totalPaidSum = 0;
    var totalFeeSum = 0;
    var finalDue = 0;

    var tbody = document.getElementById('statementTableBody');
    tbody.innerHTML = '';

    // Opening arrears row if applicable
    if (openingArrearForYear > 0) {
        var arrearRow = document.createElement('tr');
        arrearRow.style.cssText = 'background: #fff8e1; font-style: italic;';
        arrearRow.innerHTML = '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color); font-weight:bold; color:#e65100;">পূর্ববর্তী বকেয়া</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color);">—</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color);">—</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color);">—</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color);">—</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color); font-weight:bold; color:#e65100;">৳ ' + englishToBanglaNum(openingArrearForYear.toFixed(0)) + '</td>';
        tbody.appendChild(arrearRow);
    }

    for (var i = 0; i < months.length; i++) {
        var monthName = months[i];
        var mNum = i + 1;
        var isFutureMonth = (selectedYear > currentYear) || (selectedYear === currentYear && mNum > currentMonth);
        var isBeforeJoin = (selectedYear === joinYear && mNum < joinMonth) || (selectedYear < joinYear);

        var sub = state.subscriptions.find(function(s) { return s.member_id === memberId && s.year === selectedYear && s.month === mNum; });

        var monthlyFee = fee;
        var paid = sub ? parseFloat(sub.amount_paid || 0) : 0;
        var receiptNo = sub && sub.receipt_no ? englishToBanglaNum(sub.receipt_no.toString()) : '—';

        var collector = sub && sub.collector ? sub.collector : '';
        if (!collector && sub && sub.last_payment_date) {
            var matchingTx = state.transactions.find(function(t) { return t.member_id === memberId && t.date === sub.last_payment_date; });
            if (matchingTx) collector = matchingTx.created_by || matchingTx.collected_by || '';
        }

        var statusText = '';
        var rowStyle = '';

        if (isBeforeJoin) {
            rowStyle = 'background-color: #f9f9f9; color: #ccc;';
            statusText = '<span style="color:#ccc;">—</span>';
            monthlyFee = 0;
            paid = 0;
        } else if (isFutureMonth) {
            rowStyle = 'background-color: #fafafa; color: #999;';
            if (paid > 0) {
                statusText = '<span style="color:#1b5e20; font-weight:bold;">পরিশোধিত (অগ্রিম)</span>';
                totalPaidSum += paid;
            } else {
                statusText = '<span style="color:#999;">আসন্ন</span>';
            }
            monthlyFee = 0;
        } else {
            var currentMonthBokia = runningArrear;
            var totalClaim = currentMonthBokia + monthlyFee;
            var remainingDue = Math.max(0, totalClaim - paid);

            runningArrear = remainingDue;
            totalFeeSum += monthlyFee;
            totalPaidSum += paid;

            if (member.member_type === 'Free') {
                statusText = '<span style="color:#1565c0; font-weight:bold;">মওকুফ</span>';
            } else if (remainingDue > 0) {
                statusText = '<span style="color:#b71c1c; font-weight:700;">৳ ' + englishToBanglaNum(remainingDue.toFixed(0)) + '</span>';
            } else {
                statusText = '<span style="color:#1b5e20; font-weight:700;">পরিশোধিত ✓</span>';
            }
        }

        finalDue = runningArrear;

        var tr = document.createElement('tr');
        tr.style.cssText = rowStyle;
        tr.innerHTML = '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color); font-weight:600;">' + monthName + '</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color);">' + (!isBeforeJoin && !isFutureMonth && monthlyFee > 0 ? '৳ ' + englishToBanglaNum(monthlyFee.toFixed(0)) : '—') + '</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color); font-weight:' + (paid > 0 ? '700' : '400') + '; color:' + (paid > 0 ? '#1b5e20' : 'inherit') + ';">' + (paid > 0 ? '৳ ' + englishToBanglaNum(paid.toFixed(0)) : '—') + '</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color);">' + (isBeforeJoin ? '—' : receiptNo) + '</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color); font-size:11px;">' + (collector || '—') + '</td>' +
            '<td style="padding:8px 10px; border-bottom:1px solid var(--border-color);">' + statusText + '</td>';
        tbody.appendChild(tr);
    }

    // Total row
    var totalRow = document.createElement('tr');
    totalRow.style.cssText = 'background: linear-gradient(135deg, #e8eaf6, #c5cae9); font-weight: bold; border-top: 2px solid var(--primary-color);';
    totalRow.innerHTML = '<td style="padding:10px; font-weight:800;">সর্বমোট</td>' +
        '<td style="padding:10px;">৳ ' + englishToBanglaNum(totalFeeSum.toFixed(0)) + '</td>' +
        '<td style="padding:10px; color:#1b5e20;">৳ ' + englishToBanglaNum(totalPaidSum.toFixed(0)) + '</td>' +
        '<td style="padding:10px;">—</td>' +
        '<td style="padding:10px;">—</td>' +
        '<td style="padding:10px; color:' + (finalDue > 0 ? '#b71c1c' : '#1b5e20') + '; font-weight:800;">' + (finalDue > 0 ? '৳ ' + englishToBanglaNum(finalDue.toFixed(0)) : 'পরিশোধিত ✓') + '</td>';
    tbody.appendChild(totalRow);

    // Update summary cards
    document.getElementById('stmtTotalPaid').innerHTML = '৳ ' + englishToBanglaNum(totalPaidSum.toFixed(0));
    document.getElementById('stmtTotalDue').innerHTML = finalDue > 0 ? '৳ ' + englishToBanglaNum(finalDue.toFixed(0)) : '৳ ০';

    var advanceVal = parseFloat(member.advance_balance || 0);
    document.getElementById('stmtAdvanceBalance').innerHTML = advanceVal > 0 
        ? '৳ ' + englishToBanglaNum(advanceVal.toFixed(0)) 
        : '৳ ০';
}

`;

if (code.includes(insertBefore)) {
    code = code.replace(insertBefore, newFunctions + insertBefore);
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ showMemberStatement and renderStatementTable functions added successfully');
} else {
    console.log('❌ Insert point not found');
}
