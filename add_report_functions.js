const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

let changesMade = 0;

// === CHANGE 1: Add adminIndividualReportSection visibility control ===
// Add it to the initial hide section (line ~615 area)
const hideMarker = "if (exportSec) exportSec.style.display = 'none';";
const hideAdd = `if (exportSec) exportSec.style.display = 'none';
    const individualReportSec = document.getElementById('adminIndividualReportSection');
    if (individualReportSec) individualReportSec.style.display = 'none';`;

if (code.includes(hideMarker) && !code.includes('individualReportSec')) {
    code = code.replace(hideMarker, hideAdd);
    changesMade++;
    console.log('✅ Change 1: Added individualReportSec hide logic');
}

// === CHANGE 2: Show for admin role ===
const showMarker = "if (exportSec) exportSec.style.display = 'block'; // Admin sees Excel export section";
const showAdd = `if (exportSec) exportSec.style.display = 'block'; // Admin sees Excel export section
        if (individualReportSec) individualReportSec.style.display = 'block'; // Admin sees individual report`;

if (code.includes(showMarker) && !code.includes('individualReportSec')) {
    // Already changed in step 1, let's check again
    code = code.replace(showMarker, showAdd);
    changesMade++;
    console.log('✅ Change 2: Added individualReportSec show for admin');
} else if (code.includes(showMarker.replace('export section', 'export section\n'))) {
    console.log('⚠️ Change 2: Marker variation detected, trying alternative');
}

// === CHANGE 3: Add the three JS functions before generateAllMembersKhata ===
const funcMarker = 'function generateAllMembersKhata() {';

