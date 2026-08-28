const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. In #reports-view: Add the monthly member collection report button
const targetReports = `<div style="display: flex; gap: 10px; flex-direction: column;">
                    <button class="btn btn-primary" onclick="generateAdvancedPrintReport()" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #062b19, #0b4528);">
                        <i class="fa-solid fa-print"></i> <span id="printBtnLabel">বিবরণী প্রিন্ট (A4)</span>
                    </button>
                </div>`;

const newReports = `<div style="display: flex; gap: 10px; flex-direction: column;">
                    <button class="btn btn-primary" onclick="generateAdvancedPrintReport()" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #062b19, #0b4528);">
                        <i class="fa-solid fa-print"></i> <span id="printBtnLabel">আয়-ব্যয় বিবরণী প্রিন্ট (A4)</span>
                    </button>
                    <button class="btn btn-primary" onclick="generateMonthlyMemberCollectionReport()" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #1565c0, #0d47a1); border: none; box-shadow: 0 4px 12px rgba(21, 101, 192, 0.25);">
                        <i class="fa-solid fa-file-invoice-dollar"></i> <span>সদস্যভিত্তিক মাসিক চাঁদা আদায় তালিকা প্রিন্ট (A4)</span>
                    </button>
                </div>`;

// 2. In #members-view: Add "মাসিক আদায় তালিকা" button
const targetMembers = `<div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;" onclick="printArrearsList()">
                            <i class="fa-solid fa-print"></i> বকেয়া তালিকা
                        </button>
                        <button id="addMemberBtn" class="btn btn-primary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto;" onclick="openModal('add-member-modal')">
                            <i class="fa-solid fa-user-plus"></i> সদস্য যোগ
                        </button>
                    </div>`;

const newMembers = `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto; background-color: #e8f5e9; color: #1b5e20; border: 1.5px solid #a5d6a7; font-weight: 700;" onclick="generateMonthlyMemberCollectionReport()">
                            <i class="fa-solid fa-file-invoice-dollar"></i> মাসিক আদায় তালিকা
                        </button>
                        <button class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;" onclick="printArrearsList()">
                            <i class="fa-solid fa-print"></i> বকেয়া তালিকা
                        </button>
                        <button id="addMemberBtn" class="btn btn-primary" style="height: 36px; padding: 0 12px; font-size: 12px; width: auto;" onclick="openModal('add-member-modal')">
                            <i class="fa-solid fa-user-plus"></i> সদস্য যোগ
                        </button>
                    </div>`;

// 3. In #adminAdayKhataSection: Add monthly collection report button
const targetAdayKhata = `<button class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px;" onclick="generateAllMembersKhata()">
                            <i class="fa-solid fa-print"></i> আদায় খাতা জেনারেট করুন
                        </button>`;

const newAdayKhata = `<div style="display: flex; gap: 8px; flex-direction: column;">
                            <button class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px;" onclick="generateAllMembersKhata()">
                                <i class="fa-solid fa-print"></i> সকল সদস্যের বাৎসরিক আদায় খাতা
                            </button>
                            <button class="btn btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px; background: #e8f5e9; color: #1b5e20; border: 1.5px solid #a5d6a7; font-weight: 700;" onclick="generateMonthlyMemberCollectionReport(null, document.getElementById('adayKhataYearSelect')?.value)">
                                <i class="fa-solid fa-file-invoice-dollar"></i> সদস্যভিত্তিক মাসিক চাঁদা আদায় তালিকা প্রিন্ট
                            </button>
                        </div>`;

function normalize(str) {
    return str.replace(/\r\n/g, '\n');
}

let normHtml = normalize(html);
let normTargetReports = normalize(targetReports);
let normTargetMembers = normalize(targetMembers);
let normTargetAdayKhata = normalize(targetAdayKhata);

if (normHtml.includes(normTargetReports)) {
    normHtml = normHtml.replace(normTargetReports, normalize(newReports));
    console.log('✅ Updated reports view print buttons in index.html');
} else {
    console.log('❌ Could not match targetReports');
}

if (normHtml.includes(normTargetMembers)) {
    normHtml = normHtml.replace(normTargetMembers, normalize(newMembers));
    console.log('✅ Updated members view action buttons in index.html');
} else {
    console.log('❌ Could not match targetMembers');
}

if (normHtml.includes(normTargetAdayKhata)) {
    normHtml = normHtml.replace(normTargetAdayKhata, normalize(newAdayKhata));
    console.log('✅ Updated admin Aday Khata section in index.html');
} else {
    console.log('❌ Could not match targetAdayKhata');
}

fs.writeFileSync('index.html', normHtml, 'utf8');
