const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');

// In #reports-view (around line 410): Add the monthly member collection report button
const oldReportBtn = `<button class="btn btn-primary" onclick="generateAdvancedPrintReport()" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #062b19, #0b4528);">
                        <i class="fa-solid fa-print"></i> <span id="printBtnLabel">বিবরণী প্রিন্ট (A4)</span>
                    </button>`;

const newReportBtns = `<button class="btn btn-primary" onclick="generateAdvancedPrintReport()" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #062b19, #0b4528);">
                        <i class="fa-solid fa-print"></i> <span id="printBtnLabel">আয়-ব্যয় বিবরণী প্রিন্ট (A4)</span>
                    </button>
                    <button class="btn btn-primary" onclick="generateMonthlyMemberCollectionReport()" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #1565c0, #0d47a1); border: none; box-shadow: 0 4px 12px rgba(21, 101, 192, 0.25);">
                        <i class="fa-solid fa-file-invoice-dollar"></i> <span>সদস্যভিত্তিক মাসিক চাঁদা আদায় তালিকা প্রিন্ট (A4)</span>
                    </button>`;

if (html.includes(oldReportBtn)) {
    html = html.replace(oldReportBtn, newReportBtns);
    console.log('✅ Added Monthly Member Collection Report button in #reports-view');
} else {
    console.log('⚠️ oldReportBtn not matched in index.html, trying fallback');
}

// In #members-view (around line 215): Add "মাসিক আদায় তালিকা" button
const oldMemberActions = `<button class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;" onclick="printArrearsList()">
                            <i class="fa-solid fa-print"></i> বকেয়া তালিকা
                        </button>`;

const newMemberActions = `<button class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto; background-color: #e8f5e9; color: #1b5e20; border: 1.5px solid #a5d6a7; font-weight: 700;" onclick="generateMonthlyMemberCollectionReport()">
                            <i class="fa-solid fa-file-invoice-dollar"></i> মাসিক আদায় তালিকা
                        </button>
                        <button class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;" onclick="printArrearsList()">
                            <i class="fa-solid fa-print"></i> বকেয়া তালিকা
                        </button>`;

if (html.includes(oldMemberActions)) {
    html = html.replace(oldMemberActions, newMemberActions);
    console.log('✅ Added Monthly Member Collection Report button in #members-view');
}

// In #adminAdayKhataSection (around line 548): Add monthly collection report option
const oldAdayKhataBtn = `<button class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px;" onclick="generateAllMembersKhata()">
                            <i class="fa-solid fa-print"></i> আদায় খাতা জেনারেট করুন
                        </button>`;

const newAdayKhataBtn = `<div style="display: flex; gap: 8px; flex-direction: column;">
                            <button class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px;" onclick="generateAllMembersKhata()">
                                <i class="fa-solid fa-print"></i> সকল সদস্যের বাৎসরিক আদায় খাতা
                            </button>
                            <button class="btn btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px; background: #e8f5e9; color: #1b5e20; border: 1.5px solid #a5d6a7; font-weight: 700;" onclick="generateMonthlyMemberCollectionReport(null, document.getElementById('adayKhataYearSelect')?.value)">
                                <i class="fa-solid fa-file-invoice-dollar"></i> সদস্যভিত্তিক মাসিক চাঁদা আদায় তালিকা
                            </button>
                        </div>`;

if (html.includes(oldAdayKhataBtn)) {
    html = html.replace(oldAdayKhataBtn, newAdayKhataBtn);
    console.log('✅ Added Monthly Collection Report in Admin Aday Khata Section');
}

fs.writeFileSync('index.html', html, 'utf8');

// 2. Update app.js: Add generateMonthlyMemberCollectionReport function
let code = fs.readFileSync('app.js', 'utf8');

