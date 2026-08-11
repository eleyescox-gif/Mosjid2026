const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Find the end of adminAdayKhataSection and add new section after it
const searchMarker = '<!-- ADMIN ONLY: Excel Export Section -->';

const newSection = `<!-- ADMIN ONLY: Individual Member Yearly Report Section -->
                <div id="adminIndividualReportSection" class="chart-card" style="margin-bottom: 20px; display: none;">
                    <div class="chart-title" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fa-solid fa-user-pen" style="margin-right: 6px;"></i>সদস্য প্রতি বাৎসরিক বিবরণী প্রিন্ট</span>
                        <i class="fa-solid fa-file-pdf" style="color: #dc3545;"></i>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
                            <i class="fa-solid fa-circle-info" style="color: var(--primary-color);"></i>
                            নির্দিষ্ট সদস্য নির্বাচন করে তার ব্যক্তিগত বাৎসরিক লেনদেন বিবরণী (আদায় খাতা) A4 সাইজে প্রিন্ট করুন।
                        </p>
                        
                        <label style="font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block;">সদস্য নির্বাচন করুন</label>
                        <div style="position: relative; margin-bottom: 12px;">
                            <input type="text" id="adminMemberSearchInput" class="form-control" placeholder="🔍 সদস্যের নাম বা নম্বর লিখুন..." oninput="filterAdminMemberDropdown()" onfocus="document.getElementById('adminMemberDropdownList').style.display='block'" style="padding-right: 30px;">
                            <div id="adminMemberDropdownList" style="display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: white; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 999; margin-top: 4px;">
                            </div>
                        </div>
                        <div id="adminSelectedMemberInfo" style="display: none; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #a5d6a7;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong id="adminSelectedMemberName" style="font-size: 14px; color: #1b5e20;"></strong>
                                    <div id="adminSelectedMemberMeta" style="font-size: 11px; color: #2e7d32; margin-top: 2px;"></div>
                                </div>
                                <button type="button" onclick="clearAdminMemberSelection()" style="background: none; border: none; color: #c62828; font-size: 16px; cursor: pointer; padding: 4px;" title="বাতিল করুন"><i class="fa-solid fa-circle-xmark"></i></button>
                            </div>
                        </div>
                        <input type="hidden" id="adminSelectedMemberId" value="">

                        <label style="font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block;">বছর নির্বাচন করুন</label>
                        <select id="adminIndividualYearSelect" class="form-control" style="margin-bottom: 14px;">
                            <option value="2025">২০২৫</option>
                            <option value="2026" selected>২০২৬</option>
                            <option value="2027">২০২৭</option>
                            <option value="2028">২০২৮</option>
                        </select>

                        <button class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); border: none; font-weight: 700; font-size: 13px;" onclick="generateSingleMemberKhata()">
                            <i class="fa-solid fa-file-pdf"></i> বাৎসরিক বিবরণী প্রিন্ট (A4)
                        </button>
                    </div>
                </div>

                `;

if (html.includes(searchMarker)) {
    html = html.replace(searchMarker, newSection + searchMarker);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('✅ Individual report section added to index.html');
} else {
    console.log('❌ Search marker not found');
}
