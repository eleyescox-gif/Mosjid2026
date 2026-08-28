const fs = require('fs');

// 1. Update index.html to add the modal
let html = fs.readFileSync('index.html', 'utf8');

const modalCode = `
    <!-- Modal 4: Monthly Collection Report Filter Modal -->
    <div id="monthly-collection-filter-modal" class="modal-overlay" onclick="closeModalOnOverlay(event)">
        <div class="modal-content" style="max-height: 90%; max-width: 480px;">
            <div class="modal-header">
                <h4><i class="fa-solid fa-filter" style="color: var(--primary-color); margin-right: 6px;"></i>মাসিক চাঁদা আদায় রিপোর্ট ফিল্টার</h4>
                <button class="icon-btn" onclick="closeModal('monthly-collection-filter-modal')" style="background: none; color: var(--text-main);"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <p style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 14px;">
                যেকোনো মাস ও বছর নির্বাচন করে সেই মাসের আদায়কৃত রশিদ নম্বর ও মোট টাকার সারসংক্ষেপ প্রিন্ট করুন।
            </p>

            <form onsubmit="event.preventDefault(); submitMonthlyCollectionReportFromModal();">
                <div class="form-row" style="grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="filterReportMonth" style="font-size: 12px; font-weight: 700;">মাস নির্বাচন করুন *</label>
                        <select id="filterReportMonth" class="form-control" onchange="updateMonthlyFilterPreview()" style="font-size: 13px;">
                            <option value="1">জানুয়ারি</option>
                            <option value="2">ফেব্রুয়ারি</option>
                            <option value="3">মার্চ</option>
                            <option value="4">এপ্রিল</option>
                            <option value="5">মে</option>
                            <option value="6">জুন</option>
                            <option value="7">জুলাই</option>
                            <option value="8">আগস্ট</option>
                            <option value="9">সেপ্টেম্বর</option>
                            <option value="10">অক্টোবর</option>
                            <option value="11">নভেম্বর</option>
                            <option value="12">ডিসেম্বর</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="filterReportYear" style="font-size: 12px; font-weight: 700;">বছর নির্বাচন করুন *</label>
                        <select id="filterReportYear" class="form-control" onchange="updateMonthlyFilterPreview()" style="font-size: 13px;">
                            <option value="2024">২০২৪</option>
                            <option value="2025">২০২৫</option>
                            <option value="2026" selected>২০২৬</option>
                            <option value="2027">২০২৭</option>
                            <option value="2028">২০২৮</option>
                        </select>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                    <label for="filterReportMode" style="font-size: 12px; font-weight: 700;">লেনদেন মাধ্যম (ঐচ্ছিক)</label>
                    <select id="filterReportMode" class="form-control" onchange="updateMonthlyFilterPreview()" style="font-size: 13px;">
                        <option value="ALL">সকল মাধ্যম (হাতে নগদ ও ব্যাংক)</option>
                        <option value="CASH">শুধুমাত্র হাতে নগদ (Cash)</option>
                        <option value="BANK">শুধুমাত্র ব্যাংক (Bank)</option>
                    </select>
                </div>

                <!-- Live Preview of Selected Month Stats -->
                <div id="monthlyFilterPreviewStats" style="background: #f0f7ff; border: 1px solid #bbdefb; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px;">
                    <!-- Dynamically updated -->
                </div>

                <div style="display: flex; gap: 8px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1; height: 42px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; background: linear-gradient(135deg, #1565c0, #0d47a1); border: none;">
                        <i class="fa-solid fa-print"></i> রিপোর্ট প্রিন্ট করুন (A4)
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('monthly-collection-filter-modal')" style="width: auto; height: 42px; padding: 0 16px;">
                        বাতিল
                    </button>
                </div>
            </form>
        </div>
    </div>
`;

// Update button in #members-view to open the filter modal
html = html.replace(
    'onclick="generateMonthlyMemberCollectionReport()"',
    'onclick="openMonthlyCollectionFilterModal()"'
);

// Add modal if not exists
if (!html.includes('id="monthly-collection-filter-modal"')) {
    const insertPoint = '<div id="printableArrearsListArea"';
    html = html.replace(insertPoint, modalCode + '\n    ' + insertPoint);
    console.log('✅ Added monthly-collection-filter-modal to index.html');
}

fs.writeFileSync('index.html', html, 'utf8');

// 2. Update app.js
let code = fs.readFileSync('app.js', 'utf8');