const reportFunctionCode = `
// ==========================================
// Print Monthly Member-wise Collection Report & Summary (A4 Layout)
// Allows Cashier and Admin to see and print who paid how much this month
// ==========================================
function generateMonthlyMemberCollectionReport(customMonth, customYear) {
    try {
        const monthSelect = document.getElementById('reportMonth');
        const yearSelect = document.getElementById('reportYear');
        
        let selectedMonth = customMonth ? parseInt(customMonth) : (monthSelect ? parseInt(monthSelect.value) : (new Date().getMonth() + 1));
        let selectedYear = customYear ? parseInt(customYear) : (yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear());
        
        if (isNaN(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) selectedMonth = new Date().getMonth() + 1;
        if (isNaN(selectedYear) || selectedYear < 2000) selectedYear = new Date().getFullYear();

        const monthName = BANGLA_MONTHS[selectedMonth] || 'বর্তমান মাস';
        const yearBN = englishToBanglaNum(selectedYear.toString());
        const monthNumBN = englishToBanglaNum(String(selectedMonth).padStart(2, '0'));
        const printDate = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });

        const mosqueName = state.settings.mosque_name || state.settings.mosqueName || (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS.mosque_name : 'পূর্ব মোহাজের পাড়া জামে মসজিদ');

        // Filter and sort approved active members
        const approvedActiveMembers = (state.members || []).filter(m => {
            if (!m) return false;
            const st = (m.status || '').toLowerCase();
            return (st === 'active' || st === 'suspended' || st === '') && !m.delete_requested && !m.is_deleted;
        });

        if (approvedActiveMembers.length === 0) {
            alert("কোনো অনুমোদিত সক্রিয় সদস্য পাওয়া যায়নি!");
            return;
        }

        const sortedMembers = [...approvedActiveMembers].sort((a, b) => {
            const indexA = state.members.findIndex(m => m.id === a.id);
            const indexB = state.members.findIndex(m => m.id === b.id);
            return indexA - indexB;
        });

        let totalExpectedFeeSum = 0;
        let totalPaidThisMonthSum = 0;
        let paidMembersCount = 0;
        let unpaidMembersCount = 0;
        let freeMembersCount = 0;
        let tableRowsHtml = '';

        sortedMembers.forEach((member) => {
            const realIndex = state.members.findIndex(m => m.id === member.id) + 1;
            let cleanMemberNo = '';
            if (member.member_no && !String(member.member_no).includes('bulk') && !String(member.member_no).includes('member-')) {
                cleanMemberNo = String(member.member_no);
            } else {
                cleanMemberNo = String(realIndex > 0 ? realIndex : 1).padStart(2, '0');
            }
            const memberNumBN = englishToBanglaNum(cleanMemberNo);

            const isFree = member.member_type === 'Free';
            const fee = isFree ? 0 : (parseFloat(member.monthly_fee) || 0);

            // Find subscription record for selected month and year
            const sub = (state.subscriptions || []).find(s => s.member_id === member.id && s.year === selectedYear && s.month === selectedMonth);
            const amountPaid = sub ? parseFloat(sub.amount_paid || 0) : 0;
            const receiptNo = sub && sub.receipt_no ? englishToBanglaNum(sub.receipt_no.toString()) : '';
            const paymentDate = sub && sub.last_payment_date ? formatDate(sub.last_payment_date) : '';
            
            // Determine collector
            let collector = sub && sub.collector ? sub.collector : '';
            if (!collector && sub && sub.last_payment_date) {
                const matchingTx = (state.transactions || []).find(t => t.member_id === member.id && t.date === sub.last_payment_date);
                if (matchingTx) collector = matchingTx.created_by || matchingTx.collected_by || '';
            }

            const totalDue = calculateMemberTotalDue(member.id);
            const advanceBal = parseFloat(member.advance_balance || 0);

            let typeLabel = 'সাধারণ';
            if (member.member_type === 'Poor') typeLabel = 'দরিদ্র';
            else if (isFree) typeLabel = 'ফ্রি (মওকুফ)';
            if (member.committee_role) {
                typeLabel += ' (' + member.committee_role + ')';
            }

            let thisMonthStatusHtml = '';
            if (isFree) {
                thisMonthStatusHtml = '<span style="color:#1565c0; font-weight:bold;">মওকুফ</span>';
                freeMembersCount++;
            } else if (amountPaid >= fee && fee > 0) {
                thisMonthStatusHtml = '<span style="color:#1b5e20; font-weight:bold;">পরিশোধিত ✓</span>';
                paidMembersCount++;
            } else if (amountPaid > 0) {
                const partialDue = fee - amountPaid;
                thisMonthStatusHtml = '<span style="color:#e65100; font-weight:bold;">আংশিক (বকেয়া ৳ ' + englishToBanglaNum(partialDue.toFixed(0)) + ')</span>';
                paidMembersCount++;
                unpaidMembersCount++;
            } else {
                thisMonthStatusHtml = '<span style="color:#b71c1c; font-weight:bold;">অনাদায়ী</span>';
                unpaidMembersCount++;
            }

            let overallStatusText = '';
            if (advanceBal > 0) {
                overallStatusText = '<span style="color:#1b5e20; font-weight:bold;">অগ্রিম: ৳ ' + englishToBanglaNum(advanceBal.toFixed(0)) + '</span>';
            } else if (totalDue > 0) {
                overallStatusText = '<span style="color:#b71c1c; font-weight:bold;">বকেয়া: ৳ ' + englishToBanglaNum(totalDue.toFixed(0)) + '</span>';
            } else {
                overallStatusText = '<span style="color:#1b5e20;">পরিশোধিত ✓</span>';
            }

            if (!isFree) {
                totalExpectedFeeSum += fee;
            }
            totalPaidThisMonthSum += amountPaid;

            tableRowsHtml += '<tr>' +
                '<td style="text-align:center; font-weight:bold;">' + memberNumBN + '</td>' +
                '<td style="text-align:left; font-weight:bold;">' + member.name + '</td>' +
                '<td style="text-align:center;">' + (member.phone ? englishToBanglaNum(member.phone) : '—') + '</td>' +
                '<td style="text-align:center; font-size:11px;">' + typeLabel + '</td>' +
                '<td style="text-align:right;">' + (isFree ? '—' : '৳ ' + englishToBanglaNum(fee.toFixed(0))) + '</td>' +
                '<td style="text-align:right; font-weight:bold; color:' + (amountPaid > 0 ? '#1b5e20' : '#888') + '; background:' + (amountPaid > 0 ? '#f0faf0' : 'inherit') + ';">' +
                    (amountPaid > 0 ? '৳ ' + englishToBanglaNum(amountPaid.toFixed(0)) : '—') +
                '</td>' +
                '<td style="text-align:center; color:#1565c0; font-weight:bold;">' + (receiptNo || '—') + '</td>' +
                '<td style="text-align:center; font-size:10.5px;">' + (paymentDate || '—') + '</td>' +
                '<td style="text-align:center; font-size:11px;">' + (collector || '—') + '</td>' +
                '<td style="text-align:center;">' + thisMonthStatusHtml + '</td>' +
            '</tr>';
        });

        const totalUncollected = Math.max(0, totalExpectedFeeSum - totalPaidThisMonthSum);
        const paidWords = totalPaidThisMonthSum > 0 ? numberToBanglaWords(totalPaidThisMonthSum) : 'শূন্য টাকা মাত্র';

        const summaryKpiHtml = '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px;">' +
            '<div style="background: #e8f5e9; border: 1.5px solid #a5d6a7; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #2e7d32; font-weight: 600;">মোট সমাজ সদস্য</div>' +
                '<div style="font-size: 15px; font-weight: 800; color: #1b5e20; margin-top: 2px;">' +
                    englishToBanglaNum(sortedMembers.length.toString()) + ' জন' +
                '</div>' +
                '<div style="font-size: 9.5px; color: #555; margin-top: 1px;">(আদায়কারী: ' + englishToBanglaNum(paidMembersCount.toString()) + ' জন)</div>' +
            '</div>' +

            '<div style="background: #e3f2fd; border: 1.5px solid #90caf9; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #1565c0; font-weight: 600;">মাসিক মোট চাঁদা দাবী</div>' +
                '<div style="font-size: 15px; font-weight: 800; color: #0d47a1; margin-top: 2px;">' +
                    '৳ ' + englishToBanglaNum(totalExpectedFeeSum.toFixed(0)) +
                '</div>' +
                '<div style="font-size: 9.5px; color: #555; margin-top: 1px;">(ফ্রি সদস্য: ' + englishToBanglaNum(freeMembersCount.toString()) + ' জন)</div>' +
            '</div>' +

            '<div style="background: #f1f8e9; border: 1.5px solid #c5e1a5; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #33691e; font-weight: 600;">চলতি মাসে মোট আদায়</div>' +
                '<div style="font-size: 16px; font-weight: 800; color: #1b5e20; margin-top: 2px;">' +
                    '৳ ' + englishToBanglaNum(totalPaidThisMonthSum.toFixed(0)) +
                '</div>' +
                '<div style="font-size: 9.5px; color: #2e7d32; font-weight: 700; margin-top: 1px;">' +
                    (totalExpectedFeeSum > 0 ? englishToBanglaNum(((totalPaidThisMonthSum / totalExpectedFeeSum) * 100).toFixed(0)) + '% আদায়' : '১০০%') +
                '</div>' +
            '</div>' +

            '<div style="background: #ffebee; border: 1.5px solid #ef9a9a; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #c62828; font-weight: 600;">চলতি মাসে অনাদায়ী / বকেয়া</div>' +
                '<div style="font-size: 15px; font-weight: 800; color: #b71c1c; margin-top: 2px;">' +
                    '৳ ' + englishToBanglaNum(totalUncollected.toFixed(0)) +
                '</div>' +
                '<div style="font-size: 9.5px; color: #b71c1c; margin-top: 1px;">(বকেয়া সদস্য: ' + englishToBanglaNum(unpaidMembersCount.toString()) + ' জন)</div>' +
            '</div>' +
        '</div>';

        const totalRowHtml = '<tr style="background-color: #e8f5e9; font-weight: 800; border-top: 2px solid #000;">' +
            '<td colspan="4" style="text-align: right; padding-right: 12px;">সর্বমোট</td>' +
            '<td style="text-align: right; font-weight: 800;">৳ ' + englishToBanglaNum(totalExpectedFeeSum.toFixed(0)) + '</td>' +
            '<td style="text-align: right; color: #1b5e20; font-weight: 800; font-size: 13px;">৳ ' + englishToBanglaNum(totalPaidThisMonthSum.toFixed(0)) + '</td>' +
            '<td colspan="3" style="text-align: center; color: #555; font-size: 11px;">আদায়কারী: ' + englishToBanglaNum(paidMembersCount.toString()) + ' জন | বাকি: ' + englishToBanglaNum(unpaidMembersCount.toString()) + ' জন</td>' +
            '<td style="text-align: center; color: ' + (totalUncollected > 0 ? '#b71c1c' : '#1b5e20') + '; font-weight: 800;">' +
                (totalUncollected > 0 ? 'বকেয়া ৳ ' + englishToBanglaNum(totalUncollected.toFixed(0)) : 'সম্পূর্ণ আদায় ✓') +
            '</td>' +
        '</tr>';

        const htmlDocument = '<!DOCTYPE html>' +
        '<html lang="bn"><head><meta charset="UTF-8">' +
        '<title>' + mosqueName + ' — মাসিক সদস্য চাঁদা আদায় তালিকা (' + monthName + ' ' + yearBN + ')</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Hind Siliguri", "Noto Sans Bengali", "SolaimanLipi", Arial, sans-serif; font-size: 11.5px; color: #000; background: #fff; padding: 8mm; }' +
        '@page { size: A4 portrait; margin: 8mm 10mm 12mm 10mm; }' +
        'table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; table-layout: fixed; }' +
        'th, td { border: 1px solid #333; padding: 5px 4px; vertical-align: middle; word-wrap: break-word; }' +
        'thead tr { background-color: #d6e4d6; }' +
        'th { font-size: 11px; font-weight: 700; text-align: center; }' +
        'tbody tr:nth-child(even) { background-color: #fafafa; }' +
        '.report-footer { margin-top: 14px; font-size: 12px; line-height: 1.8; border-top: 1px dashed #777; padding-top: 8px; }' +
        '.signatures { display: flex; justify-content: space-between; margin-top: 40px; }' +
        '.sig-box { text-align: center; width: 150px; border-top: 1px solid #000; padding-top: 5px; font-size: 12px; font-weight: 700; }' +
        '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
        getPadCSS() +
        '</style></head><body>' +
        getPadHeaderHTML('মাসিক সদস্যভিত্তিক চাঁদা আদায় বিবরণী', 'মাস: ' + monthName + ' ' + yearBN + ' খ্রি:', 'আদায়-তালিকা/' + yearBN + '/' + monthNumBN, printDate) +
        summaryKpiHtml +
        '<table><thead><tr>' +
        '<th style="width: 7%;">সদস্য নং</th>' +
        '<th style="width: 20%; text-align: left; padding-left: 6px;">সদস্যের নাম</th>' +
        '<th style="width: 14%;">মোবাইল</th>' +
        '<th style="width: 11%;">ধরণ</th>' +
        '<th style="width: 10%;">ধার্য চাঁদা</th>' +
        '<th style="width: 11%;">আদায়কৃত টাকা</th>' +
        '<th style="width: 9%;">রশিদ নং</th>' +
        '<th style="width: 10%;">আদায়ের তারিখ</th>' +
        '<th style="width: 8%;">আদায়কারী</th>' +
        '<th style="width: 10%;">স্থিতি</th>' +
        '</tr></thead><tbody>' +
        tableRowsHtml +
        totalRowHtml +
        '</tbody></table>' +
        '<div class="report-footer">' +
        '<strong>আদায় সারাংশ:</strong> ' + monthName + ' ' + yearBN + ' মাসে সমাজের মোট ' + englishToBanglaNum(sortedMembers.length.toString()) + ' জন সদস্যের মধ্যে ' + englishToBanglaNum(paidMembersCount.toString()) + ' জন সদস্য থেকে সর্বমোট <strong>৳ ' + englishToBanglaNum(totalPaidThisMonthSum.toFixed(0)) + '</strong> টাকা চাঁদা গ্রহণ করা হয়েছে। (কথায়: ' + paidWords + ')<br>' +
        '<strong>চলতি মাসের অনাদায়ী স্থিতি:</strong> ' + (totalUncollected > 0 ? 'বকেয়া রয়েছে ৳ ' + englishToBanglaNum(totalUncollected.toFixed(0)) + ' (' + englishToBanglaNum(unpaidMembersCount.toString()) + ' জন সদস্যের)' : '<span style="color:#1b5e20; font-weight:bold;">চলতি মাসের সকল চাঁদা শতভাগ সফলভাবে আদায় হয়েছে।</span>') +
        '</div>' +
        '<div class="signatures">' +
        '<div class="sig-box">কোষাধ্যক্ষ</div>' +
        '<div class="sig-box">সাধারণ সম্পাদক</div>' +
        '<div class="sig-box">সভাপতি</div>' +
        '</div>' +
        '</body></html>';

        const printWindow = window.open('', '_blank', 'width=950,height=750');
        if (!printWindow) {
            alert("পপ-আপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজারে এই সাইটের জন্য পপ-আপ অনুমতি দিন এবং আবার চেষ্টা করুন।");
            return;
        }

        printWindow.document.write(htmlDocument);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function() { printWindow.print(); }, 800);

    } catch (err) {
        console.error("Error in generateMonthlyMemberCollectionReport: ", err);
        alert("মাসিক সদস্য চাঁদা আদায় তালিকা তৈরি করার সময় একটি ত্রুটি হয়েছে:\\n" + err.message);
    }
}
`;

if (!code.includes('function generateMonthlyMemberCollectionReport')) {
    code += '\n' + reportFunctionCode;
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ Added generateMonthlyMemberCollectionReport function to app.js');
} else {
    console.log('ℹ️ generateMonthlyMemberCollectionReport already exists in app.js');
}