const newFunctions = `// ================== ADMIN INDIVIDUAL MEMBER REPORT ==================

function filterAdminMemberDropdown() {
    var searchVal = (document.getElementById('adminMemberSearchInput').value || '').toLowerCase();
    var dropdown = document.getElementById('adminMemberDropdownList');
    dropdown.style.display = 'block';
    dropdown.innerHTML = '';

    var approvedActiveMembers = state.members.filter(function(m) {
        if (!m) return false;
        var st = (m.status || '').toLowerCase();
        return (st === 'active' || st === 'suspended' || st === '') && !m.delete_requested && !m.is_deleted;
    });

    var filtered = approvedActiveMembers.filter(function(m) {
        var realIndex = state.members.findIndex(function(mem) { return mem.id === m.id; }) + 1;
        var displayNum = String(realIndex).padStart(2, '0');
        var displayNumBN = englishToBanglaNum(displayNum);
        return m.name.toLowerCase().includes(searchVal) ||
               (m.phone && m.phone.includes(searchVal)) ||
               displayNum.includes(searchVal) ||
               displayNumBN.includes(searchVal);
    });

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">কোনো সদস্য পাওয়া যায়নি</div>';
        return;
    }

    filtered.forEach(function(m) {
        var realIndex = state.members.findIndex(function(mem) { return mem.id === m.id; }) + 1;
        var displayNum = String(realIndex).padStart(2, '0');
        var due = calculateMemberTotalDue(m.id);
        var advance = parseFloat(m.advance_balance || 0);

        var item = document.createElement('div');
        item.style.cssText = 'padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s;';
        item.onmouseenter = function() { this.style.backgroundColor = '#f0f7ff'; };
        item.onmouseleave = function() { this.style.backgroundColor = 'white'; };
        
        var statusHtml = '';
        if (advance > 0) {
            statusHtml = '<span style="color: #1b5e20; font-size: 11px; font-weight: 600;">অগ্রিম: ৳ ' + englishToBanglaNum(advance.toFixed(0)) + '</span>';
        } else if (due > 0) {
            statusHtml = '<span style="color: #b71c1c; font-size: 11px; font-weight: 600;">বকেয়া: ৳ ' + englishToBanglaNum(due.toFixed(0)) + '</span>';
        } else {
            statusHtml = '<span style="color: #1b5e20; font-size: 11px;">পরিশোধিত</span>';
        }

        item.innerHTML = '<div><strong style="font-size: 13px;">' + englishToBanglaNum(displayNum) + '. ' + m.name + '</strong><div style="font-size: 11px; color: var(--text-muted);">' + (m.phone ? englishToBanglaNum(m.phone) : '') + '</div></div><div>' + statusHtml + '</div>';

        item.onclick = function() {
            selectAdminMember(m.id);
        };
        dropdown.appendChild(item);
    });
}

function selectAdminMember(memberId) {
    var member = state.members.find(function(m) { return m.id === memberId; });
    if (!member) return;

    document.getElementById('adminSelectedMemberId').value = memberId;
    document.getElementById('adminMemberDropdownList').style.display = 'none';
    document.getElementById('adminMemberSearchInput').value = '';

    var realIndex = state.members.findIndex(function(m) { return m.id === member.id; }) + 1;
    var memberNum = englishToBanglaNum(String(realIndex).padStart(2, '0'));
    var due = calculateMemberTotalDue(memberId);
    var advance = parseFloat(member.advance_balance || 0);

    document.getElementById('adminSelectedMemberName').innerHTML = memberNum + '. ' + member.name;
    
    var metaText = (member.phone ? englishToBanglaNum(member.phone) : '—');
    if (advance > 0) {
        metaText += ' | অগ্রিম: ৳ ' + englishToBanglaNum(advance.toFixed(0));
    } else if (due > 0) {
        metaText += ' | বকেয়া: ৳ ' + englishToBanglaNum(due.toFixed(0));
    } else {
        metaText += ' | পরিশোধিত ✓';
    }
    document.getElementById('adminSelectedMemberMeta').innerHTML = metaText;
    document.getElementById('adminSelectedMemberInfo').style.display = 'block';
}

function clearAdminMemberSelection() {
    document.getElementById('adminSelectedMemberId').value = '';
    document.getElementById('adminSelectedMemberInfo').style.display = 'none';
    document.getElementById('adminMemberSearchInput').value = '';
}

function generateSingleMemberKhata() {
    var memberId = document.getElementById('adminSelectedMemberId').value;
    if (!memberId) {
        alert('অনুগ্রহ করে প্রথমে একজন সদস্য নির্বাচন করুন!');
        return;
    }

    var member = state.members.find(function(m) { return m.id === memberId; });
    if (!member) {
        alert('সদস্য খুঁজে পাওয়া যায়নি!');
        return;
    }

    var yearSelect = document.getElementById('adminIndividualYearSelect');
    var selectedYear = parseInt(yearSelect.value) || new Date().getFullYear();

    // Use generateAllMembersKhata logic but for a single member
    var months = ['জানুয়ারি', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth() + 1;

    var realIndex = state.members.findIndex(function(m) { return m.id === member.id; }) + 1;
    var memberNum = englishToBanglaNum(String(realIndex).padStart(2, '0'));

    var tableRows = '';
    var totalMonthlyFeeSum = 0;
    var totalClaimSum = 0;
    var totalPaidSum = 0;
    var totalRemainingDueSum = 0;

    // Opening arrears computation prior to selectedYear
    var runningArrear = parseFloat(member.opening_arrears || 0);
    var joinParts = (member.join_date || '2025-01-01').split('-');
    var joinYear = parseInt(joinParts[0]) || 2025;
    var joinMonth = parseInt(joinParts[1]) || 1;

    if (joinYear < selectedYear) {
        for (var y = joinYear; y < selectedYear; y++) {
            var sM = y === joinYear ? joinMonth : 1;
            for (var m = sM; m <= 12; m++) {
                var sub = state.subscriptions.find(function(s) { return s.member_id === member.id && s.year === y && s.month === m; });
                var fee = member.member_type === 'Free' ? 0 : (parseFloat(member.monthly_fee) || 0);
                var paid = sub ? parseFloat(sub.amount_paid || 0) : 0;
                runningArrear = (runningArrear + fee) - paid;
                if (runningArrear < 0) runningArrear = 0;
            }
        }
    }

    var initialBokiaForYear = runningArrear;

    months.forEach(function(monthName, index) {
        var mNum = index + 1;
        var isFutureMonth = (selectedYear > currentYear) || (selectedYear === currentYear && mNum > currentMonth);
        var sub = state.subscriptions.find(function(s) { return s.member_id === member.id && s.year === selectedYear && s.month === mNum; });

        var monthlyFee = member.member_type === 'Free' ? 0 : (parseFloat(member.monthly_fee) || 0);
        var paid = sub ? parseFloat(sub.amount_paid || 0) : 0;

        var currentMonthBokia = 0;
        var totalClaim = 0;
        var remainingDue = 0;
        var remainingDueText = '—';
        var receiptNo = sub && sub.receipt_no ? englishToBanglaNum(sub.receipt_no.toString()) : '';
        if (!receiptNo && sub && sub.status === 'Paid') receiptNo = '—';

        var collector = sub && sub.collector ? sub.collector : '';
        if (!collector && sub && sub.last_payment_date) {
            var matchingTx = state.transactions.find(function(t) { return t.member_id === member.id && t.date === sub.last_payment_date; });
            if (matchingTx) collector = matchingTx.created_by || matchingTx.collected_by || '';
        }

        if (isFutureMonth) {
            if (paid > 0) {
                remainingDueText = '<span style="color: #1b5e20;">পরিশোধিত (অগ্রিম)</span>';
                totalPaidSum += paid;
            } else {
                remainingDueText = '—';
            }
        } else {
            currentMonthBokia = runningArrear;
            totalClaim = currentMonthBokia + monthlyFee;
            remainingDue = totalClaim - paid;
            if (remainingDue < 0) remainingDue = 0;

            runningArrear = remainingDue;

            if (member.member_type === 'Free') {
                remainingDueText = '<span style="color: #1565c0;">মওকুফ</span>';
            } else if (remainingDue > 0) {
                remainingDueText = '<span style="color: #b71c1c; font-weight: 700;">৳ ' + englishToBanglaNum(remainingDue.toFixed(0)) + '</span>';
            } else {
                remainingDueText = '<span style="color: #1b5e20; font-weight: 700;">পরিশোধিত</span>';
            }

            totalMonthlyFeeSum += monthlyFee;
            totalClaimSum += totalClaim;
            totalPaidSum += paid;
            totalRemainingDueSum = remainingDue;
        }

        tableRows += '<tr style="' + (isFutureMonth ? 'background-color: #fafafa; color: #777;' : '') + '">' +
            '<td style="text-align: left; font-weight: bold;">' + monthName + (isFutureMonth ? ' <small style="font-weight:normal;color:#999;">(অগ্রিম)</small>' : '') + '</td>' +
            '<td>' + (!isFutureMonth && currentMonthBokia > 0 ? englishToBanglaNum(currentMonthBokia.toFixed(0)) : '—') + '</td>' +
            '<td>' + (!isFutureMonth && monthlyFee > 0 ? englishToBanglaNum(monthlyFee.toFixed(0)) : (isFutureMonth ? '—' : '০')) + '</td>' +
            '<td>' + (!isFutureMonth && totalClaim > 0 ? englishToBanglaNum(totalClaim.toFixed(0)) : '—') + '</td>' +
            '<td>' + (receiptNo || '—') + '</td>' +
            '<td>' + (paid > 0 ? englishToBanglaNum(paid.toFixed(0)) : '—') + '</td>' +
            '<td>' + remainingDueText + '</td>' +
            '<td>' + (collector || '—') + '</td>' +
            '</tr>';
    });

    // Total row
    var totalDueDisplay = totalRemainingDueSum > 0
        ? '<span style="color: #b71c1c; font-weight: 800;">৳ ' + englishToBanglaNum(totalRemainingDueSum.toFixed(0)) + '</span>'
        : '<span style="color: #1b5e20; font-weight: 800;">পরিশোধিত</span>';

    tableRows += '<tr style="font-weight: bold; background-color: #f0f4f1; border-top: 2px solid #000;">' +
        '<td style="text-align: left;">সর্ব মোট (বর্তমান মাস পর্যন্ত)</td>' +
        '<td>' + (initialBokiaForYear > 0 ? englishToBanglaNum(initialBokiaForYear.toFixed(0)) : '—') + '</td>' +
        '<td>' + (totalMonthlyFeeSum > 0 ? englishToBanglaNum(totalMonthlyFeeSum.toFixed(0)) : '০') + '</td>' +
        '<td>' + (totalClaimSum > 0 ? englishToBanglaNum(totalClaimSum.toFixed(0)) : '—') + '</td>' +
        '<td></td>' +
        '<td>' + (totalPaidSum > 0 ? englishToBanglaNum(totalPaidSum.toFixed(0)) : '০') + '</td>' +
        '<td>' + totalDueDisplay + '</td>' +
        '<td></td>' +
        '</tr>';

    var paidWords = totalPaidSum > 0 ? numberToBanglaWords(totalPaidSum) : 'শূন্য';

    var memberHtml = '<div class="khata-page">' +
        getPadHeaderHTML('মাসিক চাঁদা আদায় বহি (খাতা)', 'বছর: ' + englishToBanglaNum(selectedYear.toString()) + ' খ্রি: (বর্তমান মাস পর্যন্ত)', 'আদায়-খাতা/' + englishToBanglaNum(selectedYear.toString())) +
        '<div style="text-align: right; margin-top: -10px; margin-bottom: 10px;">' +
            '<span style="font-weight: bold; font-size: 13px; border: 1.5px solid #0f5132; padding: 3px 10px; border-radius: 6px; background: #f4faf6;">' +
                'সদস্য নং: ' + memberNum +
            '</span>' +
        '</div>' +
        '<div class="khata-top-info" style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; font-size: 14px; background: #fdfdfd; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">' +
            '<div>নাম: <span style="font-weight: normal; margin-left: 5px;">' + member.name + '</span></div>' +
            '<div>মোবাইল: <span style="font-weight: normal; margin-left: 5px;">' + (member.phone ? englishToBanglaNum(member.phone) : '—') + '</span></div>' +
            '<div>বর্তমান স্থিতি: <span style="margin-left: 5px;">' + (totalRemainingDueSum > 0 ? '<span style="color:#b71c1c;">বকেয়া ৳ ' + englishToBanglaNum(totalRemainingDueSum.toFixed(0)) + '</span>' : '<span style="color:#1b5e20;">পরিশোধিত</span>') + '</span></div>' +
        '</div>' +
        '<table><thead><tr>' +
            '<th style="width: 15%;">মাস</th>' +
            '<th style="width: 11%;">বকেয়া</th>' +
            '<th style="width: 13%;">মাসিক চাঁদা</th>' +
            '<th style="width: 12%;">মোট দাবী</th>' +
            '<th style="width: 13%;">রশিদ নম্বর</th>' +
            '<th style="width: 12%;">মোট আদায়</th>' +
            '<th style="width: 14%;">মোট বাকী / স্থিতি</th>' +
            '<th style="width: 10%;">আদায়কারী</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody></table>' +
        '<div class="khata-footer" style="margin-top: 20px; font-size: 13px; line-height: 1.8;">' +
            'উক্ত সদস্য থেকে ' + englishToBanglaNum(selectedYear.toString()) + ' সালে সর্ব মোট ' + (totalPaidSum > 0 ? englishToBanglaNum(totalPaidSum.toFixed(0)) : '০') + ' টাকা গ্রহণ করা হয়েছে। (কথায়: ' + paidWords + ' টাকা)<br>' +
            '<strong>বর্তমান হিসাব স্থিতি:</strong> ' + (totalRemainingDueSum > 0 ? 'সর্বমোট বকেয়া পরিমাণ ৳ ' + englishToBanglaNum(totalRemainingDueSum.toFixed(0)) : '<span style="color: #1b5e20; font-weight: bold;">বর্তমান মাস পর্যন্ত সকল চাঁদা সফলভাবে পরিশোধিত হয়েছে।</span>') +
        '</div>' +
        '<div class="khata-signatures" style="display: flex; justify-content: space-between; margin-top: 40px; font-weight: bold; font-size: 13px;">' +
            '<div style="border-top: 1px solid #000; padding-top: 5px; width: 140px; text-align: center;">কোষাধ্যক্ষ</div>' +
            '<div style="border-top: 1px solid #000; padding-top: 5px; width: 140px; text-align: center;">সাধারণ সম্পাদক</div>' +
            '<div style="border-top: 1px solid #000; padding-top: 5px; width: 140px; text-align: center;">সভাপতি</div>' +
        '</div>' +
        '</div>';

    // Open print window
    var printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        alert("পপ-আপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজারে এই সাইটের জন্য পপ-আপ অনুমতি দিন এবং আবার চেষ্টা করুন।");
        return;
    }

    printWindow.document.write('<!DOCTYPE html>' +
    '<html lang="bn"><head><meta charset="UTF-8">' +
    '<title>' + member.name + ' - বাৎসরিক বিবরণী ' + englishToBanglaNum(selectedYear.toString()) + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">' +
    '<style>' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }' +
    'body { font-family: "Hind Siliguri", "Noto Sans Bengali", "SolaimanLipi", Arial, sans-serif; font-size: 13px; color: #000; background: #fff; }' +
    '@page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }' +
    getPadCSS() +
    '.khata-page { width: 100%; padding: 0; }' +
    'table { width: 100%; border-collapse: collapse; table-layout: fixed; }' +
    'th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; vertical-align: middle; word-wrap: break-word; }' +
    'thead tr { background-color: #d6e4d6; }' +
    'th { font-size: 12px; font-weight: 700; }' +
    'tbody tr:nth-child(even) { background-color: #f9f9f9; }' +
    '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
    '</style></head><body>' + memberHtml + '</body></html>');

    printWindow.document.close();
    printWindow.focus();
    setTimeout(function() { printWindow.print(); }, 900);
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    var dropdown = document.getElementById('adminMemberDropdownList');
    var searchInput = document.getElementById('adminMemberSearchInput');
    if (dropdown && searchInput && !dropdown.contains(e.target) && e.target !== searchInput) {
        dropdown.style.display = 'none';
    }
});

`;

if (code.includes(funcMarker) && !code.includes('function generateSingleMemberKhata')) {
    code = code.replace(funcMarker, newFunctions + funcMarker);
    changesMade++;
    console.log('✅ Change 3: Added generateSingleMemberKhata and related functions');
}

if (changesMade > 0) {
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('\\n✅ Total changes applied: ' + changesMade);
} else {
    console.log('❌ No changes were applied');
}
