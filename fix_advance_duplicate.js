const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

const cleanReceiptReportFunction = `// ==========================================
// Print Monthly Member-wise Receipt Collection Report & Summary (A4 Layout)
// PROFESSIONAL STRICT CASH ACCRUAL:
// Source of truth is state.transactions (Every real receipt posted = 1 row)
// No duplicate advance rows, no phantom receipts.
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
        const monthPrefix = selectedYear + '-' + String(selectedMonth).padStart(2, '0');
        const printDate = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });

        const mosqueName = state.settings.mosque_name || state.settings.mosqueName || (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS.mosque_name : 'পূর্ব মোহাজের পাড়া জামে মসজিদ');

        // 1. Gather ONLY actual posted transactions in this selected month
        const receiptList = [];

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

            if (isMemberFee && parseFloat(tx.amount || 0) > 0) {
                const member = (state.members || []).find(m => m.id === tx.member_id);
                
                // Never include phantom/internal deduction markers as receipt number
                let cleanReceiptNo = tx.receipt_no ? String(tx.receipt_no).trim() : '';
                if (cleanReceiptNo.toUpperCase() === 'ADVANCE' || cleanReceiptNo === '—') {
                    cleanReceiptNo = '';
                }

                receiptList.push({
                    id: tx.id,
                    receipt_no: cleanReceiptNo || '—',
                    member_id: tx.member_id || '',
                    member_name: member ? member.name : (tx.description ? tx.description.split('-')[0].trim() : 'সদস্য চাঁদা'),
                    phone: member ? (member.phone || '') : '',
                    amount: parseFloat(tx.amount || 0),
                    date: tx.date || '',
                    payment_mode: (tx.payment_mode === 'BANK' || tx.payment_method === 'BANK') ? 'ব্যাংক' : 'নগদ',
                    description: tx.description || ('মাসিক চাঁদা আদায় (' + monthName + ' ' + yearBN + ')'),
                    collector: tx.created_by || tx.collected_by || 'কোষাধ্যক্ষ'
                });
            }
        });

        if (receiptList.length === 0) {
            alert(monthName + ' ' + yearBN + ' খ্রি: মাসে চাঁদা আদায়ের কোনো রশিদ পোস্টিং এন্ট্রি পাওয়া যায়নি!');
            return;
        }

        // 2. Sort strictly by Receipt Number (numeric), then fallback to Date
        receiptList.sort((a, b) => {
            const numA = parseInt(a.receipt_no);
            const numB = parseInt(b.receipt_no);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            if (a.receipt_no !== '—' && b.receipt_no === '—') return -1;
            if (a.receipt_no === '—' && b.receipt_no !== '—') return 1;
            return new Date(a.date) - new Date(b.date);
        });

        // 3. Calculate Aggregated Summaries
        let totalCollectedAmount = 0;
        const uniquePayingMembers = new Set();

        receiptList.forEach(item => {
            totalCollectedAmount += item.amount;
            if (item.member_id) uniquePayingMembers.add(item.member_id);
            else if (item.member_name) uniquePayingMembers.add(item.member_name);
        });

        const totalReceiptsCount = receiptList.length;
        const totalPayersCount = uniquePayingMembers.size;
        const avgPerReceipt = totalReceiptsCount > 0 ? (totalCollectedAmount / totalReceiptsCount) : 0;
        const paidWords = totalCollectedAmount > 0 ? numberToBanglaWords(totalCollectedAmount) : 'শূন্য টাকা মাত্র';

        // 4. Generate Table Rows
        let tableRowsHtml = '';
        receiptList.forEach((item, index) => {
            const slBN = englishToBanglaNum((index + 1).toString());
            const receiptNoBN = (item.receipt_no && item.receipt_no !== '—') ? englishToBanglaNum(item.receipt_no) : '—';
            
            // Member sequence number if member exists
            let memberNumBN = '—';
            if (item.member_id) {
                const realIndex = (state.members || []).findIndex(m => m.id === item.member_id) + 1;
                if (realIndex > 0) {
                    let cleanMemberNo = '';
                    const mObj = state.members.find(m => m.id === item.member_id);
                    if (mObj && mObj.member_no && !String(mObj.member_no).includes('bulk') && !String(mObj.member_no).includes('member-')) {
                        cleanMemberNo = String(mObj.member_no);
                    } else {
                        cleanMemberNo = String(realIndex).padStart(2, '0');
                    }
                    memberNumBN = englishToBanglaNum(cleanMemberNo);
                }
            }

            const dateBN = item.date ? formatDate(item.date) : '—';
            const amountBN = englishToBanglaNum(item.amount.toFixed(2));
            const phoneBN = item.phone ? englishToBanglaNum(item.phone) : '—';

            tableRowsHtml += '<tr>' +
                '<td style="text-align:center; font-weight:600;">' + slBN + '</td>' +
                '<td style="text-align:center; font-weight:800; color:#0d47a1; font-size:12px; background:#f0f7ff;">' + receiptNoBN + '</td>' +
                '<td style="text-align:center; font-weight:600;">' + memberNumBN + '</td>' +
                '<td style="text-align:left; font-weight:700; padding-left:8px;">' + item.member_name + '</td>' +
                '<td style="text-align:center;">' + phoneBN + '</td>' +
                '<td style="text-align:center; font-size:11px;">' + dateBN + '</td>' +
                '<td style="text-align:center; font-size:11px;">' + item.payment_mode + '</td>' +
                '<td style="text-align:left; font-size:11px; padding-left:6px;">' + item.description + '</td>' +
                '<td style="text-align:center; font-size:11px;">' + item.collector + '</td>' +
                '<td style="text-align:right; font-weight:800; color:#1b5e20; font-size:12px; background:#f4faf6; padding-right:8px;">৳ ' + amountBN + '</td>' +
            '</tr>';
        });

        // 5. Summary KPI Cards on Top
        const summaryKpiHtml = '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px;">' +
            '<div style="background: #e3f2fd; border: 1.5px solid #90caf9; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #1565c0; font-weight: 600;">মোট ইস্যুকৃত রশিদ</div>' +
                '<div style="font-size: 16px; font-weight: 800; color: #0d47a1; margin-top: 2px;">' +
                    englishToBanglaNum(totalReceiptsCount.toString()) + ' টি রশিদ' +
                '</div>' +
                '<div style="font-size: 9.5px; color: #555; margin-top: 1px;">(' + monthName + ' মাসে পোস্টিং)</div>' +
            '</div>' +

            '<div style="background: #e8f5e9; border: 1.5px solid #a5d6a7; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #2e7d32; font-weight: 600;">চাঁদা প্রদানকারী সদস্য</div>' +
                '<div style="font-size: 16px; font-weight: 800; color: #1b5e20; margin-top: 2px;">' +
                    englishToBanglaNum(totalPayersCount.toString()) + ' জন' +
                '</div>' +
                '<div style="font-size: 9.5px; color: #555; margin-top: 1px;">(পরিশোধকারী তালিকা)</div>' +
            '</div>' +

            '<div style="background: #f1f8e9; border: 1.5px solid #c5e1a5; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #33691e; font-weight: 600;">রশিদ অনুযায়ী মোট আদায়</div>' +
                '<div style="font-size: 16px; font-weight: 800; color: #1b5e20; margin-top: 2px;">' +
                    '৳ ' + englishToBanglaNum(totalCollectedAmount.toFixed(2)) +
                '</div>' +
                '<div style="font-size: 9.5px; color: #2e7d32; font-weight: 700; margin-top: 1px;">' + monthName + ' ' + yearBN + '</div>' +
            '</div>' +

            '<div style="background: #fff8e1; border: 1.5px solid #ffe082; border-radius: 8px; padding: 8px 10px; text-align: center;">' +
                '<div style="font-size: 10.5px; color: #f57f17; font-weight: 600;">গড় আদায় প্রতি রশিদ</div>' +
                '<div style="font-size: 15px; font-weight: 800; color: #e65100; margin-top: 2px;">' +
                    '৳ ' + englishToBanglaNum(avgPerReceipt.toFixed(2)) +
                '</div>' +
                '<div style="font-size: 9.5px; color: #777; margin-top: 1px;">(চলতি মাসের গড়)</div>' +
            '</div>' +
        '</div>';

        // 6. Total Row at Bottom
        const totalRowHtml = '<tr style="background-color: #e8f5e9; font-weight: 800; border-top: 2.5px solid #000;">' +
            '<td colspan="9" style="text-align: right; padding-right: 14px; font-size: 12px;">' +
                'সর্বমোট আদায় (' + englishToBanglaNum(totalReceiptsCount.toString()) + ' টি রশিদে মোট ' + englishToBanglaNum(totalPayersCount.toString()) + ' জন সদস্য):' +
            '</td>' +
            '<td style="text-align: right; color: #1b5e20; font-weight: 800; font-size: 13px; padding-right: 8px; background: #dcedc8;">' +
                '৳ ' + englishToBanglaNum(totalCollectedAmount.toFixed(2)) +
            '</td>' +
        '</tr>';

        // 7. Full Printable HTML Document
        const htmlDocument = '<!DOCTYPE html>' +
        '<html lang="bn"><head><meta charset="UTF-8">' +
        '<title>' + mosqueName + ' — রশিদ নম্বর ভিত্তিক চাঁদা আদায় তালিকা (' + monthName + ' ' + yearBN + ')</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Hind Siliguri", "Noto Sans Bengali", "SolaimanLipi", Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 8mm; }' +
        '@page { size: A4 portrait; margin: 8mm 8mm 12mm 8mm; }' +
        'table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; table-layout: fixed; }' +
        'th, td { border: 1px solid #333; padding: 5px 3px; vertical-align: middle; word-wrap: break-word; }' +
        'thead tr { background-color: #d6e4d6; }' +
        'th { font-size: 11px; font-weight: 700; text-align: center; }' +
        'tbody tr:nth-child(even) { background-color: #fafafa; }' +
        '.report-footer { margin-top: 12px; font-size: 11.5px; line-height: 1.8; border-top: 1px dashed #777; padding-top: 8px; }' +
        '.signatures { display: flex; justify-content: space-between; margin-top: 38px; }' +
        '.sig-box { text-align: center; width: 150px; border-top: 1px solid #000; padding-top: 5px; font-size: 11.5px; font-weight: 700; }' +
        '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
        getPadCSS() +
        '</style></head><body>' +
        getPadHeaderHTML('রশিদ নম্বর ভিত্তিক চাঁদা আদায় বিবরণী', 'মাস: ' + monthName + ' ' + yearBN + ' খ্রি: (চলতি মাসের পোস্টিং)', 'রশিদ-আদায়/' + yearBN + '/' + monthNumBN, printDate) +
        summaryKpiHtml +
        '<table><thead><tr>' +
        '<th style="width: 5%;">ক্র.নং</th>' +
        '<th style="width: 10%;">রশিদ নং</th>' +
        '<th style="width: 7%;">সদস্য নং</th>' +
        '<th style="width: 19%; text-align: left; padding-left: 6px;">সদস্যের নাম</th>' +
        '<th style="width: 13%;">মোবাইল</th>' +
        '<th style="width: 11%;">তারিখ</th>' +
        '<th style="width: 7%;">মাধ্যম</th>' +
        '<th style="width: 14%; text-align: left; padding-left: 5px;">বিবরণ / খাত</th>' +
        '<th style="width: 8%;">আদায়কারী</th>' +
        '<th style="width: 11%; text-align: right; padding-right: 6px;">পরিমাণ (৳)</th>' +
        '</tr></thead><tbody>' +
        tableRowsHtml +
        totalRowHtml +
        '</tbody></table>' +
        '<div class="report-footer">' +
        '<strong>রশিদ আদায় সারাংশ:</strong> ' + monthName + ' ' + yearBN + ' মাসে মোট <strong>' + englishToBanglaNum(totalReceiptsCount.toString()) + '</strong> টি রশিদের মাধ্যমে মোট <strong>' + englishToBanglaNum(totalPayersCount.toString()) + '</strong> জন সদস্য থেকে সর্বমোট <strong>৳ ' + englishToBanglaNum(totalCollectedAmount.toFixed(2)) + '</strong> টাকা আদায় করা হয়েছে।<br>' +
        '<strong>কথায়:</strong> ' + paidWords + '।' +
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
        alert("রশিদ ভিত্তিক চাঁদা আদায় তালিকা তৈরি করার সময় একটি ত্রুটি হয়েছে:\\n" + err.message);
    }
}`;

const startMarker = "function generateMonthlyMemberCollectionReport(";
if (code.includes(startMarker)) {
    const idx = code.indexOf(startMarker);
    const prevCommentIdx = code.lastIndexOf("// =", idx);
    const startIdx = prevCommentIdx !== -1 ? prevCommentIdx : idx;
    
    code = code.substring(0, startIdx).trimEnd() + '\n\n' + cleanReceiptReportFunction + '\n';
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ Updated app.js: Removed duplicate subscription iteration. Pure transactions-only ledger!');
}
