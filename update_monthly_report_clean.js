const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// 1. In generateMonthlyMemberCollectionReport:
// Strip member name from description column
const oldDescCell = `'<td style="text-align:left; font-size:11px; padding-left:6px;">' + item.description + '</td>' +`;

const newDescCell = `(() => {
                let cleanDesc = item.description || 'মাসিক চাঁদা আদায়';
                // Strip out member name prefix from description so member name is not duplicated
                if (item.member_name && cleanDesc.startsWith(item.member_name)) {
                    cleanDesc = cleanDesc.substring(item.member_name.length).replace(/^[\\s\\-–—:]+/, '').trim();
                } else if (cleanDesc.includes(' - ')) {
                    cleanDesc = cleanDesc.substring(cleanDesc.indexOf(' - ') + 3).trim();
                }
                cleanDesc = cleanDesc.replace(/\\s*\\[অগ্রিম জমা:[^\\]]+\\]/, '').trim();
                if (!cleanDesc) {
                    cleanDesc = (item.receipt_no && item.receipt_no !== '—') ? ('চাঁদা আদায় (রশিদ নং: ' + receiptNoBN + ')') : 'মাসিক চাঁদা আদায়';
                }
                return '<td style="text-align:left; font-size:11px; padding-left:6px;">' + cleanDesc + '</td>';
            })() +`;

if (code.includes(oldDescCell)) {
    code = code.replace(oldDescCell, newDescCell);
    console.log('✅ Updated description column to omit member name');
}

// 2. Remove summaryKpiHtml from htmlDocument
const oldHtmlDoc = `        getPadHeaderHTML('রশিদ নম্বর ভিত্তিক চাঁদা আদায় বিবরণী', 'মাস: ' + monthName + ' ' + yearBN + ' খ্রি: (চলতি মাসের পোস্টিং)', 'রশিদ-আদায়/' + yearBN + '/' + monthNumBN, printDate) +
        summaryKpiHtml +
        '<table><thead><tr>'`;

const newHtmlDoc = `        getPadHeaderHTML('রশিদ নম্বর ভিত্তিক চাঁদা আদায় বিবরণী', 'মাস: ' + monthName + ' ' + yearBN + ' খ্রি: (চলতি মাসের পোস্টিং)', 'রশিদ-আদায়/' + yearBN + '/' + monthNumBN, printDate) +
        '<table><thead><tr>'`;

if (code.includes(oldHtmlDoc)) {
    code = code.replace(oldHtmlDoc, newHtmlDoc);
    console.log('✅ Removed summary KPI boxes from monthly receipt report');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully saved');
