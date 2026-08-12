const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Target function: generateYearlyPrintReport
const oldHeaderCall = "${getPadHeaderHTML(`${member.name}-এর বাৎসরিক ও ব্যক্তিগত বিবরণী`, `সদস্য নং: ${englishToBanglaNum(member.member_no || member.id)} | পদবী: ${memberRoleLabel}`, 'সদস্য/' + englishToBanglaNum(member.member_no || member.id), printDate)}";
const oldMemberCardNo = "<div><strong>সদস্য নং:</strong> ${englishToBanglaNum(member.member_no || member.id)}</div>";

// We want to calculate cleanMemberNo inside generateYearlyPrintReport right before htmlContent
const insertMarker = "const memberRoleLabel = member.committee_role || (member.member_type === 'Poor' ? 'দরিদ্র সদস্য' : member.member_type === 'Free' ? 'ফ্রি সদস্য (মওকুফ)' : 'সাধারণ সদস্য');";

const newCalc = `const memberRoleLabel = member.committee_role || (member.member_type === 'Poor' ? 'দরিদ্র সদস্য' : member.member_type === 'Free' ? 'ফ্রি সদস্য (মওকুফ)' : 'সাধারণ সদস্য');
        
        const realIndex = (state.members || []).findIndex(m => m.id === member.id) + 1;
        let cleanMemberNo = '';
        if (member.member_no && !String(member.member_no).includes('bulk') && !String(member.member_no).includes('member-')) {
            cleanMemberNo = String(member.member_no);
        } else {
            cleanMemberNo = String(realIndex > 0 ? realIndex : 1).padStart(2, '0');
        }
        const memberNumBN = englishToBanglaNum(cleanMemberNo);`;

const newHeaderCall = "${getPadHeaderHTML(`${member.name}-এর বাৎসরিক ও ব্যক্তিগত বিবরণী`, `পদবী / ধরন: ${memberRoleLabel}`, 'সদস্য/' + memberNumBN, printDate)}";
const newMemberCardNo = "<div><strong>সদস্য নং:</strong> ${memberNumBN}</div>";

let replaced = false;

if (code.includes(insertMarker)) {
    code = code.replace(insertMarker, newCalc);
    console.log('✅ Inserted clean member number calculation');
} else {
    console.log('❌ insertMarker not found');
}

if (code.includes(oldHeaderCall)) {
    code = code.replace(oldHeaderCall, newHeaderCall);
    console.log('✅ Replaced header call with clean ref and subtitle without duplicate member number');
} else {
    console.log('❌ oldHeaderCall not found');
}

if (code.includes(oldMemberCardNo)) {
    code = code.replace(oldMemberCardNo, newMemberCardNo);
    console.log('✅ Replaced member-card member_no with clean memberNumBN');
    replaced = true;
} else {
    console.log('❌ oldMemberCardNo not found');
}

if (replaced) {
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ app.js successfully updated');
}