const filterHelperFunctions = `
// ==========================================
// Monthly Collection Filter Modal Handlers
// ==========================================
function openMonthlyCollectionFilterModal() {
    const now = new Date();
    const curMonth = document.getElementById('reportMonth') ? parseInt(document.getElementById('reportMonth').value) : (now.getMonth() + 1);
    const curYear = document.getElementById('reportYear') ? parseInt(document.getElementById('reportYear').value) : now.getFullYear();

    const mSelect = document.getElementById('filterReportMonth');
    const ySelect = document.getElementById('filterReportYear');
    const modeSelect = document.getElementById('filterReportMode');
    
    if (mSelect) mSelect.value = curMonth.toString();
    if (ySelect) ySelect.value = curYear.toString();
    if (modeSelect) modeSelect.value = 'ALL';

    updateMonthlyFilterPreview();
    openModal('monthly-collection-filter-modal');
}

function updateMonthlyFilterPreview() {
    const m = parseInt(document.getElementById('filterReportMonth')?.value) || (new Date().getMonth() + 1);
    const y = parseInt(document.getElementById('filterReportYear')?.value) || new Date().getFullYear();
    const mode = document.getElementById('filterReportMode')?.value || 'ALL';
    const monthPrefix = y + '-' + String(m).padStart(2, '0');

    let count = 0;
    let total = 0;

    (state.transactions || []).forEach(tx => {
        if (tx.transaction_type !== 'INCOME') return;
        if (!tx.date || !tx.date.startsWith(monthPrefix)) return;

        const isMemberFee = (tx.member_id && state.members.some(mem => mem.id === tx.member_id)) ||
                            tx.category === 'Subscription' ||
                            tx.category === 'সদস্য চাঁদা' ||
                            tx.category === 'মাসিক চাঁদা' ||
                            tx.is_member_fee;

        if (isMemberFee && parseFloat(tx.amount || 0) > 0) {
            const pm = (tx.payment_mode === 'BANK' || tx.payment_method === 'BANK') ? 'BANK' : 'CASH';
            if (mode === 'ALL' || mode === pm) {
                count++;
                total += parseFloat(tx.amount || 0);
            }
        }
    });

    const previewEl = document.getElementById('monthlyFilterPreviewStats');
    if (previewEl) {
        if (count > 0) {
            previewEl.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<span style="color: #1565c0; font-weight: 700;"><i class="fa-solid fa-receipt"></i> প্রাপ্ত রশিদ: ' + englishToBanglaNum(count.toString()) + ' টি</span>' +
                '<span style="color: #1b5e20; font-weight: 800; font-size: 14px;"><i class="fa-solid fa-money-bill-wave"></i> মোট আদায়: ৳ ' + englishToBanglaNum(total.toFixed(2)) + '</span>' +
            '</div>';
        } else {
            previewEl.innerHTML = '<span style="color: #c62828;"><i class="fa-solid fa-circle-exclamation"></i> এই মাসে কোনো চাঁদা আদায়ের রশিদ পাওয়া যায়নি।</span>';
        }
    }
}

function submitMonthlyCollectionReportFromModal() {
    const m = parseInt(document.getElementById('filterReportMonth')?.value) || (new Date().getMonth() + 1);
    const y = parseInt(document.getElementById('filterReportYear')?.value) || new Date().getFullYear();
    const mode = document.getElementById('filterReportMode')?.value || 'ALL';
    
    closeModal('monthly-collection-filter-modal');
    generateMonthlyMemberCollectionReport(m, y, mode);
}
`;

// Also update generateMonthlyMemberCollectionReport to support mode filter
const oldSignature = 'function generateMonthlyMemberCollectionReport(customMonth, customYear) {';
const newSignature = 'function generateMonthlyMemberCollectionReport(customMonth, customYear, customMode) {';

if (code.includes(oldSignature)) {
    code = code.replace(oldSignature, newSignature);
}

// Add mode filtering in generateMonthlyMemberCollectionReport
const oldModeCheck = `if (isMemberFee && parseFloat(tx.amount || 0) > 0) {`;
const newModeCheck = `const txMode = (tx.payment_mode === 'BANK' || tx.payment_method === 'BANK') ? 'BANK' : 'CASH';
            if (customMode && customMode !== 'ALL' && customMode !== txMode) return;

            if (isMemberFee && parseFloat(tx.amount || 0) > 0) {`;

if (code.includes(oldModeCheck)) {
    code = code.replace(oldModeCheck, newModeCheck);
}

if (!code.includes('function openMonthlyCollectionFilterModal')) {
    code += '\n' + filterHelperFunctions;
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ Added filter helper functions to app.js');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('✅ app.js successfully updated');
