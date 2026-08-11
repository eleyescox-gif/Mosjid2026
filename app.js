// Bangla Month Names mapping
const BANGLA_MONTHS = {
    1: 'জানুয়ারি', 2: 'ফেব্রুয়ারি', 3: 'মার্চ', 4: 'এপ্রিল', 5: 'মে', 6: 'জুন',
    7: 'জুলাই', 8: 'আগস্ট', 9: 'সেপ্টেম্বর', 10: 'অক্টোবর', 11: 'নভেম্বর', 12: 'ডিসেম্বর'
};

const CATEGORIES_BN = {
    'Subscription': 'মাসিক চাঁদা',
    'Jummah': 'জুমার চাঁদা',
    'Donation': 'অনুদান (দান)',
    'LandLease': 'জমির খাজনা/লিজ',
    'Admission': 'ভর্তি ফি (নতুন সদস্য)',
    'Others_Income': 'অন্যান্য আয়',
    'ElectricityBill': 'বিদ্যুৎ বিল',
    'ImamSalary': 'ইমাম সাহেবের বেতন',
    'MuazzinSalary': 'মুয়াজ্জিনের বেতন',
    'KhatibSalary': 'খতিবের বেতন',
    'Maintenance': 'মসজিদ সংস্কার/রক্ষণাবেক্ষণ',
    'Others_Expense': 'অন্যান্য ব্যয়'
};

// Default User Credentials Configuration
const DEFAULT_USERS = {
    admin: { username: '01571763821', password: '01011996', role: 'admin', name: 'এডমিন প্যানেল', phone: '01571763821' },
    president: { username: 'president', password: 'pres123', role: 'president', name: 'সভাপতি প্যানেল', phone: '' },
    secretary: { username: 'secretary', password: 'sec123', role: 'secretary', name: 'সম্পাদক প্যানেল', phone: '01722222222' },
    cashier: { username: 'cashier', password: 'cash123', role: 'cashier', name: 'ক্যাশিয়ার প্যানেল', phone: '01733333333' },
    member: { username: 'member', password: 'member123', role: 'member', name: 'সদস্য ভিউ (কমন)', phone: '' }
};

// Default App Institution Settings
const DEFAULT_SETTINGS = {
    mosque_name: 'পূর্ব মোহাজের পাড়া জামে মসজিদ',
    mosque_address: 'বরইতলী, চকরিয়া, কক্সবাজার।',
    established_year: '১৯৯৬ খ্রি.',
    memo_prefix: 'পুমোপাজাম/২০২৬/',
    logo_base64: '', // Base64 Data URL for logo
    bank_account_no: '',
    initial_bank_balance: 0,
    initial_cash_balance: 0
};

// Global App State
let state = {
    members: [],
    transactions: [],
    subscriptions: [],
    users: {}, // Loaded from LocalStorage
    settings: {}, // Loaded from LocalStorage
    committee: [],
    global_recycle_bin: [], // 30-day global recycle bin for DB snapshots
    currentUser: null, // Track logged in user object
    currentView: 'dashboard',
    memberFilter: 'all',
    txFormType: 'INCOME',
    activeMemberId: null, // Stores currently viewed member in modal
    isDarkMode: false
};

window.state = state;

// Receive updated state from Firebase
window.syncStateFromCloud = function(cloudState) {
    if (!cloudState) return;
    
    // Auto-cleanup old global recycle bin items (older than 30 days)
    let recycleBin = cloudState.global_recycle_bin || [];
    const now = new Date();
    recycleBin = recycleBin.filter(item => {
        const deletedAt = new Date(item.deletedAt);
        const diffTime = Math.abs(now - deletedAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    });
    // Helper to fix Firebase Realtime Database object-to-array quirk
    const ensureArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') return Object.values(data);
        return [];
    };
    
    // Update local state arrays safely
    state.members = ensureArray(cloudState.members);
    if (state.members.length === 0) {
        initializeMockData();
        return;
    }
    state.transactions = ensureArray(cloudState.transactions);
    state.subscriptions = ensureArray(cloudState.subscriptions);
    state.committee = ensureArray(cloudState.committee);
    state.global_recycle_bin = recycleBin;
    state.users = cloudState.users || {};
    state.settings = cloudState.settings || {};
    
    // Do not call saveState() here, as it would cause an infinite loop with Firebase
    // Instead, just save to localStorage manually so it's available offline
    localStorage.setItem('mosque_members', JSON.stringify(state.members));
    localStorage.setItem('mosque_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('mosque_subscriptions', JSON.stringify(state.subscriptions));
    localStorage.setItem('mosque_users', JSON.stringify(state.users));
    localStorage.setItem('mosque_settings', JSON.stringify(state.settings));
    localStorage.setItem('mosque_committee', JSON.stringify(state.committee));
    localStorage.setItem('mosque_global_recycle_bin', JSON.stringify(state.global_recycle_bin));
    
    // Re-render UI with new data
    if (typeof refreshAppUI === 'function') {
        refreshAppUI();
    }
};

// Temporary holder for uploaded logo file
let uploadedLogoBase64 = '';

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    // Set default dates to current date
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('txDate')) document.getElementById('txDate').value = today;
    if (document.getElementById('epDate')) document.getElementById('epDate').value = today;
    
    // Set current month in UI
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1; // 1-indexed
    const currentYearNum = now.getFullYear();
    
    const monthSelector = document.getElementById('reportMonth');
    const yearSelector = document.getElementById('reportYear');
    if (monthSelector) monthSelector.value = currentMonthNum;
    if (yearSelector) yearSelector.value = currentYearNum;
    
    const currentMonthLabel = document.getElementById('currentMonthYear');
    if (currentMonthLabel) {
        currentMonthLabel.innerText = `${BANGLA_MONTHS[currentMonthNum]} ${englishToBanglaNum(currentYearNum.toString())}`;
    }

    // Load state from LocalStorage
    loadState();
    
    // Check if user is logged in
    checkLoginSession();

    // Render the categories in the add transaction form
    updateCategoryDropdown();

    // Set up Logo File Upload Listener
    const logoInput = document.getElementById('setMosqueLogo');
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 500000) { // Limit to 500KB
                    alert("লোগোর ফাইলের সাইজ ৫০০KB এর নিচে হতে হবে!");
                    e.target.value = '';
                    document.getElementById('logoPreviewContainer').style.display = 'none';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(evt) {
                    uploadedLogoBase64 = evt.target.result;
                    
                    // Show Preview
                    const previewImg = document.getElementById('logoPreviewImg');
                    if (previewImg) {
                        previewImg.src = uploadedLogoBase64;
                        document.getElementById('logoPreviewContainer').style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Set up Committee Photo File Upload Listener
    const commPhotoInput = document.getElementById('commPhoto');
    if (commPhotoInput) {
        commPhotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 102400) { // Limit to 100KB (100 * 1024)
                    alert("ছবির সাইজ সর্বোচ্চ ১০০ কেবি (100 KB) হতে পারবে!");
                    e.target.value = '';
                    document.getElementById('commPhotoPreview').style.display = 'none';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(evt) {
                    uploadedCommPhotoBase64 = evt.target.result;
                    const previewImg = document.getElementById('commPreviewImg');
                    if (previewImg) {
                        previewImg.src = uploadedCommPhotoBase64;
                        document.getElementById('commPhotoPreview').style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Bind category change listener for dynamic description validation
    const categorySelect = document.getElementById('txCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', handleCategoryChange);
    }
});

// Variable to store base64 string of uploaded committee member photo
let uploadedCommPhotoBase64 = '';

// Convert English numbers to Bangla numbers
function englishToBanglaNum(numStr) {
    if (!numStr) return '';
    const en = ['0','1','2','3','4','5','6','7','8','9'];
    const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return numStr.toString().split('').map(char => {
        const index = en.indexOf(char);
        return index !== -1 ? bn[index] : char;
    }).join('');
}

// Format numbers as Currency
function formatCurrency(amount) {
    return englishToBanglaNum(parseFloat(amount).toFixed(2));
}

// Format Date Helper
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return `${englishToBanglaNum(day.toString())} ${BANGLA_MONTHS[month]}, ${englishToBanglaNum(year)}`;
}

const formatDateBN = formatDate;

// Format short date e.g. "১২/০৬" for table
function formatShortDateBN(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const day = englishToBanglaNum(parseInt(parts[2]).toString().padStart(2, '0'));
    const month = englishToBanglaNum(parseInt(parts[1]).toString().padStart(2, '0'));
    return `${day}/${month}`;
}

// Automatically process advance deductions for all members (including future months)
function processAdvanceDeductions() {
    let stateChanged = false;
    const now = new Date();

    state.members.forEach(member => {
        if (member.status !== 'Active' || member.member_type === 'Free') return;
        
        let advance = parseFloat(member.advance_balance || 0);
        if (advance <= 0) return;

        const fee = parseFloat(member.monthly_fee || 0);
        if (fee <= 0) return;

        const joinParts = (member.join_date || '2025-01-01').split('-');
        const joinYear = parseInt(joinParts[0]) || 2025;
        const joinMonth = parseInt(joinParts[1]) || 1;

        let year = joinYear;
        let m = joinMonth;

        while (advance > 0) {
            let sub = state.subscriptions.find(s => s.member_id === member.id && s.year === year && s.month === m);
            if (!sub) {
                sub = {
                    id: `sub-${member.id}-${year}-${m}`,
                    member_id: member.id,
                    year: year,
                    month: m,
                    amount_paid: 0,
                    due_amount: member.monthly_fee,
                    status: 'Unpaid',
                    last_payment_date: ''
                };
                state.subscriptions.push(sub);
                stateChanged = true;
            }

            const currentDue = member.monthly_fee - parseFloat(sub.amount_paid);
            if (currentDue > 0) {
                const deductAmount = Math.min(advance, currentDue);
                sub.amount_paid = parseFloat(sub.amount_paid) + deductAmount;
                sub.due_amount = member.monthly_fee - sub.amount_paid;
                sub.status = sub.due_amount <= 0 ? 'Paid' : 'Partial';
                sub.last_payment_date = now.toISOString().split('T')[0];
                sub.receipt_no = sub.receipt_no || 'ADVANCE'; // Tagged as advance deduction

                advance -= deductAmount;
                stateChanged = true;
            }

            // Move to next month
            m++;
            if (m > 12) {
                m = 1;
                year++;
            }

            // Safety limit checks
            if (advance <= 0) break;
            if (member.monthly_fee <= 0) break;
            
            // Limit advance allocation to up to 2 years in the future to prevent infinite loops on invalid data
            if (year > now.getFullYear() + 2) break;
        }

        if (parseFloat(member.advance_balance || 0) !== advance) {
            member.advance_balance = advance;
            stateChanged = true;
        }
    });

    if (stateChanged) {
        saveState();
    }
}

// LocalStorage Handlers
function loadState() {
    // Load Users
    const localUsers = localStorage.getItem('mosque_users');
    if (localUsers) {
        state.users = JSON.parse(localUsers);
        // Force update if default admin password is still 'admin123'
        if (state.users.admin && state.users.admin.password === 'admin123') {
            state.users.admin.password = '202620262026';
        }
        // Force update if default admin phone is still '01711111111'
        if (state.users.admin && state.users.admin.phone === '01711111111') {
            state.users.admin.phone = '01812000109';
        }
        // Ensure default phone numbers, usernames, and roles are set
        Object.keys(DEFAULT_USERS).forEach(role => {
            if (state.users[role]) {
                if (!state.users[role].username) {
                    state.users[role].username = DEFAULT_USERS[role].username || role;
                }
                if (!state.users[role].phone) {
                    state.users[role].phone = DEFAULT_USERS[role].phone;
                }
            } else {
                state.users[role] = { ...DEFAULT_USERS[role] };
            }
        });
        localStorage.setItem('mosque_users', JSON.stringify(state.users));
    } else {
        state.users = { ...DEFAULT_USERS };
        localStorage.setItem('mosque_users', JSON.stringify(state.users));
    }

    // Load Mosque/Institution Settings
    const localSettings = localStorage.getItem('mosque_settings');
    if (localSettings) {
        state.settings = JSON.parse(localSettings);
        
        // Force update to new requested name if it matches old defaults
        if (state.settings.mosque_name === 'বাইতুল মামুর জামে মসজিদ' || !state.settings.mosque_name) {
            state.settings.mosque_name = DEFAULT_SETTINGS.mosque_name;
            state.settings.mosque_address = DEFAULT_SETTINGS.mosque_address;
        }
    } else {
        state.settings = { ...DEFAULT_SETTINGS };
        localStorage.setItem('mosque_settings', JSON.stringify(state.settings));
    }

    const localMembers = localStorage.getItem('mosque_members');
    const localTransactions = localStorage.getItem('mosque_transactions');
    const localSubscriptions = localStorage.getItem('mosque_subscriptions');

    if (localMembers) {
        try {
            state.members = JSON.parse(localMembers);
        } catch (e) {
            state.members = [];
        }
    }

    if (!state.members || state.members.length === 0) {
        initializeMockData();
    } else {
        state.members.forEach(m => {
            if (!m.member_type) m.member_type = 'General';
            if (!m.status) m.status = 'Active';
            if (m.monthly_fee === undefined || m.monthly_fee === null) m.monthly_fee = 150;
        });
        if (localTransactions) {
            try { state.transactions = JSON.parse(localTransactions); } catch (e) { state.transactions = []; }
        } else {
            state.transactions = [];
        }

        if (localSubscriptions) {
            try { state.subscriptions = JSON.parse(localSubscriptions); } catch (e) { state.subscriptions = []; }
        } else {
            state.subscriptions = [];
        }
    }
    
    const banner = document.getElementById('demoBanner');
    if (banner) banner.style.display = 'none';

    // Load Managing Committee members list
    const localCommittee = localStorage.getItem('mosque_committee');
    if (localCommittee) {
        state.committee = JSON.parse(localCommittee);
    } else {
        state.committee = [];
    }

    const localRecycleBin = localStorage.getItem('mosque_global_recycle_bin');
    if (localRecycleBin) {
        state.global_recycle_bin = JSON.parse(localRecycleBin);
    } else {
        state.global_recycle_bin = [];
    }

    // Apply Settings (Name, Address, Logo) to UI
    applySettingsToUI();
    
    // Process any pending advance payments
    processAdvanceDeductions();

    // Cleanup soft-deleted members after 60 days
    cleanupPermanentlyDeletedMembers();
}

function saveState() {
    localStorage.setItem('mosque_members', JSON.stringify(state.members));
    localStorage.setItem('mosque_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('mosque_subscriptions', JSON.stringify(state.subscriptions));
    localStorage.setItem('mosque_users', JSON.stringify(state.users));
    localStorage.setItem('mosque_settings', JSON.stringify(state.settings));
    localStorage.setItem('mosque_committee', JSON.stringify(state.committee));
    localStorage.setItem('mosque_global_recycle_bin', JSON.stringify(state.global_recycle_bin));
    
    // Cloud Sync
    if (window.FirebaseSync && window.FirebaseSync.pushState) {
        window.FirebaseSync.pushState(state);
    }
}

// Apply Stored Settings to UI Elements
function applySettingsToUI() {
    const name = state.settings.mosque_name || DEFAULT_SETTINGS.mosque_name;
    const address = state.settings.mosque_address || DEFAULT_SETTINGS.mosque_address;
    const logo = state.settings.logo_base64;

    document.getElementById('headerTitle').innerText = name;
    document.getElementById('loginAppTitle').innerText = name;
    document.getElementById('profileInstitutionName').innerText = name;
    
    // Set text headers
    const printInstName = document.getElementById('printInstName');
    const printInstAddress = document.getElementById('printInstAddress');
    const printArrearsName = document.getElementById('printArrearsName');
    const printArrearsAddress = document.getElementById('printArrearsAddress');
    const printFullInstName = document.getElementById('printFullInstName');
    const printFullInstAddress = document.getElementById('printFullInstAddress');
    
    if(printInstName) printInstName.innerText = name;
    if(printInstAddress) printInstAddress.innerText = address;
    if(printArrearsName) printArrearsName.innerText = name;
    if(printArrearsAddress) printArrearsAddress.innerText = address;
    if(printFullInstName) printFullInstName.innerText = name;
    if(printFullInstAddress) printFullInstAddress.innerText = address;

    // Set UI Logos
    const logoContainers = ['headerLogoContainer', 'loginLogoContainer', 'profileLogoContainer'];
    logoContainers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            if (logo) {
                container.innerHTML = `<img src="${logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; background: #ffffff;">`;
            } else {
                container.innerHTML = `<i class="fa-solid fa-mosque"></i>`;
            }
        }
    });

    // Set Print Logos
    const printLogoContainers = ['printInstLogoContainer', 'printArrearsLogoContainer', 'printFullInstLogoContainer'];
    printLogoContainers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            if (logo) {
                container.innerHTML = `<div style="width: 65px; height: 65px; border-radius: 50%; background: #ffffff; border: 1.5px solid #ddd; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 3px;">
                    <img src="${logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;">
                </div>`;
                container.style.display = 'flex';
            } else {
                container.style.display = 'none'; // Hide logo section if no logo provided
            }
        }
    });
}

// Check logged in user status
function checkLoginSession() {
    const session = localStorage.getItem('mosque_current_user');
    if (session) {
        state.currentUser = JSON.parse(session);
        document.getElementById('loginOverlay').classList.remove('active');
        applyRolePermissions();
        refreshAppUI();
    } else {
        state.currentUser = null;
        document.getElementById('loginOverlay').classList.add('active');
    }
}

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    const enteredUser = document.getElementById('loginUsername').value.trim().toLowerCase();
    const enteredPass = document.getElementById('loginPassword').value;

    let account = null;
    let matchedRole = null;

    // Master override checking against DEFAULT_USERS
    Object.keys(DEFAULT_USERS).forEach(role => {
        const u = DEFAULT_USERS[role];
        if (u && u.username && u.username.toLowerCase() === enteredUser && u.password === enteredPass) {
            account = u;
            matchedRole = role;
            if (state.users[role]) {
                state.users[role] = { ...u };
                localStorage.setItem('mosque_users', JSON.stringify(state.users));
            }
        }
    });

    // Regular checking against state.users if master override didn't match
    if (!account) {
        Object.keys(state.users).forEach(role => {
            const u = state.users[role];
            if (u && u.username && u.username.toLowerCase() === enteredUser) {
                account = u;
                matchedRole = role;
            }
        });
    }

    if (account && account.password === enteredPass) {
        state.currentUser = { role: matchedRole, ...account };
        localStorage.setItem('mosque_current_user', JSON.stringify(state.currentUser));
        
        document.getElementById('loginOverlay').classList.remove('active');
        document.getElementById('loginForm').reset();
        
        applyRolePermissions();
        switchView('dashboard');
        refreshAppUI();
    } else {
        alert("ভুল ইউজার আইডি অথবা পাসওয়ার্ড! আবার চেষ্টা করুন।");
    }
}
// Handle Logout
function handleLogout() {
    if (confirm("আপনি কি লগআউট করতে চান?")) {
        localStorage.removeItem('mosque_current_user');
        state.currentUser = null;
        document.getElementById('loginOverlay').classList.add('active');
    }
}

// Apply Role Permissions to UI Elements
function applyRolePermissions() {
    if (!state.currentUser) return;
    
    const role = state.currentUser.role;
    
    document.getElementById('roleBadge').innerText = state.currentUser.name;
    document.getElementById('profileRoleName').innerText = state.currentUser.name;

    const navTx = document.getElementById('nav-add-transaction');
    const navReports = document.getElementById('nav-reports');
    const navProfile = document.getElementById('nav-profile');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const pendingSec = document.getElementById('pendingMembersSection');
    const changePassSec = document.getElementById('passwordChangeSection');
    const khataMakeControls = document.getElementById('adminKhataMakeControls');
    const systemControls = document.getElementById('adminSystemControls');
    const recentTxSec = document.getElementById('recentTransactionsSection');
    const easyPay = document.getElementById('easyPaymentPanel');
    const settingsSec = document.getElementById('mosqueSettingsSection');
    const commSection = document.getElementById('adminCommitteeSection');
    const binSection = document.getElementById('adminRecycleBinSection');
    const bulkImportSec = document.getElementById('adminBulkImportSection');
    const adayKhataSec = document.getElementById('adminAdayKhataSection');
    const exportSec = document.getElementById('adminExportSection');

    // Default states (Closed/Hidden for general safety)
    navTx.style.display = 'none';
    navReports.style.display = 'flex';
    navProfile.style.display = 'flex';
    addMemberBtn.style.display = 'flex';
    pendingSec.style.display = 'none';
    changePassSec.style.display = 'none';
    systemControls.style.display = 'none';
    recentTxSec.style.display = 'block';
    easyPay.style.display = 'none';
    settingsSec.style.display = 'none';
    commSection.style.display = 'none';
    if (binSection) binSection.style.display = 'none';
    if (bulkImportSec) bulkImportSec.style.display = 'none';
    if (adayKhataSec) adayKhataSec.style.display = 'none';
    if (exportSec) exportSec.style.display = 'none';
    const individualReportSec = document.getElementById('adminIndividualReportSection');
    if (individualReportSec) individualReportSec.style.display = 'none';

    document.getElementById('mdEditBtn').style.display = 'none';
    document.getElementById('mdDeleteBtn').style.display = 'none';
    document.getElementById('mTypeGroup').style.display = 'none';
    document.getElementById('mCustomFeeGroup').style.display = 'none';

    if (role === 'admin') {
        pendingSec.style.display = 'block';
        changePassSec.style.display = 'block';
        systemControls.style.display = 'block';
        settingsSec.style.display = 'block';
        commSection.style.display = 'block'; // Admin can manage committee members
        if (binSection) binSection.style.display = 'block'; // Admin sees recycle bin
        if (bulkImportSec) bulkImportSec.style.display = 'block'; // Admin sees bulk import section
        if (adayKhataSec) adayKhataSec.style.display = 'block'; // Admin sees Aday Khata section
        if (exportSec) exportSec.style.display = 'block'; // Admin sees Excel export section
        if (individualReportSec) individualReportSec.style.display = 'block'; // Admin sees individual member report
        document.getElementById('mdEditBtn').style.display = 'flex';
        document.getElementById('mdDeleteBtn').style.display = 'flex';
        document.getElementById('mTypeGroup').style.display = 'block';
        document.getElementById('mCustomFeeGroup').style.display = 'block';
    } 
    else if (role === 'secretary') {
        changePassSec.style.display = 'none';
        systemControls.style.display = 'none';
        settingsSec.style.display = 'block'; // Secretary needs settings tab to view committee
        commSection.style.display = 'block'; // Secretary can manage committee members
        document.getElementById('mdEditBtn').style.display = 'flex';
        document.getElementById('mTypeGroup').style.display = 'none';
        document.getElementById('mCustomFeeGroup').style.display = 'none';
    } 
    else if (role === 'cashier') {
        navTx.style.display = 'flex'; // Only cashier can see FAB to post money
        addMemberBtn.style.display = 'none';
        changePassSec.style.display = 'none';
        systemControls.style.display = 'none';
        settingsSec.style.display = 'none';
        easyPay.style.display = 'block'; // Only cashier can see regular payment panel
    } 
    else if (role === 'president') {
        addMemberBtn.style.display = 'none';
        changePassSec.style.display = 'none';
        systemControls.style.display = 'none';
        settingsSec.style.display = 'none';
    }
    else if (role === 'member') {
        navProfile.style.display = 'none';
        addMemberBtn.style.display = 'none';
        recentTxSec.style.display = 'none';
    }
}

// Handle Institution Settings Form Submission
function handleSettingsSubmit(e) {
    e.preventDefault();
    if (state.currentUser.role !== 'admin') {
        alert("শুধুমাত্র এডমিন প্রতিষ্ঠানের সেটিংস পরিবর্তন করতে পারবেন!");
        return;
    }

    const newName = document.getElementById('setMosqueName').value.trim();
    const newAddress = document.getElementById('setMosqueAddress').value.trim();
    const estYear = document.getElementById('setEstYear') ? document.getElementById('setEstYear').value.trim() : '';
    const memoPrefix = document.getElementById('setMemoPrefix') ? document.getElementById('setMemoPrefix').value.trim() : '';
    const bankAccountNo = document.getElementById('setBankAccountNo').value.trim();
    const initialBank = parseFloat(document.getElementById('setInitialBankBalance').value) || 0;
    const initialCash = parseFloat(document.getElementById('setInitialCashBalance').value) || 0;

    state.settings.mosque_name = newName;
    state.settings.mosque_address = newAddress;
    state.settings.established_year = estYear;
    state.settings.memo_prefix = memoPrefix;
    state.settings.bank_account_no = bankAccountNo;
    state.settings.initial_bank_balance = initialBank;
    state.settings.initial_cash_balance = initialCash;
    
    if (uploadedLogoBase64) {
        state.settings.logo_base64 = uploadedLogoBase64;
    }

    saveState();
    applySettingsToUI();
    calculateFundBalances(); // Recalculate dashboard values immediately with new initial balances!
    
    document.getElementById('setMosqueLogo').value = '';
    document.getElementById('logoPreviewContainer').style.display = 'none';
    uploadedLogoBase64 = '';

    alert("প্রতিষ্ঠানের সেটিংস সফলভাবে আপডেট করা হয়েছে।");
}

// Populate Settings Form inputs on view show
function populateSettingsInputs() {
    document.getElementById('setMosqueName').value = state.settings.mosque_name || '';
    document.getElementById('setMosqueAddress').value = state.settings.mosque_address || '';
    if (document.getElementById('setEstYear')) {
        document.getElementById('setEstYear').value = state.settings.established_year || state.settings.est_year || '১৯৯৬ খ্রি.';
    }
    if (document.getElementById('setMemoPrefix')) {
        document.getElementById('setMemoPrefix').value = state.settings.memo_prefix || 'পুমোপাজাম/২০২৬/';
    }
    document.getElementById('setBankAccountNo').value = state.settings.bank_account_no || '';
    document.getElementById('setInitialBankBalance').value = state.settings.initial_bank_balance || 0;
    document.getElementById('setInitialCashBalance').value = state.settings.initial_cash_balance || 0;
    
    const logoPreviewContainer = document.getElementById('logoPreviewContainer');
    const logoPreviewImg = document.getElementById('logoPreviewImg');
    if (state.settings.logo_base64 && logoPreviewImg && logoPreviewContainer) {
        logoPreviewImg.src = state.settings.logo_base64;
        logoPreviewImg.style.background = '#ffffff';
        logoPreviewImg.style.objectFit = 'contain';
        logoPreviewImg.style.padding = '3px';
        logoPreviewImg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        logoPreviewContainer.style.display = 'block';
    } else if (logoPreviewContainer) {
        logoPreviewContainer.style.display = 'none';
    }

    // Render managing committee editor and recycle bin if admin is viewing
    if (state.currentUser.role === 'admin') {
        renderAdminCommitteeEditor();
        renderRecycleBin();
        renderGlobalRecycleBin();
        handleRoleSelectChange(); // Load recovery phone number for currently selected role
    }
}

// Change User Password & Recovery Mobile (Admin Only)
function handleChangePassword(e) {
    e.preventDefault();
    if (state.currentUser.role !== 'admin') {
        alert("শুধুমাত্র এডমিন পাসওয়ার্ড ও মোবাইল নম্বর পরিবর্তন করতে পারবেন!");
        return;
    }

    const roleSelect = document.getElementById('changeRoleSelect').value;
    const newUsername = document.getElementById('changeRoleUsername').value.trim().toLowerCase();
    const newPass = document.getElementById('changeNewPassword').value.trim();
    const phone = document.getElementById('changeRolePhone').value.trim();

    if (!newUsername) {
        alert("ইউজার আইডি (Username) দেওয়া বাধ্যতামূলক!");
        return;
    }

    // Check duplicate username across other roles
    let duplicate = false;
    Object.keys(state.users).forEach(role => {
        if (role !== roleSelect && state.users[role].username.toLowerCase() === newUsername) {
            duplicate = true;
        }
    });
    if (duplicate) {
        alert("এই ইউজার আইডিটি অন্য কোনো রোল ব্যবহার করছে। দয়া করে ভিন্ন আইডি ব্যবহার করুন!");
        return;
    }

    if (newPass.length > 0 && newPass.length < 4) {
        alert("পাসওয়ার্ড পরিবর্তন করতে চাইলে তা ন্যূনতম ৪ অক্ষরের হতে হবে!");
        return;
    }

    if (roleSelect !== 'member' && !phone) {
        alert("রিকভারি মোবাইল নম্বর দেওয়া বাধ্যতামূলক!");
        return;
    }

    state.users[roleSelect].username = newUsername;
    if (newPass.length > 0) {
        state.users[roleSelect].password = newPass;
    }
    if (roleSelect !== 'member') {
        state.users[roleSelect].phone = phone;
    }
    saveState();

    document.getElementById('changeNewPassword').value = ''; // clear only password
    alert(`${state.users[roleSelect].name}-এর তথ্য সফলভাবে হালনাগাদ করা হয়েছে!`);
}

// Handle role dropdown change to load current recovery phone in settings
function handleRoleSelectChange() {
    const role = document.getElementById('changeRoleSelect').value;
    const user = state.users[role];
    const usernameInput = document.getElementById('changeRoleUsername');
    const phoneInput = document.getElementById('changeRolePhone');
    const phoneGroup = document.getElementById('recoveryPhoneGroup');
    
    if (user) {
        if (usernameInput) usernameInput.value = user.username || role;
        
        if (role === 'member') {
            if (phoneGroup) phoneGroup.style.display = 'none';
            if (phoneInput) {
                phoneInput.value = '';
                phoneInput.required = false;
            }
        } else {
            if (phoneGroup) phoneGroup.style.display = 'block';
            if (phoneInput) {
                phoneInput.value = user.phone || '';
                phoneInput.required = true;
            }
        }
    }
}

// Generate Realistic Mock Data
function generateDemoData() {
    const firstNames = ['আব্দুর', 'মোস্তফা', 'আলী', 'হাসান', 'শফিকুল', 'কাজী', 'হারুন', 'মোদাচ্ছের', 'সৈয়দ', 'হাফেজ', 'মাহমুদ', 'জালাল', 'কামাল', 'মফিজ', 'মো: ', 'জহির'];
    const lastNames = ['রহমান', 'ইসলাম', 'আকবর', 'মিয়া', 'শিকদার', 'জয়নাল', 'চৌধুরী', 'অমি', 'খন্দকার', 'হোসেন', 'উদ্দিন', 'আলী', 'আহমেদ', 'গাজী', 'মোল্লা', 'মুন্সী'];
    const villages = ['উত্তর পাড়া', 'দক্ষিণ পাড়া', 'মধ্য পাড়া', 'পূর্ব পাড়া', 'পশ্চিম পাড়া'];

    const mockMembers = [];
    const mockSubscriptions = [];
    const mockTransactions = [];
    const joinDate = '2026-01-01';

    // 1. Generate 55 Approved Active Members
    for (let i = 1; i <= 55; i++) {
        let memberType = 'General';
        let fee = 150;
        
        if (i > 42 && i <= 50) {
            memberType = 'Poor';
            fee = 100;
        } else if (i > 50) {
            memberType = 'Free';
            fee = 0;
        }

        const name = firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
        const phone = '017' + Math.floor(10000000 + Math.random() * 90000000).toString();
        const address = villages[Math.floor(Math.random() * villages.length)];
        
        const memberId = 'member-' + i;
        mockMembers.push({
            id: memberId,
            name: name,
            phone: phone,
            address: address,
            member_type: memberType,
            monthly_fee: fee,
            status: 'Active',
            join_date: joinDate
        });

        // Pre-fill subscriptions (Jan-Jun)
        for (let year = 2026; year <= 2026; year++) {
            for (let month = 1; month <= 6; month++) {
                let paid = 0;
                let status = 'Unpaid';
                let receiptNo = '';
                
                if (fee > 0) {
                    const rand = Math.random();
                    if (month <= 3) {
                        if (rand > 0.05) { paid = fee; status = 'Paid'; receiptNo = (1000 + Math.floor(Math.random() * 8000)).toString(); }
                    } else if (month === 4) {
                        if (rand > 0.15) { paid = fee; status = 'Paid'; receiptNo = (1000 + Math.floor(Math.random() * 8000)).toString(); }
                        else if (rand > 0.05) { paid = fee / 2; status = 'Partial'; receiptNo = (1000 + Math.floor(Math.random() * 8000)).toString(); }
                    } else if (month === 5) {
                        if (rand > 0.3) { paid = fee; status = 'Paid'; receiptNo = (1000 + Math.floor(Math.random() * 8000)).toString(); }
                        else if (rand > 0.1) { paid = fee / 2; status = 'Partial'; receiptNo = (1000 + Math.floor(Math.random() * 8000)).toString(); }
                    } else if (month === 6) {
                        if (rand > 0.6) { paid = fee; status = 'Paid'; receiptNo = (1000 + Math.floor(Math.random() * 8000)).toString(); }
                        else if (rand > 0.5) { paid = fee / 2; status = 'Partial'; receiptNo = (1000 + Math.floor(Math.random() * 8000)).toString(); }
                    }
                } else {
                    status = 'Free';
                    paid = 0;
                }

                if (paid > 0 || status === 'Free') {
                    mockSubscriptions.push({
                        id: `sub-${memberId}-${year}-${month}`,
                        member_id: memberId,
                        year: year,
                        month: month,
                        amount_paid: paid,
                        due_amount: fee - paid,
                        status: status,
                        last_payment_date: `2026-0${month}-15`,
                        receipt_no: receiptNo
                    });

                    if (paid > 0) {
                        mockTransactions.push({
                            id: `tx-sub-${memberId}-${year}-${month}`,
                            transaction_type: 'INCOME',
                            category: 'Subscription',
                            amount: paid,
                            payment_mode: Math.random() > 0.8 ? 'BANK' : 'CASH',
                            description: `${name} - ${BANGLA_MONTHS[month]} ২০২৬ এর চাঁদা (রশিদ নং: ${englishToBanglaNum(receiptNo)})`,
                            date: `2026-0${month}-${Math.floor(10 + Math.random() * 15)}`,
                            member_id: memberId,
                            receipt_no: receiptNo,
                            created_by: 'admin',
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }
        }
    }

    // 2. Generate 5 PENDING Members
    for (let i = 56; i <= 60; i++) {
        const name = firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
        const phone = '018' + Math.floor(10000000 + Math.random() * 90000000).toString();
        const address = villages[Math.floor(Math.random() * villages.length)];
        
        mockMembers.push({
            id: 'member-' + i,
            name: name,
            phone: phone,
            address: address,
            member_type: 'General',
            monthly_fee: 150,
            status: 'Pending',
            join_date: '2026-06-30'
        });
    }

    // 3. General Income & Expenses
    const months = [4, 5, 6];
    months.forEach(m => {
        const fridays = m === 5 ? [1, 8, 15, 22, 29] : [3, 10, 17, 24];
        fridays.forEach((day, index) => {
            mockTransactions.push({
                id: `tx-jummah-${m}-${index}`,
                transaction_type: 'INCOME',
                category: 'Jummah',
                amount: Math.floor(4000 + Math.random() * 2500),
                payment_mode: 'CASH',
                description: `${BANGLA_MONTHS[m]} মাসের ${englishToBanglaNum((index+1).toString())} জুমার কালেকশন`,
                date: `2026-0${m}-${day < 10 ? '0' + day : day}`,
                created_by: 'cashier',
                created_at: new Date().toISOString()
            });
        });

        mockTransactions.push({
            id: `tx-don-${m}-1`,
            transaction_type: 'INCOME',
            category: 'Donation',
            amount: m === 5 ? 10000 : 5000,
            payment_mode: Math.random() > 0.5 ? 'BANK' : 'CASH',
            description: `মুহসিন সাহেবের বিশেষ দান`,
            date: `2026-0${m}-12`,
            created_by: 'cashier',
            created_at: new Date().toISOString()
        });

        mockTransactions.push({
            id: `tx-exp-imam-${m}`,
            transaction_type: 'EXPENSE',
            category: 'ImamSalary',
            amount: 12000,
            payment_mode: 'CASH',
            description: `ইবাম সাহেবের মাসিক হাদিয়া (${BANGLA_MONTHS[m]} মাস)`,
            date: `2026-0${m}-30`,
            created_by: 'cashier',
            created_at: new Date().toISOString()
        });

        mockTransactions.push({
            id: `tx-exp-mua-${m}`,
            transaction_type: 'EXPENSE',
            category: 'MuazzinSalary',
            amount: 8000,
            payment_mode: 'CASH',
            description: `মুয়াজ্জিন সাহেবের মাসিক বেতন (${BANGLA_MONTHS[m]} মাস)`,
            date: `2026-0${m}-30`,
            created_by: 'cashier',
            created_at: new Date().toISOString()
        });

        mockTransactions.push({
            id: `tx-exp-khat-${m}`,
            transaction_type: 'EXPENSE',
            category: 'KhatibSalary',
            amount: 10000,
            payment_mode: 'BANK',
            description: `জুমার খতিব সাহেবের হাদিয়া (${BANGLA_MONTHS[m]} মাস)`,
            date: `2026-0${m}-28`,
            created_by: 'cashier',
            created_at: new Date().toISOString()
        });

        mockTransactions.push({
            id: `tx-exp-elec-${m}`,
            transaction_type: 'EXPENSE',
            category: 'ElectricityBill',
            amount: Math.floor(1500 + Math.random() * 800),
            payment_mode: 'BANK',
            description: `মসজিদের বিদ্যুৎ বিল (${BANGLA_MONTHS[m]} মাস)`,
            date: `2026-0${m}-20`,
            created_by: 'cashier',
            created_at: new Date().toISOString()
        });

        if (m === 5) {
            mockTransactions.push({
                id: `tx-exp-maint-${m}`,
                transaction_type: 'EXPENSE',
                category: 'Maintenance',
                amount: 4500,
                payment_mode: 'CASH',
                description: `আইপিএস ব্যাটারি সার্ভিসিং ও ওয়ারিং মেরামত`,
                date: `2026-05-18`,
                created_by: 'cashier',
                created_at: new Date().toISOString()
            });
        }
    });

    mockTransactions.push({
        id: `tx-land-june`,
        transaction_type: 'INCOME',
        category: 'LandLease',
        amount: 15000,
        payment_mode: 'BANK',
        description: `মসজিদের দিঘির বাৎসরিক লিজের টাকা`,
        date: `2026-06-05`,
        created_by: 'cashier',
        created_at: new Date().toISOString()
    });

    state.members = mockMembers;
    state.subscriptions = mockSubscriptions;
    state.transactions = mockTransactions.sort((a,b) => new Date(b.date) - new Date(a.date));
    state.users = { ...DEFAULT_USERS };
    state.settings = { ...DEFAULT_SETTINGS };
    state.committee = [
        { id: 'comm-1', name: 'আলহাজ্ব মো: আব্দুর রহমান', designation: 'সভাপতি', category: 'Executive', phone: '01711122334', photo: '' },
        { id: 'comm-2', name: 'হাজী মোঃ রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', category: 'Executive', phone: '01722222222', photo: '' },
        { id: 'comm-3', name: 'মো: জমির উদ্দিন', designation: 'ক্যাশিয়ার', category: 'Executive', phone: '01733333333', photo: '' },
        { id: 'comm-4', name: 'হাজী জালাল আহমেদ', designation: 'সমাজ প্রধান/সর্দার', category: 'Sardar', phone: '01819876543', photo: '' },
        { id: 'comm-5', name: 'আলহাজ্ব আমির হোসেন', designation: 'সমাজ সর্দার', category: 'Sardar', phone: '01912345678', photo: '' }
    ];
    
    saveState();
}

// Push current DB snapshot to Recycle Bin
function backupToRecycleBin() {
    const snapshot = {
        deletedAt: new Date().toISOString(),
        members: JSON.parse(JSON.stringify(state.members)),
        transactions: JSON.parse(JSON.stringify(state.transactions)),
        subscriptions: JSON.parse(JSON.stringify(state.subscriptions)),
        committee: JSON.parse(JSON.stringify(state.committee))
    };
    state.global_recycle_bin.push(snapshot);
}

// Reset App
function resetAppDemoData() {
    if (confirm("আপনি কি নিশ্চিতভাবে সব ডাটা মুছে পূর্বের ডেমো ডাটায় ফিরে যেতে চান? (এটি করতে সভাপতির পাসওয়ার্ড লাগবে)")) {
        const presPass = prompt("নিরাপত্তার জন্য সভাপতির পাসওয়ার্ডটি দিন:");
        if (presPass === state.users.president.password) {
            backupToRecycleBin();
            
            // Keep users, settings, and recycle bin
            state.members = [];
            state.transactions = [];
            state.subscriptions = [];
            state.committee = [];
            saveState(); // Saves to cloud & local
            
            generateDemoData();
            document.getElementById('demoBanner').style.display = 'flex';
            checkLoginSession();
        } else {
            alert("দুঃখিত, সভাপতির পাসওয়ার্ড সঠিক নয়! ডাটা মোছা বাতিল করা হয়েছে।");
        }
    }
}

// Clear all data
function clearAllData() {
    if (confirm("সাবধান! এটি আপনার সকল ডাটা মুছে দেবে। ডাটাগুলো ৩০ দিন রিসাইকেল বিনে জমা থাকবে। আপনি কি ডাটাবেস সম্পূর্ণ খালি করতে চান?")) {
        const presPass = prompt("নিরাপত্তার জন্য সভাপতির পাসওয়ার্ডটি দিন:");
        if (presPass === state.users.president.password) {
            backupToRecycleBin();
            
            state.members = [];
            state.transactions = [];
            state.subscriptions = [];
            state.committee = [];
            saveState();
            
            document.getElementById('demoBanner').style.display = 'none';
            refreshAppUI();
            alert("সকল তথ্য মুছে ফেলা হয়েছে এবং ৩০ দিনের জন্য রিসাইকেল বিনে জমা করা হয়েছে।");
        } else {
            alert("দুঃখিত, সভাপতির পাসওয়ার্ড সঠিক নয়! ডাটা মোছা বাতিল করা হয়েছে।");
        }
    }
}

// Global UI Refresh
function refreshAppUI() {
    calculateFundBalances();
    updateDashboardStats();
    renderPendingMembers();
    renderRecentTransactions();
    renderMembersList();
    loadReports();
    renderCommitteeDashboard();
}

// Calculate Balances
function calculateFundBalances() {
    let totalCash = parseFloat(state.settings.initial_cash_balance || 0);
    let totalBank = parseFloat(state.settings.initial_bank_balance || 0);
    
    state.transactions.forEach(tx => {
        const val = parseFloat(tx.amount);
        if (tx.transaction_type === 'INCOME') {
            if (tx.payment_mode === 'CASH') totalCash += val;
            else if (tx.payment_mode === 'BANK') totalBank += val;
        } else if (tx.transaction_type === 'EXPENSE') {
            if (tx.payment_mode === 'CASH') totalCash -= val;
            else if (tx.payment_mode === 'BANK') totalBank -= val;
        }
    });

    const total = totalCash + totalBank;
    document.getElementById('totalBalance').innerText = formatCurrency(total);
    document.getElementById('cashBalance').innerText = formatCurrency(totalCash);
    document.getElementById('bankBalance').innerText = formatCurrency(totalBank);
}

// Update Dashboard summary stats
function updateDashboardStats() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    let totalInc = 0;
    let totalExp = 0;

    state.transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        const m = txDate.getMonth() + 1;
        const y = txDate.getFullYear();

        if (m === currentMonth && y === currentYear) {
            if (tx.transaction_type === 'INCOME') {
                totalInc += parseFloat(tx.amount);
            } else if (tx.transaction_type === 'EXPENSE') {
                totalExp += parseFloat(tx.amount);
            }
        }
    });

    document.getElementById('monthlyIncome').innerText = formatCurrency(totalInc);
    document.getElementById('monthlyExpense').innerText = formatCurrency(totalExp);
}

// Switch Views
function switchView(viewId) {
    if (!state.currentUser) return;

    const role = state.currentUser.role;
    if (viewId === 'add-transaction' && role !== 'cashier') {
        alert("শুধুমাত্র ক্যাশিয়ার লেনদেন এন্ট্রি করতে পারবেন!");
        return;
    }
    if (role === 'member' && viewId === 'profile') {
        alert("আপনার এই তথ্য দেখার অনুমতি নেই!");
        return;
    }

    // Toggle header visibility: only visible on Home (dashboard) tab
    const header = document.querySelector('.app-header');
    if (header) {
        if (viewId === 'dashboard') {
            header.style.display = 'block';
        } else {
            header.style.display = 'none';
        }
    }

    const views = document.querySelectorAll('.app-view');
    views.forEach(v => v.classList.remove('active'));

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) targetView.classList.add('active');

    const targetNav = document.getElementById(`nav-${viewId}`);
    if (targetNav) targetNav.classList.add('active');

    state.currentView = viewId;
    
    if (viewId === 'dashboard') {
        refreshAppUI();
    } else if (viewId === 'members') {
        renderMembersList();
    } else if (viewId === 'committee') {
        renderCommitteeView();
    } else if (viewId === 'reports') {
        loadReports();
    } else if (viewId === 'profile') {
        populateSettingsInputs();
    }

    document.getElementById('appContent').scrollTop = 0;
}

// Render Recent Transactions
function renderRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    container.innerHTML = '';
    
    const recents = state.transactions.slice(0, 5);
    if (recents.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।</div>';
        return;
    }

    recents.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        let icon = 'fa-receipt';
        if (tx.category === 'Subscription') icon = 'fa-users';
        else if (tx.category === 'Jummah') icon = 'fa-mosque';
        else if (tx.category === 'Donation') icon = 'fa-hand-holding-heart';
        else if (tx.category === 'ImamSalary' || tx.category === 'MuazzinSalary' || tx.category === 'KhatibSalary') icon = 'fa-user-tie';
        else if (tx.category === 'ElectricityBill') icon = 'fa-bolt';
        else if (tx.category === 'Maintenance') icon = 'fa-hammer';
        else if (tx.category === 'LandLease') icon = 'fa-mountain';

        const isInc = tx.transaction_type === 'INCOME';
        item.innerHTML = `
            <div class="tx-left">
                <div class="tx-category-icon">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="tx-details">
                    <h5>${tx.description || CATEGORIES_BN[tx.category] || tx.category}</h5>
                    <p>${formatDate(tx.date)}</p>
                </div>
            </div>
            <div class="tx-right">
                <div class="tx-amount ${isInc ? 'inc' : 'exp'}">
                    ${isInc ? '+' : '-'}৳ ${englishToBanglaNum(tx.amount.toString())}
                </div>
                <span class="tx-mode">${tx.payment_mode === 'CASH' ? 'ক্যাশ' : 'ব্যাংক'}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// ADMIN ONLY: Render Pending Members
function renderPendingMembers() {
    const container = document.getElementById('pendingMembersList');
    const section = document.getElementById('pendingMembersSection');
    
    if (state.currentUser.role !== 'admin') {
        section.style.display = 'none';
        return;
    }

    const pendings = state.members.filter(m => m.status === 'Pending');
    const deleteRequests = state.members.filter(m => m.delete_requested === true && m.status !== 'Deleted');
    const totalCount = pendings.length + deleteRequests.length;
    
    document.getElementById('pendingCount').innerText = englishToBanglaNum(totalCount.toString());

    if (totalCount === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    // Render Pending approvals
    pendings.forEach(m => {
        const card = document.createElement('div');
        card.className = 'pending-card';
        card.innerHTML = `
            <div class="pending-details">
                <h5>${m.name} <span style="font-size: 9px; background: var(--primary-light)88; color: var(--primary-dark); padding: 2px 6px; border-radius: 12px; margin-left: 5px;">নতুন আবেদন</span></h5>
                <p><i class="fa-solid fa-location-dot"></i> ${m.address} | <i class="fa-solid fa-phone"></i> ${englishToBanglaNum(m.phone)}</p>
            </div>
            <div class="pending-actions">
                <button class="btn btn-primary btn-small" onclick="approveMember('${m.id}')">অনুমোদন</button>
                <button class="btn btn-secondary btn-small" style="background-color: var(--danger-light); color: var(--danger-color);" onclick="rejectMember('${m.id}')">বাতিল</button>
            </div>
        `;
        container.appendChild(card);
    });

    // Render Deletion requests
    deleteRequests.forEach(m => {
        const card = document.createElement('div');
        card.className = 'pending-card';
        card.style.borderLeft = '4px solid var(--danger-color)';
        card.innerHTML = `
            <div class="pending-details">
                <h5>${m.name} <span style="font-size: 9px; background: #f8d7da; color: #721c24; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">বাতিল আবেদন</span></h5>
                <p><i class="fa-solid fa-location-dot"></i> ${m.address} | <i class="fa-solid fa-phone"></i> ${englishToBanglaNum(m.phone)}</p>
            </div>
            <div class="pending-actions">
                <button class="btn btn-primary btn-small" style="background-color: var(--danger-color); border-color: var(--danger-color);" onclick="approveDeletionRequest('${m.id}')">অনুমোদন</button>
                <button class="btn btn-secondary btn-small" onclick="rejectDeletionRequest('${m.id}')">বাতিল</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Approve pending member
function approveMember(id) {
    const member = state.members.find(m => m.id === id);
    if (!member) return;

    member.status = 'Active';

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    state.subscriptions.push({
        id: `sub-${member.id}-${currentYear}-${currentMonth}`,
        member_id: member.id,
        year: currentYear,
        month: currentMonth,
        amount_paid: 0,
        due_amount: member.monthly_fee,
        status: member.member_type === 'Free' ? 'Free' : 'Unpaid',
        last_payment_date: ''
    });

    saveState();
    refreshAppUI();
    alert(`${member.name}-এর আবেদন অনুমোদন করা হয়েছে।`);
}

// Reject pending member
function rejectMember(id) {
    if (confirm("আপনি কি নিশ্চিতভাবে এই আবেদনটি বাতিল ও মুছে ফেলতে চান?")) {
        state.members = state.members.filter(m => m.id !== id);
        saveState();
        refreshAppUI();
        alert("আবেদনটি সফলভাবে বাতিল করা হয়েছে।");
    }
}

// Render Members List
function renderMembersList() {
    const container = document.getElementById('membersList');
    if (!container) return;
    container.innerHTML = '';

    const searchVal = document.getElementById('memberSearchInput').value.toLowerCase();
    
    let totalGeneral = 0;
    let totalPoor = 0;
    let totalFree = 0;
    let totalDueCount = 0;

    const approvedActiveMembers = state.members.filter(m => {
        if (!m) return false;
        const st = (m.status || '').toLowerCase();
        return (st === 'active' || st === 'suspended' || st === '') && !m.delete_requested && !m.is_deleted;
    });

    const filteredMembers = approvedActiveMembers.filter(m => {
        if (m.member_type === 'General') totalGeneral++;
        else if (m.member_type === 'Poor') totalPoor++;
        else if (m.member_type === 'Free') totalFree++;

        const memberDue = calculateMemberTotalDue(m.id);
        if (memberDue > 0) totalDueCount++;

        const realIndex = state.members.findIndex(member => member.id === m.id) + 1;
        const displayNum = String(realIndex).padStart(2, '0');
        const displayNumBN = englishToBanglaNum(displayNum);
        
        const matchesSearch = m.name.toLowerCase().includes(searchVal) || 
                              (m.phone && m.phone.includes(searchVal)) ||
                              displayNum.includes(searchVal) ||
                              displayNumBN.includes(searchVal) ||
                              m.id.includes(searchVal);
                              
        if (!matchesSearch) return false;

        if (state.memberFilter === 'due') return memberDue > 0;
        if (state.memberFilter !== 'all' && m.member_type !== state.memberFilter) return false;

        return true;
    });

    if (document.getElementById('countAll')) document.getElementById('countAll').innerText = englishToBanglaNum(approvedActiveMembers.length.toString());
    if (document.getElementById('countDue')) document.getElementById('countDue').innerText = englishToBanglaNum(totalDueCount.toString());
    if (document.getElementById('countGeneral')) document.getElementById('countGeneral').innerText = englishToBanglaNum(totalGeneral.toString());
    if (document.getElementById('countPoor')) document.getElementById('countPoor').innerText = englishToBanglaNum(totalPoor.toString());
    if (document.getElementById('countFree')) document.getElementById('countFree').innerText = englishToBanglaNum(totalFree.toString());

    // Calculate total outstanding dues of all active members
    let totalDuesSum = 0;
    approvedActiveMembers.forEach(m => {
        totalDuesSum += calculateMemberTotalDue(m.id);
    });
    const outstandingDuesText = document.getElementById('totalOutstandingDues');
    if (outstandingDuesText) {
        outstandingDuesText.innerText = `৳ ${englishToBanglaNum(totalDuesSum.toString())}`;
    }

    if (filteredMembers.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">কোনো সদস্যের রেকর্ড মেলেনি।</div>';
        return;
    }

    filteredMembers.forEach(m => {
        const item = document.createElement('div');
        item.className = 'member-card';
        
        item.onclick = () => openMemberDetails(m.id);

        const realIndex = state.members.findIndex(member => member.id === m.id) + 1;
        const displayNum = String(realIndex).padStart(2, '0');
        const displayNumBN = englishToBanglaNum(displayNum);

        const firstChar = (m.name || 'স').trim().charAt(0);
        const dueAmount = calculateMemberTotalDue(m.id);
        const advanceAmount = parseFloat(m.advance_balance || 0);
        const hasDue = dueAmount > 0;

        let badgeClass = 'general';
        let badgeLabel = 'সাধারণ';
        if (m.member_type === 'Poor') { badgeClass = 'poor'; badgeLabel = 'দরিদ্র'; }
        else if (m.member_type === 'Free') { badgeClass = 'free'; badgeLabel = 'ফ্রি'; }

        let dueDisplay = '';
        if (advanceAmount > 0) {
            dueDisplay = `
                <div class="due-label" style="color: var(--success-color);">অগ্রিম জমা</div>
                <div class="due-val success" style="color: var(--success-color); font-weight: bold;">
                    ৳ ${englishToBanglaNum(advanceAmount.toFixed(2))}
                </div>
            `;
        } else {
            dueDisplay = `
                <div class="due-label">বকেয়া পরিমাণ</div>
                <div class="due-val ${hasDue ? 'danger' : 'success'}">
                    ${hasDue ? '৳ ' + englishToBanglaNum(dueAmount.toString()) : 'পরিশোধিত'}
                </div>
            `;
        }

        item.innerHTML = `
            <div class="member-info">
                <div class="member-avatar" style="font-size: 14px; font-weight: bold; background-color: var(--primary-light); color: var(--primary-dark); border: 2.5px solid var(--primary-color); display: flex; align-items: center; justify-content: center;">${displayNum}</div>
                <div>
                    <div class="member-name" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <strong class="member-name-link" style="color: var(--text-main); font-size: 15px; cursor: pointer;" onclick="event.stopPropagation(); showMemberStatement('${m.id}')">${m.name}</strong>
                        <a href="tel:${(m.phone || '').replace(/[^0-9]/g, '')}" class="quick-call-icon-btn" onclick="event.stopPropagation()" title="কল করুন" style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background-color: #e8f5e9; border: 1px solid #81c784; text-decoration: none; transition: transform 0.15s ease;">
                            <i class="fa-solid fa-phone-flip" style="color: #2e7d32; font-size: 11px;"></i>
                        </a>
                        ${advanceAmount > 0 ? `<span style="font-size: 10px; background-color: var(--success-color); color: white; padding: 2px 6px; border-radius: 10px; font-weight: normal;">অগ্রিম: ৳ ${englishToBanglaNum(advanceAmount.toFixed(0))}</span>` : ''}
                    </div>
                    <div style="margin-top: 4px;">
                        <span class="member-type-badge ${badgeClass}">${badgeLabel} - ৳ ${englishToBanglaNum(m.monthly_fee.toString())}</span>
                        ${m.status === 'Suspended' ? '<span class="member-type-badge" style="background-color: #fd7e14; color: #fff; margin-left: 4px;">স্থগিত</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="member-due-status">
                ${dueDisplay}
            </div>
        `;
        container.appendChild(item);
    });
}

function filterMembers() {
    renderMembersList();
}

function setMemberFilter(filter, el) {
    state.memberFilter = filter;
    const chips = el.parentNode.querySelectorAll('.filter-chip');
    chips.forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderMembersList();
}

// Calculate Total Due for a Member
function calculateMemberTotalDue(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member || member.member_type === 'Free' || member.status === 'Pending' || member.is_deleted) return 0;

    let totalExpected = 0;
    let totalPaid = 0;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const joinParts = (member.join_date || '2025-01-01').split('-');
    const joinYear = parseInt(joinParts[0]) || 2025;
    const joinMonth = parseInt(joinParts[1]) || 1;
    const fee = parseFloat(member.monthly_fee || 0);

    for (let year = joinYear; year <= currentYear; year++) {
        const startM = year === joinYear ? joinMonth : 1;
        const endM = year === currentYear ? currentMonth : 12;

        for (let m = startM; m <= endM; m++) {
            const sub = state.subscriptions.find(s => s.member_id === memberId && s.year === year && s.month === m);
            totalExpected += fee;
            if (sub) {
                totalPaid += parseFloat(sub.amount_paid || 0);
            }
        }
    }

    const openingArrears = parseFloat(member.opening_arrears || 0);
    const due = (totalExpected + openingArrears) - totalPaid;
    return due > 0 ? due : 0;
}

// Modal management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeModalOnOverlay(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
}

// Add Member Fee Auto Adjuster
function adjustFeeAmountInput() {
    const type = document.getElementById('mType').value;
    const customFee = document.getElementById('mCustomFee');
    if (type === 'General') customFee.value = 150;
    else if (type === 'Poor') customFee.value = 100;
    else if (type === 'Free') customFee.value = 0;
}

// Add / Edit Member Form
function handleNewMemberSubmit(e) {
    e.preventDefault();
    const role = state.currentUser.role;
    
    if (role !== 'admin' && role !== 'secretary') {
        alert("আপনার সদস্য যোগ করার অনুমতি নেই!");
        return;
    }

    const editId = document.getElementById('editMemberId').value;
    const name = document.getElementById('mName').value.trim();
    const phone = document.getElementById('mPhone').value.trim();
    const address = document.getElementById('mAddress').value.trim();
    
    let type = 'General';
    let fee = 150;
    
    if (role === 'admin') {
        type = document.getElementById('mType').value;
        fee = parseFloat(document.getElementById('mCustomFee').value);
    }

    if (editId) {
        const mIndex = state.members.findIndex(m => m.id === editId);
        if (mIndex !== -1) {
            state.members[mIndex].name = name;
            state.members[mIndex].phone = phone;
            state.members[mIndex].address = address;
            
            if (role === 'admin') {
                state.members[mIndex].member_type = type;
                state.members[mIndex].monthly_fee = fee;
            }
            
            saveState();
            closeModal('add-member-modal');
            refreshAppUI();
            alert("সদস্যের তথ্য সফলভাবে সংশোধন করা হয়েছে।");
        }
    } else {
        const exists = state.members.some(m => m.phone === phone);
        if (exists) {
            alert("এই মোবাইল নম্বর দিয়ে অলরেডি একজন সদস্য রেজিস্টার করা আছে!");
            return;
        }

        const newId = 'member-' + Date.now();
        const initialStatus = role === 'admin' ? 'Active' : 'Pending';

        const newMember = {
            id: newId,
            name: name,
            phone: phone,
            address: address,
            member_type: type,
            monthly_fee: fee,
            status: initialStatus,
            join_date: new Date().toISOString().split('T')[0]
        };

        state.members.push(newMember);

        if (initialStatus === 'Active') {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            state.subscriptions.push({
                id: `sub-${newId}-${currentYear}-${currentMonth}`,
                member_id: newId,
                year: currentYear,
                month: currentMonth,
                amount_paid: 0,
                due_amount: fee,
                status: type === 'Free' ? 'Free' : 'Unpaid',
                last_payment_date: ''
            });
        }

        saveState();
        closeModal('add-member-modal');
        
        document.getElementById('newMemberForm').reset();
        document.getElementById('editMemberId').value = '';
        adjustFeeAmountInput();
        
        refreshAppUI();
        
        if (initialStatus === 'Pending') {
            alert("নতুন সদস্যের আবেদন যুক্ত করা হয়েছে। এটি এডমিনের অনুমোদনের পর চূড়ান্ত তালিকায় যুক্ত হবে।");
        } else {
            alert("নতুন সদস্য সফলভাবে সরাসরি যুক্ত করা হয়েছে।");
        }
    }
}

// Toggle Secretary/Admin Arrears Adjustment Panel (Accordion Expand/Collapse)
function toggleArrearsAdjustmentPanel() {
    const secPanel = document.getElementById('secretaryArrearsPanel');
    const toggleIcon = document.getElementById('adjToggleIcon');
    if (!secPanel) return;

    if (secPanel.style.display === 'none' || !secPanel.style.display) {
        secPanel.style.display = 'block';
        if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-up';
    } else {
        secPanel.style.display = 'none';
        if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-down';
    }
}

// ================== MEMBER TRANSACTION STATEMENT ==================

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

// Open Member Details (Hides monthly calendar grid as requested)
function openMemberDetails(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    state.activeMemberId = memberId;

    const cleanPhone = (member.phone || '').replace(/[^0-9]/g, '');
    document.getElementById('mdModalPhone').innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
            <a href="tel:${cleanPhone}" style="display: inline-flex; align-items: center; gap: 5px; color: var(--primary-color); font-weight: bold; text-decoration: none; background: var(--primary-light); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--primary-color); font-size: 12px;">
                <i class="fa-solid fa-phone-flip"></i> ${englishToBanglaNum(member.phone)} (কল করুন)
            </a>
        </div>
    `;
    document.getElementById('mdModalAddress').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${member.address}`;
    
    let typeClass = 'general';
    let typeLabel = 'সাধারণ সদস্য';
    if (member.member_type === 'Poor') { typeClass = 'poor'; typeLabel = 'দরিদ্র সদস্য'; }
    else if (member.member_type === 'Free') { typeClass = 'free'; typeLabel = 'ফ্রি সদস্য (মওকুফ)'; }
    
    document.getElementById('mdModalType').innerHTML = `<span class="member-type-badge ${typeClass}">${typeLabel}</span>`;
    
    const totalDue = calculateMemberTotalDue(memberId);
    const advanceVal = parseFloat(member.advance_balance || 0);

    if (advanceVal > 0) {
        document.getElementById('mdModalTotalDue').innerHTML = `<div style="text-align: right;"><span class="text-muted" style="text-decoration: line-through; font-size: 13px; display: block; margin-bottom: 2px; color: var(--text-muted) !important;">বকেয়া: ৳ ০.০০</span><span style="color: var(--success-color); font-size: 18px; font-weight: bold; display: block;">অগ্রিম জমা: ৳ ${englishToBanglaNum(advanceVal.toFixed(2))}</span></div>`;
    } else {
        document.getElementById('mdModalTotalDue').innerText = `৳ ${englishToBanglaNum(totalDue.toFixed(2))}`;
        document.getElementById('mdModalTotalDue').className = totalDue > 0 ? 'text-danger' : 'text-success';
    }

    const editBtn = document.getElementById('mdEditBtn');
    editBtn.onclick = () => {
        closeModal('member-details-modal');
        openEditMemberForm(member.id);
    };

    const deleteBtn = document.getElementById('mdDeleteBtn');
    deleteBtn.onclick = () => {
        closeModal('member-details-modal');
        deleteMember(member.id);
    };

    const role = state.currentUser.role;
    const canCollect = role === 'cashier';
    const easyPay = document.getElementById('easyPaymentPanel');
    const presPanel = document.getElementById('presidentWaiverPanel');
    
    // Only cashier can collect regular subscription payments
    if (canCollect && member.member_type !== 'Free') {
        easyPay.style.display = 'block';
        document.getElementById('epMemberId').value = memberId;
        document.getElementById('epTotalDueHidden').value = totalDue;
        document.getElementById('epAmount').value = '';
        document.getElementById('epAmount').removeAttribute('max'); // Remove max limit so they can pay any amount!
        document.getElementById('epReceiptNo').value = '';
        
        // Programmatically bind events for absolute cross-browser reliability
        const epAmountInput = document.getElementById('epAmount');
        if (epAmountInput) {
            epAmountInput.removeEventListener('input', calculateRealtimeNextDue);
            epAmountInput.removeEventListener('keyup', calculateRealtimeNextDue);
            epAmountInput.removeEventListener('change', calculateRealtimeNextDue);
            
            epAmountInput.addEventListener('input', calculateRealtimeNextDue);
            epAmountInput.addEventListener('keyup', calculateRealtimeNextDue);
            epAmountInput.addEventListener('change', calculateRealtimeNextDue);
        }
        
        calculateRealtimeNextDue();
    } else {
        easyPay.style.display = 'none';
    }

    // Only President can see and apply fee waivers
    if (role === 'president' && member.member_type !== 'Free' && totalDue > 0) {
        if (presPanel) {
            presPanel.style.display = 'block';
            document.getElementById('wpMemberId').value = memberId;
            document.getElementById('wpAmount').value = '';
            document.getElementById('wpAmount').max = totalDue;
            document.getElementById('wpReason').value = '';
        }
    } else {
        if (presPanel) presPanel.style.display = 'none';
    }

    // Only Secretary and Admin can see the toggle button for arrears adjustments
    const secPanel = document.getElementById('secretaryArrearsPanel');
    const toggleBtn = document.getElementById('toggleArrearsPanelBtn');
    const toggleIcon = document.getElementById('adjToggleIcon');

    // Collapsed by default when modal opens
    if (secPanel) secPanel.style.display = 'none';
    if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-down';

    if ((role === 'admin' || role === 'secretary') && member.member_type !== 'Free') {
        if (toggleBtn) toggleBtn.style.display = 'flex';
        document.getElementById('adjMemberId').value = memberId;
        document.getElementById('adjAmount').value = '';
        document.getElementById('adjReason').value = '';
    } else {
        if (toggleBtn) toggleBtn.style.display = 'none';
    }

    // Render dynamic action buttons in details modal
    const actionSection = document.getElementById('mdActionButtonsSection');
    if (actionSection) {
        actionSection.innerHTML = '';
        
        // 1. Suspend / Activate button for General Secretary and Admin
        if (role === 'secretary' || role === 'admin') {
            const isSuspended = member.status === 'Suspended';
            const suspendBtn = document.createElement('button');
            suspendBtn.className = isSuspended ? 'btn btn-primary' : 'btn btn-secondary';
            suspendBtn.style.backgroundColor = isSuspended ? '#28a745' : '#fd7e14';
            suspendBtn.style.borderColor = isSuspended ? '#28a745' : '#fd7e14';
            suspendBtn.style.color = '#fff';
            suspendBtn.style.fontWeight = 'bold';
            suspendBtn.innerHTML = isSuspended ? '<i class="fa-solid fa-user-check"></i> সদস্যপদ সক্রিয় করুন' : '<i class="fa-solid fa-user-slash"></i> সদস্যপদ স্থগিত করুন';
            suspendBtn.onclick = () => {
                toggleMemberSuspension(member.id);
            };
            actionSection.appendChild(suspendBtn);
        }

        // 2. Deletion Requests & Soft Deletion Approval
        if (role === 'admin') {
            if (member.delete_requested) {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.gap = '8px';
                
                const approveBtn = document.createElement('button');
                approveBtn.className = 'btn btn-primary';
                approveBtn.style.flex = '1';
                approveBtn.style.backgroundColor = '#dc3545';
                approveBtn.style.borderColor = '#dc3545';
                approveBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> ডিলিট অনুমোদন';
                approveBtn.onclick = () => {
                    approveDeletionRequest(member.id);
                };

                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'btn btn-secondary';
                rejectBtn.style.flex = '1';
                rejectBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> বাতিল করুন';
                rejectBtn.onclick = () => {
                    rejectDeletionRequest(member.id);
                };

                row.appendChild(approveBtn);
                row.appendChild(rejectBtn);
                actionSection.appendChild(row);
            }
        } else if (role === 'secretary') {
            // Only General Secretary can request deletion
            if (member.delete_requested) {
                const pendingLabel = document.createElement('button');
                pendingLabel.className = 'btn btn-secondary';
                pendingLabel.disabled = true;
                pendingLabel.style.backgroundColor = '#ffc107';
                pendingLabel.style.borderColor = '#ffc107';
                pendingLabel.style.color = '#000';
                pendingLabel.style.fontWeight = 'bold';
                pendingLabel.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ডিলিট আবেদন পেন্ডিং রয়েছে';
                actionSection.appendChild(pendingLabel);
            } else {
                const requestBtn = document.createElement('button');
                requestBtn.className = 'btn btn-secondary';
                requestBtn.style.borderColor = '#dc3545';
                requestBtn.style.color = '#dc3545';
                requestBtn.style.background = 'white';
                requestBtn.innerHTML = '<i class="fa-solid fa-trash-can-arrow-up"></i> সদস্য বাতিল (ডিলিট) আবেদন করুন';
                requestBtn.onclick = () => {
                    requestMemberDeletion(member.id);
                };
                actionSection.appendChild(requestBtn);
            }
        }
    }

    openModal('member-details-modal');
}

// Real-time "Next Due" calculation (with defensive DB fallback and NaN safety)
function calculateRealtimeNextDue() {
    const totalDueEl = document.getElementById('epTotalDueHidden');
    const epAmountEl = document.getElementById('epAmount');
    const epNextDueTextEl = document.getElementById('epNextDueText');
    
    if (!epNextDueTextEl) return;
    
    let totalDue = totalDueEl ? parseFloat(totalDueEl.value) : NaN;
    if (isNaN(totalDue)) {
        const member = state.members.find(m => m.id === state.activeMemberId);
        totalDue = member ? calculateMemberTotalDue(member.id) : 0;
    }
    
    const paidInput = epAmountEl ? parseFloat(epAmountEl.value) : 0;
    const nextDue = totalDue - (isNaN(paidInput) ? 0 : paidInput);
    
    if (nextDue < 0) {
        const advanceCredit = Math.abs(nextDue);
        epNextDueTextEl.innerHTML = `<span style="color: var(--success-color); font-weight: bold;">৳ ০.০০ (অগ্রিম জমা: ৳ ${englishToBanglaNum(advanceCredit.toFixed(2))})</span>`;
    } else {
        const finalNextDue = nextDue > 0 ? nextDue : 0;
        epNextDueTextEl.innerHTML = `<span style="color: var(--primary-color); font-weight: bold;">৳ ${englishToBanglaNum(finalNextDue.toFixed(2))}</span>`;
    }
}

// Handle Easy Payment Submission
function handleEasyPaymentSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('epMemberId').value;
    const totalPaid = parseFloat(document.getElementById('epAmount').value);
    const receiptNo = document.getElementById('epReceiptNo').value.trim();
    const date = document.getElementById('epDate').value;
    const mode = 'CASH'; // Default mode is Cash

    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (totalPaid <= 0) {
        alert("দয়া করে সঠিক অর্থ পরিশোধ এন্ট্রি দিন!");
        return;
    }

    let remainingPaid = totalPaid;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthLimit = now.getMonth() + 1;

    const joinParts = (member.join_date || '2025-01-01').split('-');
    const joinYear = parseInt(joinParts[0]) || 2025;
    const joinMonth = parseInt(joinParts[1]) || 1;

    for (let year = joinYear; year <= currentYear && remainingPaid > 0; year++) {
        const startM = year === joinYear ? joinMonth : 1;
        const endM = year === currentYear ? currentMonthLimit : 12;

        for (let m = startM; m <= endM && remainingPaid > 0; m++) {
            let sub = state.subscriptions.find(s => s.member_id === memberId && s.year === year && s.month === m);
            if (!sub) {
                sub = {
                    id: `sub-${memberId}-${year}-${m}`,
                    member_id: memberId,
                    year: year,
                    month: m,
                    amount_paid: 0,
                    due_amount: member.monthly_fee,
                    status: 'Unpaid',
                    last_payment_date: ''
                };
                state.subscriptions.push(sub);
            }

            const currentDue = member.monthly_fee - parseFloat(sub.amount_paid);
            if (currentDue > 0) {
                const payForThisMonth = Math.min(remainingPaid, currentDue);
                
                sub.amount_paid = parseFloat(sub.amount_paid) + payForThisMonth;
                sub.due_amount = member.monthly_fee - sub.amount_paid;
                sub.status = sub.due_amount <= 0 ? 'Paid' : 'Partial';
                sub.last_payment_date = date;
                sub.receipt_no = receiptNo;

                remainingPaid -= payForThisMonth;
            }
        }
    }

    let descriptionText = `${member.name} - চাঁদা আদায় (রশিদ নং: ${englishToBanglaNum(receiptNo)})`;
    if (remainingPaid > 0) {
        member.advance_balance = parseFloat(member.advance_balance || 0) + remainingPaid;
        descriptionText += ` [অগ্রিম জমা: ৳ ${englishToBanglaNum(remainingPaid.toFixed(2))}]`;
        // Apply this new advance balance immediately to any future months
        processAdvanceDeductions();
    }

    const txId = 'tx-sub-' + Date.now();
    state.transactions.unshift({
        id: txId,
        transaction_type: 'INCOME',
        category: 'Subscription',
        amount: totalPaid,
        payment_mode: mode,
        description: descriptionText,
        date: date,
        member_id: memberId,
        receipt_no: receiptNo,
        created_by: state.currentUser.role,
        created_at: new Date().toISOString()
    });

    saveState();
    closeModal('member-details-modal');
    refreshAppUI();
    
    if (remainingPaid > 0) {
        alert(`৳ ${englishToBanglaNum(totalPaid.toString())} চাঁদা আদায় সফল হয়েছে। এর মধ্যে ৳ ${englishToBanglaNum(remainingPaid.toFixed(2))} সদস্যের অ্যাকাউন্টে অগ্রিম হিসেবে জমা রাখা হয়েছে।`);
    } else {
        alert(`৳ ${englishToBanglaNum(totalPaid.toString())} চাঁদা আদায় সফলভাবে রশিদ নম্বর ${englishToBanglaNum(receiptNo)} সহ রেকর্ড করা হয়েছে।`);
    }
}
// Open Edit Member Form
function openEditMemberForm(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    document.getElementById('editMemberId').value = member.id;
    document.getElementById('mName').value = member.name;
    document.getElementById('mPhone').value = member.phone;
    document.getElementById('mAddress').value = member.address;
    
    document.getElementById('addMemberModalTitle').innerText = 'সদস্যের তথ্য সংশোধন';
    document.getElementById('saveMemberBtn').innerText = 'সংশোধন সংরক্ষণ করুন';

    if (state.currentUser.role === 'admin') {
        document.getElementById('mType').value = member.member_type;
        document.getElementById('mCustomFee').value = member.monthly_fee;
    }

    openModal('add-member-modal');
}

// Reset member form
document.getElementById('addMemberBtn').addEventListener('click', () => {
    document.getElementById('editMemberId').value = '';
    document.getElementById('newMemberForm').reset();
    document.getElementById('addMemberModalTitle').innerText = 'নতুন সদস্য যুক্ত করুন';
    document.getElementById('saveMemberBtn').innerText = 'সংরক্ষণ করুন';
    adjustFeeAmountInput();
});

// Admin Only: Delete member
function deleteMember(id) {
    if (state.currentUser.role !== 'admin') {
        alert("শুধুমাত্র এডমিন সদস্য বাতিল করতে পারবেন!");
        return;
    }

    const member = state.members.find(m => m.id === id);
    if (!member) return;

    if (confirm(`আপনি কি নিশ্চিতভাবে "${member.name}"-কে সদস্য তালিকা থেকে বাদ দিতে চান?`)) {
        member.status = 'Inactive';
        saveState();
        refreshAppUI();
        alert("সদস্যকে সফলভাবে তালিকা থেকে বাদ দেওয়া হয়েছে।");
    }
}

// Add Custom Income & Expense Transaction Form
function setTxFormType(type) {
    state.txFormType = type;
    document.getElementById('txType').value = type;

    const incBtn = document.getElementById('txTypeIncomeBtn');
    const expBtn = document.getElementById('txTypeExpenseBtn');

    if (type === 'INCOME') {
        incBtn.className = 'btn btn-primary';
        expBtn.className = 'btn btn-secondary';
    } else {
        incBtn.className = 'btn btn-secondary';
        expBtn.className = 'btn btn-primary';
    }

    updateCategoryDropdown();
}

function updateCategoryDropdown() {
    const dropdown = document.getElementById('txCategory');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    const incomeCats = [
        { value: 'Jummah', label: 'জুমার চাঁদা' },
        { value: 'Donation', label: 'অনুদান (দান)' },
        { value: 'LandLease', label: 'জমির খাজনা/লিজ' },
        { value: 'Admission', label: 'ভর্তি ফি (নতুন সদস্য)' },
        { value: 'Others_Income', label: 'অন্যান্য আয়' }
    ];

    const expenseCats = [
        { value: 'ElectricityBill', label: 'বিদ্যুৎ বিল' },
        { value: 'ImamSalary', label: 'ইমাম সাহেবের বেতন' },
        { value: 'MuazzinSalary', label: 'মুয়াজ্জিনের বেতন' },
        { value: 'KhatibSalary', label: 'খতিবের বেতন' },
        { value: 'Maintenance', label: 'মসজিদ সংস্কার/রক্ষণাবেক্ষণ' },
        { value: 'Others_Expense', label: 'অন্যান্য ব্যয়' }
    ];

    const targetList = state.txFormType === 'INCOME' ? incomeCats : expenseCats;
    targetList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.value;
        opt.innerText = c.label;
        dropdown.appendChild(opt);
    });

    // Run verification immediately to sync the validation status
    handleCategoryChange();
}

// Dynamically handle description field validation based on category selection
function handleCategoryChange() {
    const categorySelect = document.getElementById('txCategory');
    const descLabel = document.getElementById('txDescriptionLabel');
    const descInput = document.getElementById('txDescription');
    
    if (!categorySelect || !descLabel || !descInput) return;
    
    const category = categorySelect.value;
    if (category === 'Others_Expense' || category === 'Others_Income') {
        descLabel.innerHTML = 'বিবরণ (অবশ্যই লিখতে হবে) <span class="text-danger" style="color: var(--danger-color);">*</span>';
        descInput.required = true;
        descInput.placeholder = "এখানে ব্যয়ের বিবরণ বা কারণ বিস্তারিত লিখুন (বাধ্যতামূলক)...";
        descInput.style.borderColor = 'var(--danger-color)';
    } else {
        descLabel.innerText = 'বিবরণ (ঐচ্ছিক)';
        descInput.required = false;
        descInput.placeholder = "লেনদেন সম্পর্কিত সংক্ষিপ্ত তথ্য...";
        descInput.style.borderColor = 'var(--border-color)';
    }
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    
    if (state.currentUser.role === 'secretary') {
        alert("আপনার এই লেনদেন এন্ট্রি করার অনুমতি নেই!");
        return;
    }

    const type = document.getElementById('txType').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    const mode = document.getElementById('txMode').value;
    const date = document.getElementById('txDate').value;
    const desc = document.getElementById('txDescription').value;

    const newTx = {
        id: 'tx-custom-' + Date.now(),
        transaction_type: type,
        category: category,
        amount: amount,
        payment_mode: mode,
        description: desc,
        date: date,
        created_by: state.currentUser.role,
        created_at: new Date().toISOString()
    };

    state.transactions.unshift(newTx);
    saveState();
    
    document.getElementById('newTransactionForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('txDate').value = today;
    setTxFormType('INCOME');

    switchView('dashboard');
    alert("লেনদেনটি সফলভাবে সংরক্ষণ করা হয়েছে।");
}

// ── Report Tab State ──
let currentReportTab = 'monthly';

function switchReportTab(tab) {
    currentReportTab = tab;
    ['monthly', 'quarterly', 'halfyearly', 'yearly', 'custom'].forEach(t => {
        const btn = document.getElementById('rpt-tab-' + t);
        const ctrl = document.getElementById('rpt-controls-' + t);
        if (btn) {
            btn.style.background = t === tab ? 'var(--primary-color)' : 'transparent';
            btn.style.color = t === tab ? '#fff' : '#444';
        }
        if (ctrl) ctrl.style.display = 'none';
    });

    const activeCtrl = document.getElementById('rpt-controls-' + tab);
    if (activeCtrl) {
        if (tab === 'quarterly' || tab === 'halfyearly' || tab === 'custom') {
            activeCtrl.style.display = 'flex';
            activeCtrl.style.gap = '8px';
        } else {
            activeCtrl.style.display = 'block';
        }
    }

    const btnLabel = document.getElementById('printBtnLabel');
    if (btnLabel) {
        const labels = {
            monthly: 'মাসিক বিবরণী প্রিন্ট (A4)',
            quarterly: 'ত্রৈমাসিক বিবরণী প্রিন্ট (A4)',
            halfyearly: 'ছয় মাসিক বিবরণী প্রিন্ট (A4)',
            yearly: 'বার্ষিক বিবরণী প্রিন্ট (A4)',
            custom: 'কাস্টম বিবরণী প্রিন্ট (A4)'
        };
        btnLabel.textContent = labels[tab] || 'বিবরণী প্রিন্ট (A4)';
    }

    loadReports();
}

function getReportDateRange() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (currentReportTab === 'monthly') {
        const m = parseInt(document.getElementById('reportMonth')?.value || (today.getMonth() + 1));
        const y = parseInt(document.getElementById('reportYear')?.value || today.getFullYear());
        const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const MN = ['', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        return { startDate: startStr, endDate: endStr, periodLabel: `${MN[m]} ${englishToBanglaNum(y.toString())} খ্রি:` };
    }

    if (currentReportTab === 'quarterly') {
        const q = parseInt(document.getElementById('reportQuarter')?.value || 1);
        const y = parseInt(document.getElementById('reportYearQ')?.value || today.getFullYear());
        const qMap = { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] };
        const qNames = { 1: '১ম ত্রৈমাসিক (জানুয়ারি–মার্চ)', 2: '২য় ত্রৈমাসিক (এপ্রিল–জুন)', 3: '৩য় ত্রৈমাসিক (জুলাই–সেপ্টেম্বর)', 4: '৪র্থ ত্রৈমাসিক (অক্টোবর–ডিসেম্বর)' };
        const startM = qMap[q][0];
        const endM = qMap[q][1];
        const startStr = `${y}-${String(startM).padStart(2, '0')}-01`;
        const lastDay = new Date(y, endM, 0).getDate();
        const endStr = `${y}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { startDate: startStr, endDate: endStr, periodLabel: `${qNames[q]} — ${englishToBanglaNum(y.toString())} খ্রি:` };
    }

    if (currentReportTab === 'halfyearly') {
        const h = parseInt(document.getElementById('reportHalfYear')?.value || 1);
        const y = parseInt(document.getElementById('reportYearH')?.value || today.getFullYear());
        const startM = h === 1 ? 1 : 7;
        const endM = h === 1 ? 6 : 12;
        const hNames = { 1: '১ম ষাণ্মাসিক (জানুয়ারি–জুন)', 2: '২য় ষাণ্মাসিক (জুলাই–ডিসেম্বর)' };
        const startStr = `${y}-${String(startM).padStart(2, '0')}-01`;
        const lastDay = new Date(y, endM, 0).getDate();
        const endStr = `${y}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { startDate: startStr, endDate: endStr, periodLabel: `${hNames[h]} — ${englishToBanglaNum(y.toString())} খ্রি:` };
    }

    if (currentReportTab === 'yearly') {
        const y = parseInt(document.getElementById('reportYearY')?.value || today.getFullYear());
        return { startDate: `${y}-01-01`, endDate: `${y}-12-31`, periodLabel: `বার্ষিক বিবরণী — ${englishToBanglaNum(y.toString())} খ্রি:` };
    }

    if (currentReportTab === 'custom') {
        let s = document.getElementById('reportCustomStartDate')?.value;
        let e = document.getElementById('reportCustomEndDate')?.value;
        if (!s) s = `${today.getFullYear()}-01-01`;
        if (!e) e = todayStr;
        const sBN = englishToBanglaNum(s);
        const eBN = englishToBanglaNum(e);
        return { startDate: s, endDate: e, periodLabel: `তারিখ: ${sBN} হতে ${eBN}` };
    }

    return { startDate: `${today.getFullYear()}-01-01`, endDate: todayStr, periodLabel: 'সময়কালের বিবরণী' };
}

// Reports Loader
function loadReports() {
    const { startDate, endDate } = getReportDateRange();
    let totalInc = 0, totalExp = 0;
    let bankBal = parseFloat(state.settings.initial_bank_balance || 0);
    const breakdown = {};
    let totalSamajChanda = 0;

    state.transactions.forEach(tx => {
        const txDate = tx.date;
        const val = parseFloat(tx.amount || 0);
        const pm = (tx.payment_mode || tx.payment_method || '').toUpperCase();
        if (pm === 'BANK') bankBal += tx.transaction_type === 'INCOME' ? val : -val;

        const inPeriod = (txDate >= startDate && txDate <= endDate);
        if (!inPeriod) return;

        if (tx.transaction_type === 'INCOME') {
            totalInc += val;
            const isMemberChanda = (tx.member_id && state.members.some(m => m.id === tx.member_id)) || 
                                   tx.category === 'সদস্য চাঁদা' || 
                                   tx.category === 'মাসিক চাঁদা' || 
                                   tx.is_member_fee;
            if (isMemberChanda) {
                totalSamajChanda += val;
            } else {
                const key = tx.category || 'other';
                if (!breakdown[key]) breakdown[key] = { amount: 0, type: 'INCOME' };
                breakdown[key].amount += val;
            }
        } else if (tx.transaction_type === 'EXPENSE') {
            totalExp += val;
            const key = tx.category || 'other';
            if (!breakdown[key]) breakdown[key] = { amount: 0, type: 'EXPENSE' };
            breakdown[key].amount += val;
        }
    });

    if (totalSamajChanda > 0) {
        breakdown['সমাজ চাঁদা (সকল সদস্য)'] = { amount: totalSamajChanda, type: 'INCOME' };
    }

    const net = totalInc - totalExp;
    document.getElementById('reportTotalIncome').innerText = formatCurrency(totalInc);
    document.getElementById('reportTotalExpense').innerText = formatCurrency(totalExp);
    const bankEl = document.getElementById('reportBankBalance');
    if (bankEl) bankEl.innerText = formatCurrency(Math.max(0, bankBal));
    const netEl = document.getElementById('reportNetBalance');
    if (netEl) { 
        netEl.innerText = (net >= 0 ? '+' : '-') + 'টাকা ' + formatCurrency(Math.abs(net)); 
        netEl.style.color = net >= 0 ? '#4a148c' : '#b71c1c'; 
    }

    const incList = document.getElementById('categoryBreakdownIncomeList');
    const expList = document.getElementById('categoryBreakdownExpenseList');
    if (incList && expList) {
        incList.innerHTML = ''; expList.innerHTML = '';
        let hasInc = false, hasExp = false;
        Object.keys(breakdown).sort((a,b) => breakdown[b].amount - breakdown[a].amount).forEach(cat => {
            const data = breakdown[cat];
            const row = document.createElement('div');
            row.className = 'summary-item'; row.style.marginBottom = '6px';
            row.innerHTML = `<span style="font-size:11px;">${CATEGORIES_BN[cat] || cat}</span><span style="font-size:11px;font-weight:700;color:${data.type==='INCOME'?'#2e7d32':'var(--danger-color)'};">${data.type==='INCOME'?'+':'-'}৳ ${formatCurrency(data.amount)}</span>`;
            if (data.type === 'INCOME') { incList.appendChild(row); hasInc = true; }
            else { expList.appendChild(row); hasExp = true; }
        });
        if (!hasInc) incList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:10px;font-size:11px;">কোনো আয় নেই</div>';
        if (!hasExp) expList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:10px;font-size:11px;">কোনো ব্যয় নেই</div>';
    }
}

// Universal Professional Pad Header Generator for All Reports
function getPadHeaderHTML(reportTitle, periodLabel = '', refSuffix = '', customDate = '') {

    const mosqueName = state.settings.mosque_name || state.settings.mosqueName || (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS.mosque_name : 'পূর্ব মোহাজের পাড়া জামে মসজিদ');
    let rawAddress = state.settings.mosque_address || state.settings.address || (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS.mosque_address : 'বরইতলী, চকরিয়া, কক্সবাজার।');
    
    let estYear = state.settings.established_year || state.settings.est_year || '';
    let memoPrefix = state.settings.memo_prefix || 'পুমোপাজাম/২০২৬/';
    const logoSrc = state.settings.logo_base64 || state.settings.logoData || '';
    
    let formattedAddress = rawAddress;
    if (rawAddress.includes('স্থাপিত:')) {
        const parts = rawAddress.split('|');
        if (parts.length > 0 && !estYear) {
            estYear = parts[0].replace('স্থাপিত:', '').trim();
        }
        if (parts.length > 1) {
            formattedAddress = parts.slice(1).join('|').replace('ঠিকানা:', '').trim();
        }
    }
    if (!estYear) estYear = '১৯৯৬ খ্রি.';

    const printDate = customDate || new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const fullRefNo = refSuffix ? (refSuffix.startsWith('সূত্র:') ? refSuffix : `সূত্র: ${memoPrefix}${refSuffix}`) : `সূত্র: ${memoPrefix}নথী-${englishToBanglaNum(new Date().getFullYear().toString())}`;

    return `
    <div class="official-pad-header">
        <div class="pad-top-row">
            <div class="pad-logo-wrapper">
                ${logoSrc ? `<img src="${logoSrc}" alt="Logo">` : `<div class="pad-logo-fallback"><i class="fa-solid fa-mosque"></i></div>`}
            </div>
            <div class="pad-title-wrapper">
                <h1 class="pad-institution-name">${mosqueName}</h1>
                <div class="pad-subtitle-info">
                    ${estYear ? `<span><strong>স্থাপিত:</strong> ${estYear}</span>` : ''}
                    ${estYear && formattedAddress ? `<span class="pad-dot-sep">|</span>` : ''}
                    ${formattedAddress ? `<span><strong>ঠিকানা:</strong> ${formattedAddress}</span>` : ''}
                </div>
            </div>
        </div>
        <div class="pad-subbar-row">
            <div class="pad-memo-ref">${fullRefNo}</div>
            <div class="pad-publish-date"><strong>প্রকাশ তারিখ:</strong> ${printDate}</div>
        </div>
        <div class="pad-divider-line"></div>
        ${reportTitle ? `
        <div class="pad-report-title-wrapper">
            <h2 class="pad-report-main-title">${reportTitle}</h2>
            ${periodLabel ? `<div class="pad-report-period">${periodLabel}</div>` : ''}
        </div>` : ''}
    </div>
    `;
}

function getPadCSS() {
    return `
    .official-pad-header { width: 100%; margin-bottom: 12px; font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', Arial, sans-serif; }
    .pad-top-row { display: flex; align-items: center; justify-content: center; position: relative; padding-bottom: 6px; min-height: 75px; }
    .pad-logo-wrapper { position: absolute; left: 0; top: 0; width: 72px; height: 72px; border-radius: 50%; background: #ffffff; border: 1.5px solid #0f5132; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 3px; }
    .pad-logo-wrapper img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
    .pad-logo-fallback { font-size: 32px; color: #0f5132; }
    .pad-title-wrapper { text-align: center; flex: 1; padding: 0 75px; }
    .pad-institution-name { font-size: 23px; font-weight: 800; color: #000; margin-bottom: 3px; letter-spacing: 0.3px; line-height: 1.25; }
    .pad-subtitle-info { font-size: 12px; color: #333; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .pad-dot-sep { color: #0f5132; font-weight: 800; }
    .pad-subbar-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #111; margin-top: 6px; padding: 2px 2px; font-weight: 600; }
    .pad-memo-ref { text-align: left; }
    .pad-publish-date { text-align: right; }
    .pad-divider-line { border-bottom: 3px double #000; margin-top: 4px; margin-bottom: 12px; }
    .pad-report-title-wrapper { text-align: center; margin-bottom: 15px; }
    .pad-report-main-title { display: inline-block; font-size: 16px; font-weight: 800; color: #000; background: #f4faf6; border: 1.5px solid #0f5132; padding: 3px 20px; border-radius: 20px; letter-spacing: 0.3px; }
    .pad-report-period { font-size: 13px; font-weight: 700; color: #111; margin-top: 4px; }
    `;
}

    

function generateAdvancedPrintReport() {
    const { startDate, endDate, periodLabel } = getReportDateRange();

    let totalInc = 0, totalExp = 0, prevInc = 0, prevExp = 0;
    let bankBal = parseFloat(state.settings.initial_bank_balance || 0);
    let cashBal = parseFloat(state.settings.initial_cash_balance || 0);
    let totalSamajChanda = 0;
    const rawIncList = [];
    const expList = [];

    state.transactions.forEach(tx => {
        const txDate = tx.date;
        const val = parseFloat(tx.amount || 0);
        const pm = (tx.payment_mode || tx.payment_method || '').toUpperCase();
        
        const inPeriod = (txDate >= startDate && txDate <= endDate);
        const before = (txDate < startDate);

        if (pm === 'BANK') bankBal += tx.transaction_type === 'INCOME' ? val : -val;
        else cashBal += tx.transaction_type === 'INCOME' ? val : -val;

        if (before) { 
            if (tx.transaction_type === 'INCOME') prevInc += val; 
            else if (tx.transaction_type === 'EXPENSE') prevExp += val; 
        }

        if (!inPeriod) return;

        if (tx.transaction_type === 'INCOME') { 
            totalInc += val; 
            const isMemberChanda = (tx.member_id && state.members.some(m => m.id === tx.member_id)) || 
                                   tx.category === 'সদস্য চাঁদা' || 
                                   tx.category === 'মাসিক চাঁদা' || 
                                   tx.is_member_fee;

            if (isMemberChanda) {
                totalSamajChanda += val;
            } else {
                const desc = tx.description || tx.donor_name || CATEGORIES_BN[tx.category] || tx.category || 'অন্যান্য আয়';
                const method = pm === 'BANK' ? 'ব্যাংক' : 'নগদ';
                rawIncList.push({ date: tx.date, description: desc, amount: val, method }); 
            }
        } else if (tx.transaction_type === 'EXPENSE') { 
            totalExp += val; 
            const desc = tx.description || CATEGORIES_BN[tx.category] || tx.category || 'অন্যান্য ব্যয়';
            const method = pm === 'BANK' ? 'ব্যাংক' : 'নগদ';
            expList.push({ date: tx.date, description: desc, amount: val, method }); 
        }
    });

    const incList = [];
    if (totalSamajChanda > 0) {
        incList.push({
            date: startDate,
            description: 'সমাজ চাঁদা (সকল সদস্যের একত্রিত আদায়)',
            amount: totalSamajChanda,
            method: 'নগদ/ব্যাংক'
        });
    }

    rawIncList.sort((a, b) => new Date(a.date) - new Date(b.date));
    incList.push(...rawIncList);

    expList.sort((a, b) => new Date(a.date) - new Date(b.date));

    const net = totalInc - totalExp;
    const prevBal = parseFloat(state.settings.initial_bank_balance || 0) + parseFloat(state.settings.initial_cash_balance || 0) + prevInc - prevExp;
    const closingBal = prevBal + net;
    const maxRows = Math.max(incList.length, expList.length);

    let tRows = '';
    for (let i = 0; i < maxRows; i++) {
        const inc = incList[i], exp = expList[i];
        tRows += `<tr>
            <td>${inc ? formatShortDateBN(inc.date) : ''}</td>
            <td style="text-align:left; font-weight: ${inc && inc.description.includes('সমাজ চাঁদা') ? 'bold' : 'normal'};">${inc ? inc.description : ''}</td>
            <td style="text-align:center;">${inc ? inc.method : ''}</td>
            <td style="text-align:right; font-weight: ${inc && inc.description.includes('সমাজ চাঁদা') ? 'bold' : 'normal'};">${inc ? '৳ '+englishToBanglaNum(inc.amount.toFixed(2)) : ''}</td>
            <td style="background:#ccc;width:3px;padding:0;border-top:1px solid #555;border-bottom:1px solid #555;border-left:none;border-right:none;"></td>
            <td>${exp ? formatShortDateBN(exp.date) : ''}</td>
            <td style="text-align:left;">${exp ? exp.description : ''}</td>
            <td style="text-align:center;">${exp ? exp.method : ''}</td>
            <td style="text-align:right;">${exp ? '৳ '+englishToBanglaNum(exp.amount.toFixed(2)) : ''}</td>
        </tr>`;
    }
    if (!maxRows) tRows = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">এই সময়কালে কোনো আর্থিক লেনদেন সম্পন্ন হয়নি।</td></tr>';

const mosqueN = state.settings.mosque_name || state.settings.mosqueName || DEFAULT_SETTINGS.mosque_name || 'মসজিদের নাম';

    const pw = window.open('', '_blank', 'width=960,height=720');
    if (!pw) { alert('পপ-আপ ব্লক হয়েছে। অনুগ্রহ করে ব্রাউজারে পপ-আপ অনুমতি দিন।'); return; }

    pw.document.write(`<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8">
<title>${mosqueN} - ${periodLabel}</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Hind Siliguri','Noto Sans Bengali','SolaimanLipi',Arial,sans-serif;font-size:12px;color:#000;background:#fff;}
@page{size:A4;margin:12mm 12mm 15mm 12mm;}
${getPadCSS()}
.sstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}
.sb{border:1px solid #ccc;border-radius:6px;padding:8px 6px;text-align:center;}
.sb .sl{font-size:10px;color:#666;margin-bottom:3px;}
.sb .sv{font-size:13px;font-weight:800;}
.sb.inc{border-color:#2e7d32;background:#f1f8f1;}
.sb.exp{border-color:#b71c1c;background:#fff5f5;}
.sb.bnk{border-color:#1565c0;background:#f0f6ff;}
.sb.net{border-color:#6a1b9a;background:#faf0ff;}
.ezarow{background:#fffde7;border:1px dashed #f9a825;border-radius:6px;padding:7px 12px;margin-bottom:12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;}
table{width:100%;border-collapse:collapse;margin-bottom:14px;}
th,td{border:1px solid #555;padding:5px 4px;vertical-align:middle;}
thead tr:first-child{background:#fff;}
thead tr:last-child th{background:#f5f5f5;font-size:11px;}
.inc-head{background:#c8e6c9!important;}
.exp-head{background:#ffcdd2!important;}
tbody tr:nth-child(even){background:#f9f9f9;}
.tfrow td{background:#e0e0e0;font-weight:800;font-size:12px;}
.bnksec{border:1px solid #1565c0;border-radius:6px;background:#f0f6ff;padding:10px 14px;margin-bottom:14px;}
.bnksec h4{font-size:12px;font-weight:800;color:#1565c0;margin-bottom:6px;border-bottom:1px solid #90caf9;padding-bottom:4px;}
.br{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;}
.clsbox{background:#f3e5f5;border:2px solid #6a1b9a;border-radius:8px;padding:10px 14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;}
.sigs{display:flex;justify-content:space-between;margin-top:35px;}
.sig{text-align:center;width:150px;border-top:1px solid #000;padding-top:5px;font-size:11px;font-weight:700;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
${getPadHeaderHTML('আয়-ব্যয় বিবরণী', periodLabel, 'আয়-ব্যয়/' + englishToBanglaNum(startDate.substring(0,4)))}
<div class="sstrip">
<div class="sb inc"><div class="sl">মোট আয়</div><div class="sv">৳ ${englishToBanglaNum(totalInc.toFixed(2))}</div></div>
<div class="sb exp"><div class="sl">মোট ব্যয়</div><div class="sv">৳ ${englishToBanglaNum(totalExp.toFixed(2))}</div></div>
<div class="sb bnk"><div class="sl">ব্যাংক জমা</div><div class="sv">৳ ${englishToBanglaNum(Math.max(0,bankBal).toFixed(2))}</div></div>
<div class="sb net"><div class="sl">নিট উদ্বৃত্ত</div><div class="sv" style="color:${net>=0?'#2e7d32':'#b71c1c'};">${net>=0?'+':'-'}৳ ${englishToBanglaNum(Math.abs(net).toFixed(2))}</div></div>
</div>
<div class="ezarow"><span>পূর্ববর্তী জের (ঈজা):</span><span>৳ ${englishToBanglaNum(prevBal.toFixed(2))}</span></div>
<table>
<thead>
<tr><th colspan="4" class="inc-head" style="font-size:12px;font-weight:800;text-align:center;border-bottom:2px solid #2e7d32;">আয় (Income)</th><th style="background:#ccc;width:3px;padding:0;"></th><th colspan="4" class="exp-head" style="font-size:12px;font-weight:800;text-align:center;border-bottom:2px solid #c62828;">ব্যয় (Expense)</th></tr>
<tr><th style="width:9%;text-align:center;">তারিখ</th><th style="width:21%;text-align:left;">বিবরণ</th><th style="width:7%;text-align:center;">মাধ্যম</th><th style="width:10%;text-align:right;">পরিমাণ</th><th style="width:2%;background:#ccc;padding:0;"></th><th style="width:9%;text-align:center;">তারিখ</th><th style="width:21%;text-align:left;">বিবরণ</th><th style="width:7%;text-align:center;">মাধ্যম</th><th style="width:10%;text-align:right;">পরিমাণ</th></tr>
</thead>
<tbody>${tRows}</tbody>
<tfoot><tr class="tfrow"><td colspan="3" style="text-align:right;border:1px solid #555;">সর্বমোট আয়</td><td style="text-align:right;border:1px solid #555;color:#1b5e20;">৳ ${englishToBanglaNum(totalInc.toFixed(2))}</td><td style="background:#bbb;padding:0;"></td><td colspan="3" style="text-align:right;border:1px solid #555;">সর্বমোট ব্যয়</td><td style="text-align:right;border:1px solid #555;color:#b71c1c;">৳ ${englishToBanglaNum(totalExp.toFixed(2))}</td></tr></tfoot>
</table>
<div class="bnksec">
<h4>&#127974; ব্যাংক ও নগদ হিসাব সারসংক্ষেপ</h4>
<div class="br"><span>প্রাথমিক ব্যাংক ব্যালেন্স:</span><span>৳ ${englishToBanglaNum(parseFloat(state.settings.initial_bank_balance||0).toFixed(2))}</span></div>
<div class="br"><span>বর্তমান ব্যাংক জমা:</span><span style="font-weight:700;color:#1565c0;">৳ ${englishToBanglaNum(Math.max(0,bankBal).toFixed(2))}</span></div>
<div class="br"><span>বর্তমান নগদ জমা:</span><span style="font-weight:700;color:#e65100;">৳ ${englishToBanglaNum(Math.max(0,cashBal).toFixed(2))}</span></div>
</div>
<div class="clsbox"><span style="font-size:12px;font-weight:700;color:#4a148c;">সমাপ্তি উদ্বৃত্ত (Closing Balance):</span><span style="font-size:16px;font-weight:900;color:${closingBal>=0?'#4a148c':'#b71c1c'};">${closingBal>=0?'':'-'}৳ ${englishToBanglaNum(Math.abs(closingBal).toFixed(2))}</span></div>
<div class="sigs"><div class="sig">কোষাধ্যক্ষ</div><div class="sig">সাধারণ সম্পাদক</div><div class="sig">সভাপতি</div></div>
</body></html>`);
    pw.document.close(); pw.focus(); setTimeout(() => pw.print(), 900);
}

// ================== COMMITTEE & WAIVER ADDITIONS ==================

// Render Managing Committee list in Admin Settings Editor
function renderAdminCommitteeEditor() {
    const listContainer = document.getElementById('adminCommitteeList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    state.committee.forEach(m => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '8px';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = '8px';
        item.style.background = 'var(--bg-color)';
        item.style.fontSize = '12px';

        const imgTag = m.photo ? `<img src="${m.photo}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 8px;">` : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-light)44; color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 14px; margin-right: 8px;"><i class="fa-solid fa-user-tie"></i></div>`;

        item.innerHTML = `
            <div style="display: flex; align-items: center;">
                ${imgTag}
                <div>
                    <strong>${m.name}</strong> <span style="font-size: 10px; color: var(--primary-color); font-weight: bold; background: var(--primary-light)33; padding: 1px 6px; border-radius: 12px; margin-left: 5px;">${m.designation}</span>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                        <i class="fa-solid fa-phone" style="font-size: 9px;"></i> ${englishToBanglaNum(m.phone)}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 6px;">
                <button onclick="editCommitteeMember('${m.id}')" style="border: none; background: transparent; color: var(--primary-color); cursor: pointer; padding: 4px;" title="সম্পাদনা করুন">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteCommitteeMember('${m.id}')" style="border: none; background: transparent; color: var(--danger-color); cursor: pointer; padding: 4px;" title="মুছে ফেলুন">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// Add/Edit Committee Member & Sync with Mosque Member List
function handleAddCommitteeSubmit(e) {
    try {
        e.preventDefault();
        
        if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'secretary' && state.currentUser.role !== 'cashier')) {
            alert("শুধুমাত্র এডমিন, সম্পাদক ও ক্যাশিয়ার পরিচালনা কমিটির তথ্য আপডেট করতে পারবেন!");
            return;
        }

        // Safety nets: ensure arrays exist
        if (!Array.isArray(state.committee)) state.committee = [];
        if (!Array.isArray(state.members)) state.members = [];
        if (!Array.isArray(state.subscriptions)) state.subscriptions = [];

        const editId = document.getElementById('editCommId').value;
        const name = document.getElementById('commName').value.trim();
        const designation = document.getElementById('commDesignation').value.trim();
        const category = document.getElementById('commCategory') ? document.getElementById('commCategory').value : 'Executive';
        const phone = document.getElementById('commPhone').value.trim();

        if (editId) {
            // Editing Mode
            const commMember = state.committee.find(m => m && m.id && m.id.toString() === editId.toString());
            if (commMember) {
                // Find linked general member by linked member_id or phone matching (safely toString)
                let genMember = state.members.find(m => 
                    m && ((commMember.member_id && m.id && m.id.toString() === commMember.member_id.toString()) || 
                    (m.phone && m.phone === commMember.phone))
                );
                
                commMember.name = name;
                commMember.designation = designation;
                commMember.category = category;
                commMember.phone = phone;
                if (uploadedCommPhotoBase64) commMember.photo = uploadedCommPhotoBase64;
                
                if (genMember) {
                    genMember.name = name;
                    genMember.phone = phone;
                }
                alert("পরিচালনা কমিটির সদস্যের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।");
            }
        } else {
            // Adding Mode
            const phoneExists = state.members.some(m => m && m.phone && m.phone === phone);
            let linkedMemberId = '';

            if (!phoneExists) {
                // Auto add to general members list with guaranteed unique ID
                linkedMemberId = 'member-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                const newGenMember = {
                    id: linkedMemberId,
                    name: name,
                    phone: phone,
                    address: category === 'Sardar' ? 'সমাজ সর্দার' : 'পরিচালনা কমিটি',
                    member_type: 'General',
                    monthly_fee: 150,
                    status: 'Active',
                    join_date: new Date().toISOString().split('T')[0],
                    opening_arrears: 0
                };
                state.members.push(newGenMember);

                // Push initial subscription for the current month
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();
                state.subscriptions.push({
                    id: `sub-${linkedMemberId}-${currentYear}-${currentMonth}`,
                    member_id: linkedMemberId,
                    year: currentYear,
                    month: currentMonth,
                    amount_paid: 0,
                    due_amount: 150,
                    status: 'Unpaid',
                    last_payment_date: ''
                });
            } else {
                // If already exists in general members, link them and update name
                const existingGen = state.members.find(m => m && m.phone && m.phone === phone);
                linkedMemberId = existingGen.id;
                existingGen.name = name;
            }

            const newCommMember = {
                id: Date.now().toString(),
                name: name,
                designation: designation,
                category: category,
                phone: phone,
                photo: uploadedCommPhotoBase64,
                member_id: linkedMemberId
            };
            state.committee.push(newCommMember);
            alert("কমিটি/সর্দারের তথ্য সফলভাবে যোগ করা হয়েছে এবং সাধারণ সদস্য তালিকায় সিঙ্ক করা হয়েছে।");
        }

        saveState();
        cancelCommitteeEdit();
        renderAdminCommitteeEditor();
        renderCommitteeDashboard();
        renderCommitteeView();
        refreshAppUI(); // Re-render general members list and statistics immediately!
    } catch (err) {
        console.error("Error adding committee member: ", err);
        alert("কমিটির তথ্য সেভ করার সময় একটি ত্রুটি হয়েছে। ದয়া করে আবার চেষ্টা করুন।\nError Details: " + err.message);
    }
}

// Edit Committee Member Form Loader
function editCommitteeMember(id) {
    const m = state.committee.find(member => member.id.toString() === id.toString());
    if (!m) return;

    document.getElementById('editCommId').value = m.id;
    document.getElementById('commName').value = m.name;
    document.getElementById('commDesignation').value = m.designation;
    if (document.getElementById('commCategory')) {
        document.getElementById('commCategory').value = m.category || 'Executive';
    }
    document.getElementById('commPhone').value = m.phone;

    // Show preview of existing photo if any
    const previewImg = document.getElementById('commPreviewImg');
    const previewContainer = document.getElementById('commPhotoPreview');
    if (m.photo) {
        previewImg.src = m.photo;
        previewContainer.style.display = 'block';
        uploadedCommPhotoBase64 = m.photo;
    } else {
        previewImg.src = '';
        previewContainer.style.display = 'none';
        uploadedCommPhotoBase64 = '';
    }

    // Change submit button text and show cancel button
    document.getElementById('commSubmitBtn').innerText = 'হালনাগাদ করুন';
    document.getElementById('commCancelBtn').style.display = 'block';
}

// Cancel Committee Edit mode
function cancelCommitteeEdit() {
    document.getElementById('editCommId').value = '';
    document.getElementById('addCommitteeForm').reset();
    uploadedCommPhotoBase64 = '';
    document.getElementById('commPhotoPreview').style.display = 'none';

    document.getElementById('commSubmitBtn').innerText = 'কমিটিতে যোগ করুন';
    document.getElementById('commCancelBtn').style.display = 'none';
}

// Delete Committee Member (Admin & Secretary Only)
function deleteCommitteeMember(id) {
    const role = state.currentUser.role;
    if (role !== 'admin' && role !== 'secretary' && role !== 'cashier') {
        alert("শুধুমাত্র এডমিন, সম্পাদক ও ক্যাশিয়ার পরিচালনা কমিটি থেকে বাদ দিতে পারবেন!");
        return;
    }
    if (!confirm("আপনি কি নিশ্চিতভাবে এই সদস্যকে পরিচালনা কমিটি থেকে বাদ দিতে চান?")) return;
    
    state.committee = state.committee.filter(m => m.id.toString() !== id.toString());
    saveState();
    
    renderAdminCommitteeEditor();
    renderCommitteeDashboard();
    renderCommitteeView();
}

// Filter & Render Public Committee View
let currentCommFilter = 'executive';

function filterCommitteeCategory(cat) {
    currentCommFilter = cat;
    document.querySelectorAll('.comm-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-main)';
    });
    const activeBtn = document.getElementById(`commTab${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = 'var(--primary-color)';
        activeBtn.style.color = 'white';
    }
    renderCommitteeView();
}

function scrollToCommitteeAdmin() {
    const adminSec = document.getElementById('adminCommitteeSection');
    if (adminSec) {
        adminSec.style.display = 'block';
        adminSec.scrollIntoView({ behavior: 'smooth' });
    }
}

function renderCommitteeView() {
    const grid = document.getElementById('committeeViewGrid');
    const adminBtnContainer = document.getElementById('committeeAdminAddBtnContainer');
    if (!grid) return;

    if (state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.role === 'secretary')) {
        if (adminBtnContainer) adminBtnContainer.style.display = 'block';
    } else {
        if (adminBtnContainer) adminBtnContainer.style.display = 'none';
    }

    grid.innerHTML = '';

    if (!state.committee || state.committee.length === 0) {
        grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 30px 15px; background: white; border-radius: 14px; border: 1.5px dashed var(--border-color);">
            <i class="fa-solid fa-users-slash" style="font-size: 32px; color: var(--text-muted); margin-bottom: 8px;"></i>
            <p style="font-size: 13px; font-weight: 600;">পরিচালনা কমিটি ও সমাজ সর্দারদের কোনো তথ্য পাওয়া যায়নি।</p>
            <p style="font-size: 11px; color: #888; margin-top: 4px;">এডমিন প্যানেল থেকে তথ্য সংযোজন করুন।</p>
        </div>`;
        return;
    }

    let list = [...state.committee];
    if (currentCommFilter === 'executive') {
        list = list.filter(m => !m.category || m.category === 'Executive');
    } else if (currentCommFilter === 'sardar') {
        list = list.filter(m => m.category === 'Sardar' || (m.designation && m.designation.includes('সর্দার')));
    }

    if (list.length === 0) {
        grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 25px 15px; background: white; border-radius: 14px; border: 1px dashed var(--border-color);">
            <p style="font-size: 12px;">এই ক্যাটাগরিতে কোনো সদস্য পাওয়া যায়নি।</p>
        </div>`;
        return;
    }

    list.forEach(m => {
        const card = document.createElement('div');
        card.className = 'committee-member-card';
        card.style.cssText = `
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 14px 10px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            position: relative;
            transition: all 0.2s ease;
        `;

        const photoHTML = m.photo 
            ? `<img src="${m.photo}" alt="${m.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
            : `<div style="font-size: 32px; color: var(--primary-color);"><i class="fa-solid fa-user-tie"></i></div>`;

        const categoryTag = m.category === 'Sardar' || (m.designation && m.designation.includes('সর্দার'))
            ? '<span style="font-size: 9px; background: #fff8e1; color: #b78103; border: 1px solid #ffe082; padding: 1px 6px; border-radius: 10px; margin-top: 2px; font-weight: 700;">সমাজ সর্দার</span>'
            : '<span style="font-size: 9px; background: #e8f5e9; color: #1b5e20; border: 1px solid #c8e6c9; padding: 1px 6px; border-radius: 10px; margin-top: 2px; font-weight: 700;">পরিচালনা কমিটি</span>';

        card.innerHTML = `
            <div style="width: 72px; height: 72px; border-radius: 50%; background: #ffffff; border: 2.5px solid var(--primary-color); padding: 3px; box-shadow: 0 3px 8px rgba(15,81,50,0.18); margin-bottom: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${photoHTML}
            </div>

            <div style="font-size: 13px; font-weight: 800; color: #111111; margin-bottom: 3px; line-height: 1.3;">
                ${m.name}
            </div>

            <div style="font-size: 11px; font-weight: 700; color: var(--primary-color); margin-bottom: 2px;">
                ${m.designation || 'কমিটি সদস্য'}
            </div>

            <div style="margin-bottom: 8px;">
                ${categoryTag}
            </div>

            <div style="font-size: 11px; font-weight: 600; color: #444; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <i class="fa-solid fa-phone" style="font-size: 10px; color: var(--secondary-color);"></i>
                <span>${m.phone ? englishToBanglaNum(m.phone) : '—'}</span>
            </div>

            ${m.phone ? `
            <a href="tel:${m.phone}" class="btn" style="width: 100%; height: 32px; font-size: 11px; padding: 0; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; background: var(--primary-color); color: white; border: none; font-weight: 700; text-decoration: none; box-shadow: 0 2px 5px rgba(15,81,50,0.2);">
                <i class="fa-solid fa-phone-volume"></i> কল করুন
            </a>` : ''}
        `;

        grid.appendChild(card);
    });
}

// Global slider interval variable
let committeeSliderInterval = null;

// Render Managing Committee Carousel on Dashboard
function renderCommitteeDashboard() {
    const container = document.getElementById('committeeContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!state.committee || state.committee.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); width: 100%; padding: 15px; font-size: 12px;">পরিচালনা কমিটির কোনো তথ্য নেই। এডমিন প্যানেল থেকে যোগ করুন।</div>';
        return;
    }

    state.committee.forEach((m, idx) => {
        const item = document.createElement('div');
        item.style.flex = '0 0 135px';
        item.style.background = 'white';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = '14px';
        item.style.padding = '12px 10px';
        item.style.textAlign = 'center';
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'center';
        item.style.boxShadow = 'var(--shadow-sm)';
        item.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.4s ease, box-shadow 0.4s ease';
        
        const avatar = m.photo ? `<img src="${m.photo}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-light); margin-bottom: 6px;">` : `<div style="width: 50px; height: 50px; border-radius: 50%; background: var(--primary-light)44; color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid var(--primary-light); margin-bottom: 6px;"><i class="fa-solid fa-user-tie"></i></div>`;

        item.innerHTML = `
            ${avatar}
            <div style="font-size: 11px; font-weight: bold; color: var(--text-main); margin-bottom: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${m.name}">${m.name}</div>
            <div style="font-size: 9px; font-weight: 700; color: #ffffff; background: var(--primary-color); padding: 2px 8px; border-radius: 20px; margin-bottom: 8px; display: inline-block;">${m.designation}</div>
            <a href="tel:${m.phone}" style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 11px; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1.0)'" title="কল করুন">
                <i class="fa-solid fa-phone"></i>
            </a>
        `;
        container.appendChild(item);
    });

    let currentIndex = 0;
    
    // Professional center-alignment and styling highlight helper
    const highlightCard = (index) => {
        const cards = container.children;
        if (cards.length === 0 || index >= cards.length) return;
        
        const targetCard = cards[index];
        
        // Reset all cards to normal state
        Array.from(cards).forEach(c => {
            c.style.transform = 'scale(1.0)';
            c.style.borderColor = 'var(--border-color)';
            c.style.boxShadow = 'var(--shadow-sm)';
        });
        
        // Highlight active sliding card
        targetCard.style.transform = 'scale(1.05)';
        targetCard.style.borderColor = 'var(--primary-color)';
        targetCard.style.boxShadow = 'var(--shadow-md)';

        // Math formula for absolute center alignment inside scroll viewport
        const containerCenter = container.clientWidth / 2;
        const cardCenter = targetCard.clientWidth / 2;
        const scrollPosition = targetCard.offsetLeft - container.offsetLeft - containerCenter + cardCenter;
        
        container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    };

    // Auto sliding interval setup
    if (committeeSliderInterval) clearInterval(committeeSliderInterval);
    
    const slideDelay = 3500; // 3.5 seconds

    // Initial highlight delay to allow DOM render calculations
    setTimeout(() => {
        highlightCard(0);
    }, 200);

    committeeSliderInterval = setInterval(() => {
        const cards = container.children;
        if (cards.length <= 1) return;

        currentIndex++;
        if (currentIndex >= cards.length) {
            currentIndex = 0; // Loop back from end to start (শেষ থেকে শুরুতে)
        }

        highlightCard(currentIndex);
    }, slideDelay);
}

// Handle Waiver Form Submission (President Only)
function handleWaiverSubmit(e) {
    e.preventDefault();
    if (state.currentUser.role !== 'president') return;
    
    const memberId = document.getElementById('wpMemberId').value;
    const waiverAmount = parseFloat(document.getElementById('wpAmount').value);
    const reason = document.getElementById('wpReason').value.trim();
    const date = new Date().toISOString().split('T')[0];
    
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;
    
    if (isNaN(waiverAmount) || waiverAmount <= 0) {
        alert("সদস্যের চাঁদা মওকুফের সঠিক পরিমাণ দিন!");
        return;
    }
    
    let remainingWaiver = waiverAmount;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthLimit = now.getMonth() + 1;
    
    const joinParts = (member.join_date || '2025-01-01').split('-');
    const joinYear = parseInt(joinParts[0]) || 2025;
    const joinMonth = parseInt(joinParts[1]) || 1;
    
    // Allocate waiver amount as subscription fee reductions chronologically
    for (let year = joinYear; year <= currentYear && remainingWaiver > 0; year++) {
        const startM = year === joinYear ? joinMonth : 1;
        const endM = year === currentYear ? currentMonthLimit : 12;
        
        for (let m = startM; m <= endM && remainingWaiver > 0; m++) {
            let sub = state.subscriptions.find(s => s.member_id === memberId && s.year === year && s.month === m);
            if (!sub) {
                sub = {
                    id: `sub-${memberId}-${year}-${m}`,
                    member_id: memberId,
                    year: year,
                    month: m,
                    amount_paid: 0,
                    due_amount: member.monthly_fee,
                    status: 'Unpaid',
                    last_payment_date: ''
                };
                state.subscriptions.push(sub);
            }
            
            const currentDue = member.monthly_fee - parseFloat(sub.amount_paid);
            if (currentDue > 0) {
                const waiveForThisMonth = Math.min(remainingWaiver, currentDue);
                
                sub.amount_paid = parseFloat(sub.amount_paid) + waiveForThisMonth;
                sub.due_amount = member.monthly_fee - sub.amount_paid;
                sub.status = sub.due_amount <= 0 ? 'Paid' : 'Partial';
                sub.last_payment_date = date;
                sub.receipt_no = 'মওকুফ'; // Tagged as waived
                
                remainingWaiver -= waiveForThisMonth;
            }
        }
    }
    
    // If there is excess waiver, add as advance balance
    if (remainingWaiver > 0) {
        member.advance_balance = parseFloat(member.advance_balance || 0) + remainingWaiver;
        processAdvanceDeductions();
    }
    
    saveState();
    closeModal('member-details-modal');
    refreshAppUI();
    
    alert(`৳ ${englishToBanglaNum(waiverAmount.toString())} চাঁদা মওকুফ সফলভাবে সম্পন্ন হয়েছে। মওকুফের কারণ: ${reason}`);
}

// Cleanup soft-deleted members after 60 days
function cleanupPermanentlyDeletedMembers() {
    const now = new Date();
    const limitMs = 60 * 24 * 60 * 60 * 1000; // 60 days
    let stateChanged = false;

    if (!state.members) return;

    state.members = state.members.filter(member => {
        if (member.status === 'Deleted' && member.deleted_at) {
            const deletedDate = new Date(member.deleted_at);
            const diffMs = now - deletedDate;
            if (diffMs > limitMs) {
                // Permanently remove subscriptions
                state.subscriptions = state.subscriptions.filter(s => s.member_id !== member.id);
                stateChanged = true;
                return false;
            }
        }
        return true;
    });

    if (stateChanged) {
        saveState();
    }
}

// Toggle Member Suspension (General Secretary or Admin Only)
function toggleMemberSuspension(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    const role = state.currentUser.role;
    if (role !== 'secretary' && role !== 'admin') {
        alert("শুধুমাত্র সাধারণ সম্পাদক এবং এডমিন সদস্যপদ স্থগিত করতে পারবেন!");
        return;
    }

    if (member.status === 'Suspended') {
        member.status = 'Active';
        alert(`সদস্য ${member.name}-এর সদস্যপদ সফলভাবে সক্রিয় করা হয়েছে।`);
    } else {
        member.status = 'Suspended';
        alert(`সদস্য ${member.name}-এর সদস্যপদ সাময়িকভাবে স্থগিত করা হয়েছে।`);
    }

    saveState();
    closeModal('member-details-modal');
    refreshAppUI();
}

// Request Member Deletion (Non-Admin roles request deletion)
function requestMemberDeletion(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (member.delete_requested) {
        alert("এই সদস্যকে ডিলিট করার আবেদন অলরেডি পেন্ডিং রয়েছে!");
        return;
    }

    member.delete_requested = true;
    saveState();
    closeModal('member-details-modal');
    refreshAppUI();
    
    alert(`সদস্য ${member.name}-কে ডিলিট করার আবেদন এডমিন প্যানেলে পাঠানো হয়েছে। এডমিন অনুমোদন করলে এটি রিসাইকেল বিনে চলে যাবে।`);
}

// Approve Member Deletion (Admin Only - Soft Delete for 60 Days)
function approveDeletionRequest(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (state.currentUser.role !== 'admin') {
        alert("শুধুমাত্র এডমিন ডিলিট আবেদন অনুমোদন করতে পারবেন!");
        return;
    }

    member.status = 'Deleted';
    member.delete_requested = false;
    member.deleted_at = new Date().toISOString(); // Soft delete timestamp
    
    saveState();
    closeModal('member-details-modal');
    refreshAppUI();
    
    alert(`সদস্য ${member.name}-এর ডিলিট আবেদন অনুমোদিত হয়েছে। সদস্যপদ বাতিল করে ৬০ দিনের জন্য রিসাইকেল বিনে পাঠানো হয়েছে।`);
}

// Reject Member Deletion Request (Admin Only)
function rejectDeletionRequest(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (state.currentUser.role !== 'admin') {
        alert("শুধুমাত্র এডমিন ডিলিট আবেদন বাতিল করতে পারবেন!");
        return;
    }

    member.delete_requested = false;
    saveState();
    closeModal('member-details-modal');
    refreshAppUI();
    
    alert(`সদস্য ${member.name}-এর ডিলিট আবেদন বাতিল করা হয়েছে।`);
}

// Render Global DB Recycle Bin (30-day snapshots)
function renderGlobalRecycleBin() {
    const container = document.getElementById('globalRecycleBinList');
    if (!container) return;
    container.innerHTML = '';

    if (!state.global_recycle_bin || state.global_recycle_bin.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 15px; font-size: 12px;">কোনো মুছে ফেলা ডাটাবেস নেই।</div>';
        return;
    }

    const now = new Date();

    // Sort descending by deletedAt
    const sortedBin = [...state.global_recycle_bin].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    sortedBin.forEach((snapshot, sortedIndex) => {
        // Find original index
        const originalIndex = state.global_recycle_bin.indexOf(snapshot);
        
        const deletedDate = new Date(snapshot.deletedAt);
        const diffMs = now - deletedDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, 30 - diffDays);

        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.padding = '10px';
        card.style.border = '1px solid #ffeeba';
        card.style.borderRadius = '8px';
        card.style.background = '#fff8e5';
        card.style.fontSize = '12px';

        card.innerHTML = `
            <div>
                <strong>${formatDate(snapshot.deletedAt.split('T')[0])}</strong> - ${new Date(snapshot.deletedAt).toLocaleTimeString('bn-BD')}
                <div style="font-size: 10px; color: #856404; margin-top: 2px;">
                    <i class="fa-solid fa-clock"></i> আর ${englishToBanglaNum(remainingDays.toString())} দিন পর মুছে যাবে
                </div>
                <div style="font-size: 10px; color: #333; margin-top: 2px;">
                    সদস্য: ${englishToBanglaNum(snapshot.members?.length.toString() || '0')}, লেনদেন: ${englishToBanglaNum(snapshot.transactions?.length.toString() || '0')}
                </div>
            </div>
            <button class="btn btn-primary" style="height: 28px; padding: 0 10px; font-size: 11px;" onclick="restoreGlobalRecycleBin(${originalIndex})">
                <i class="fa-solid fa-rotate-left"></i> রিস্টোর
            </button>
        `;
        container.appendChild(card);
    });
}

// Restore entire database from global recycle bin snapshot
window.restoreGlobalRecycleBin = function(index) {
    if (confirm("আপনি কি নিশ্চিতভাবে এই ডাটাবেসটি রিস্টোর করতে চান? আপনার বর্তমান ডাটা এর ফলে ওভাররাইট হয়ে যাবে।")) {
        const snapshot = state.global_recycle_bin[index];
        if (!snapshot) return;

        // Restore active arrays
        state.members = JSON.parse(JSON.stringify(snapshot.members || []));
        state.transactions = JSON.parse(JSON.stringify(snapshot.transactions || []));
        state.subscriptions = JSON.parse(JSON.stringify(snapshot.subscriptions || []));
        if (snapshot.committee) {
            state.committee = JSON.parse(JSON.stringify(snapshot.committee));
        }

        // Remove from recycle bin
        state.global_recycle_bin.splice(index, 1);
        
        saveState();
        refreshAppUI();
        alert("সফলভাবে ডাটাবেসটি রিস্টোর করা হয়েছে!");
    }
};

// Render Soft-deleted members in Admin settings panel
function renderRecycleBin() {
    const container = document.getElementById('recycleBinList');
    if (!container) return;
    container.innerHTML = '';

    const deletedMembers = state.members.filter(m => m.status === 'Deleted');

    if (deletedMembers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 15px; font-size: 12px;">রিসাইকেল বিন ফাঁকা রয়েছে।</div>';
        return;
    }

    const now = new Date();

    deletedMembers.forEach(m => {
        const deletedDate = new Date(m.deleted_at);
        const diffMs = now - deletedDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, 60 - diffDays);

        const card = document.createElement('div');
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.padding = '10px';
        card.style.border = '1px solid #f5c6cb';
        card.style.borderRadius = '8px';
        card.style.background = '#fff3f3';
        card.style.fontSize = '12px';

        card.innerHTML = `
            <div>
                <strong>${m.name}</strong>
                <div style="font-size: 10px; color: #721c24; margin-top: 2px;">
                    <i class="fa-solid fa-clock"></i> ${englishToBanglaNum(remainingDays.toString())} দিন পর স্থায়ীভাবে ডিলিট হবে
                </div>
            </div>
            <button onclick="restoreDeletedMember('${m.id}')" class="btn btn-primary btn-small" style="background-color: #28a745; border-color: #28a745; padding: 4px 10px; font-size: 10px; height: auto;">
                <i class="fa-solid fa-trash-arrow-up"></i> পুনরুদ্ধার
            </button>
        `;
        container.appendChild(card);
    });
}

// Restore Soft-Deleted Member (Admin Only)
function restoreDeletedMember(memberId) {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (state.currentUser.role !== 'admin') {
        alert("শুধুমাত্র এডমিন সদস্য পুনরুদ্ধার করতে পারবেন!");
        return;
    }

    member.status = 'Active';
    delete member.deleted_at;
    
    saveState();
    renderRecycleBin();
    refreshAppUI();
    
    alert(`সদস্য ${member.name}-কে রিসাইকেল বিন থেকে সফলভাবে পুনরুদ্ধার করা হয়েছে।`);
}

// Bulk Import Members from Excel / CSV (SheetJS)
function handleBulkImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Read first worksheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON array of arrays
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (rows.length <= 1) {
                alert("এক্সেল ফাইলে কোনো ডাটা পাওয়া যায়নি!");
                return;
            }

            // Find header indexes case-insensitively
            const headerRow = rows[0].map(h => (h ? h.toString().trim().toLowerCase() : ''));
            const nameIdx = headerRow.findIndex(h => h === 'name' || h === 'নাম');
            const mobileIdx = headerRow.findIndex(h => h === 'mobile' || h === 'মোবাইল' || h === 'ফোন' || h === 'phone');
            const arrearsIdx = headerRow.findIndex(h => h === 'arrears' || h === 'বকেয়া' || h === 'বকেয়া টাকা');

            if (nameIdx === -1 || mobileIdx === -1 || arrearsIdx === -1) {
                alert("এক্সেল ফাইলের হেডার সারিতে অবশ্যই 'Name', 'Mobile', এবং 'Arrears' কলামগুলো থাকতে হবে!");
                return;
            }

            let importCount = 0;
            let skipCount = 0;
            const currentYear = new Date().getFullYear();
            const defaultMonthlyFee = 150; // Standard general member monthly fee

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const rawName = row[nameIdx];
                const rawMobile = row[mobileIdx];
                const rawArrears = row[arrearsIdx];

                if (!rawName) {
                    skipCount++;
                    continue;
                }

                const name = rawName.toString().trim();
                let mobile = '';
                
                if (rawMobile) {
                    const cleanMobile = rawMobile.toString().replace(/[^0-9]/g, '').trim();
                    if (cleanMobile.length > 0) {
                        mobile = cleanMobile;
                        if (mobile.length < 11) {
                            skipCount++;
                            continue;
                        }
                        if (mobile.length > 11) {
                            mobile = mobile.substr(mobile.length - 11);
                        }

                        // Check for duplicate mobile only if mobile is provided
                        const exists = state.members.some(m => m.phone === mobile);
                        if (exists) {
                            skipCount++;
                            continue;
                        }
                    }
                }

                const arrears = parseFloat(rawArrears) || 0;
                const memberId = 'member-bulk-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

                const now = new Date();
                let currentMonth = now.getMonth() + 1;
                let currentYear = now.getFullYear();

                let remainingArrears = arrears;
                let joinYear = currentYear;
                let joinMonth = currentMonth;

                // Collect subscriptions backward to match the exact arrears
                const subsToPush = [];
                let tempYear = currentYear;
                let tempMonth = currentMonth;
                let firstLoop = true;

                while (remainingArrears > 0 || firstLoop) {
                    firstLoop = false;
                    
                    const thisMonthDue = Math.min(remainingArrears, defaultMonthlyFee);
                    const amountPaid = defaultMonthlyFee - thisMonthDue;
                    
                    subsToPush.push({
                        id: `sub-${memberId}-${tempYear}-${tempMonth}`,
                        member_id: memberId,
                        year: tempYear,
                        month: tempMonth,
                        amount_paid: amountPaid,
                        due_amount: thisMonthDue,
                        status: amountPaid <= 0 ? 'Unpaid' : (thisMonthDue <= 0 ? 'Paid' : 'Partial'),
                        last_payment_date: ''
                    });
                    
                    joinYear = tempYear;
                    joinMonth = tempMonth;
                    
                    remainingArrears -= thisMonthDue;
                    
                    // Move backward one month
                    tempMonth--;
                    if (tempMonth < 1) {
                        tempMonth = 12;
                        tempYear--;
                    }
                }

                // Format join date as YYYY-MM-DD
                const joinMonthStr = joinMonth < 10 ? '0' + joinMonth : joinMonth.toString();
                const joinDate = `${joinYear}-${joinMonthStr}-01`;

                const newMember = {
                    id: memberId,
                    name: name,
                    phone: mobile,
                    address: 'বাল্ক আপলোড',
                    member_type: 'General',
                    monthly_fee: defaultMonthlyFee,
                    join_date: joinDate,
                    status: 'Active',
                    delete_requested: false
                };

                state.members.push(newMember);

                // Add the generated subscriptions
                subsToPush.forEach(sub => {
                    state.subscriptions.push(sub);
                });

                importCount++;
            }

            saveState();
            refreshAppUI();
            
            // Reset file input
            document.getElementById('bulkMemberFileInput').value = '';

            let resultMsg = `${englishToBanglaNum(importCount.toString())} জন সদস্য সফলভাবে এক্সেল থেকে ইম্পোর্ট করা হয়েছে।`;
            if (skipCount > 0) {
                resultMsg += ` (মোবাইল নম্বর ডুপ্লিকেট বা ডাটা অসম্পূর্ণ থাকায় ${englishToBanglaNum(skipCount.toString())} টি এন্ট্রি বাদ দেওয়া হয়েছে)`;
            }
            alert(resultMsg);

        } catch (err) {
            console.error(err);
            alert("এক্সেল ফাইল রিড করার সময় সমস্যা হয়েছে! দয়া করে সঠিক ফাইল নির্বাচন করুন।");
        }
    };
    reader.readAsArrayBuffer(file);
}

// ================== FORGOT PASSWORD PASSWORD RECOVERY LOGIC ==================

// Forgot Password recovery session state
let fpSession = {
    role: '',
    phone: '',
    otp: '',
    attempts: 0
};

// Open Forgot Password Modal
function openForgotPasswordModal(e) {
    if (e) e.preventDefault();
    
    // Reset session
    fpSession = {
        role: '',
        phone: '',
        otp: '',
        attempts: 0
    };
    
    // Reset forms
    document.getElementById('fpVerifyForm').reset();
    document.getElementById('fpOtpForm').reset();
    document.getElementById('fpResetForm').reset();
    
    // Show step 1, hide steps 2 and 3
    document.getElementById('fpVerifyForm').style.display = 'block';
    document.getElementById('fpOtpForm').style.display = 'none';
    document.getElementById('fpResetForm').style.display = 'none';
    
    openModal('forgot-password-modal');
}

// Step 1: Submit verification role + phone
function handleFPVerifySubmit(e) {
    e.preventDefault();
    
    const role = document.getElementById('fpRole').value;
    const phone = document.getElementById('fpPhone').value.trim();
    
    const user = state.users[role];
    if (!user || !user.phone || user.phone !== phone) {
        alert("এই পদবীর জন্য প্রদানকৃত মোবাইল নম্বরটি সঠিক নয়!");
        return;
    }
    
    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    fpSession.role = role;
    fpSession.phone = phone;
    fpSession.otp = otp;
    fpSession.attempts = 3;
    
    // Transition to step 2 (OTP Entry)
    document.getElementById('fpVerifyForm').style.display = 'none';
    document.getElementById('fpOtpForm').style.display = 'block';
    
    // Show the simulated SMS notification on screen
    const rawMsg = `বাইতুল মামুর জামে মসজিদ: আপনার পাসওয়ার্ড পুনরুদ্ধারের ওটিপি কোডটি হলো: ${otp}। এটি গোপন রাখুন।`;
    showSimulatedSMSToast(rawMsg);
}

// Step 2: Submit OTP validation
function handleFPOtpSubmit(e) {
    e.preventDefault();
    
    const code = document.getElementById('fpOtpCode').value.trim();
    if (code === fpSession.otp) {
        // Transition to step 3 (Reset password)
        document.getElementById('fpOtpForm').style.display = 'none';
        document.getElementById('fpResetForm').style.display = 'block';
    } else {
        fpSession.attempts--;
        if (fpSession.attempts <= 0) {
            alert("অতিরিক্ত ভুল ওটিপি প্রদানের কারণে পাসওয়ার্ড পুনরুদ্ধার প্রক্রিয়াটি বাতিল করা হলো।");
            closeModal('forgot-password-modal');
        } else {
            alert(`ভুল ওটিপি কোড! অনুগ্রহ করে পুনরায় চেষ্টা করুন। (অবশিষ্ট সুযোগ: ${englishToBanglaNum(fpSession.attempts.toString())} বার)`);
        }
    }
}

// Step 3: Submit Reset Password
function handleFPResetSubmit(e) {
    e.preventDefault();
    
    const newPass = document.getElementById('fpNewPassword').value.trim();
    const confirmPass = document.getElementById('fpConfirmPassword').value.trim();
    
    if (newPass.length < 4) {
        alert("পাসওয়ার্ড ন্যূনতম ৪ ডিজিটের হতে হবে!");
        return;
    }
    
    if (newPass !== confirmPass) {
        alert("উভয় পাসওয়ার্ড হুবহু একই হতে হবে!");
        return;
    }
    
    // Save new password
    if (state.users[fpSession.role]) {
        state.users[fpSession.role].password = newPass;
        saveState();
        alert(`${state.users[fpSession.role].name}-এর পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।`);
        closeModal('forgot-password-modal');
    } else {
        alert("পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে!");
        closeModal('forgot-password-modal');
    }
}

// Show a beautiful premium top SMS Toast Alert on Screen
function showSimulatedSMSToast(msg) {
    const existing = document.getElementById('sms-toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'sms-toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e293b;
        color: #f8fafc;
        border-left: 5px solid #22c55e;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: 'Hind Siliguri', sans-serif;
        font-size: 13px;
        max-width: 90%;
        width: 380px;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideDown 0.3s ease;
    `;
    toast.innerHTML = `
        <div style="font-size: 24px;">✉️</div>
        <div>
            <div style="font-weight: bold; color: #22c55e; margin-bottom: 2px;">মোবাইল মেসেজ (SMS)</div>
            <div>${msg}</div>
        </div>
    `;
    document.body.appendChild(toast);
    
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideDown {
            from { top: -80px; opacity: 0; }
            to { top: 20px; opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Auto-remove toast after 12 seconds
    setTimeout(() => {
        if (toast) toast.remove();
    }, 12000);
}

// Handle Arrears Adjustment Submission (Secretary and Admin Only)
function handleArrearsAdjustmentSubmit(e) {
    try {
        e.preventDefault();
        
        if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'secretary')) {
            alert("শুধুমাত্র সাধারণ সম্পাদক ও এডমিন বকেয়া টাকা সমন্বয় করতে পারবেন!");
            return;
        }

        if (!Array.isArray(state.members)) state.members = [];

        const memberId = document.getElementById('adjMemberId').value;
        const type = document.getElementById('adjType').value;
        const amount = parseFloat(document.getElementById('adjAmount').value);
        const reason = document.getElementById('adjReason').value.trim();

        if (amount <= 0 || isNaN(amount)) {
            alert("টাকার পরিমাণ অবশ্যই ০-এর চেয়ে বেশি হতে হবে!");
            return;
        }

        // Fix integer vs string silent bug by converting both to string
        const member = state.members.find(m => m && m.id && m.id.toString() === memberId.toString());
        if (!member) {
            alert("সদস্য খুঁজে পাওয়া যায়নি!");
            return;
        }

        // Convert existing opening arrears to float to prevent string concatenation
        let currentOpening = parseFloat(member.opening_arrears || 0);
        let typeStr = "";

        if (type === 'decrease') {
            member.opening_arrears = currentOpening - amount;
            typeStr = 'বকেয়া হ্রাস';
        } else if (type === 'increase') {
            member.opening_arrears = currentOpening + amount;
            typeStr = 'বকেয়া বৃদ্ধি';
        } else if (type === 'advance_increase') {
            let currentAdvance = parseFloat(member.advance_balance || 0);
            member.advance_balance = currentAdvance + amount;
            processAdvanceDeductions(); // Allocate advance balance immediately
            typeStr = 'অগ্রিম জমা বৃদ্ধি';
        } else if (type === 'advance_decrease') {
            let currentAdvance = parseFloat(member.advance_balance || 0);
            if (amount > currentAdvance) {
                alert(`অগ্রিম জমার চেয়ে কমানোর পরিমাণ বেশি হতে পারে না! (বর্তমান জমা: ৳ ${currentAdvance})`);
                return;
            }
            member.advance_balance = currentAdvance - amount;
            typeStr = 'অগ্রিম জমা হ্রাস';
        }

        saveState();
        closeModal('member-details-modal');
        refreshAppUI();

        alert(`${member.name}-এর ${typeStr} সফলভাবে সম্পন্ন হয়েছে। (কারণ: ${reason})`);
    } catch (err) {
        console.error("Error adjusting arrears: ", err);
        alert("বকেয়া সমন্বয় করার সময় একটি ত্রুটি হয়েছে।\nError Details: " + err.message);
    }
}

// ==========================================
// Khata Make (Ledger Printing) Functions
// ==========================================
function numberToBanglaWords(amount) {
    amount = Math.floor(parseFloat(amount) || 0);
    if (amount <= 0) return 'শূন্য টাকা মাত্র';

    const banglaNums = {
        0: '', 1: 'এক', 2: 'দুই', 3: 'তিন', 4: 'চার', 5: 'পাঁচ', 6: 'ছয়', 7: 'সাত', 8: 'আট', 9: 'নয়', 10: 'দশ',
        11: 'এগারো', 12: 'বারো', 13: 'তেরো', 14: 'চৌদ্দ', 15: 'পনেরো', 16: 'ষোলো', 17: 'সতেরো', 18: 'আঠারো', 19: 'উনিশ', 20: 'বিশ',
        21: 'একুশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাশ', 28: 'আটাশ', 29: '২৯',
        30: 'ত্রিশ', 31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেত্রিশ', 34: 'চৌত্রিশ', 35: 'পঁয়ত্রিশ', 36: 'ছত্রিশ', 37: 'সাইত্রিশ', 38: 'আটত্রিশ', 39: '৩৯',
        40: 'চল্লিশ', 41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেতাল্লিশ', 44: 'চৌয়াল্লিশ', 45: 'পয়তাল্লিশ', 46: 'ছেচল্লিশ', 47: 'সাতচল্লিশ', 48: 'আটচল্লিশ', 49: '৪৯',
        50: 'পঞ্চাশ', 51: 'একান্ন', 52: 'বায়ান্ন', 53: 'তিপ্পান্ন', 54: 'চৌয়ান্ন', 55: 'পঞ্চান্ন', 56: 'ছাপ্পান্ন', 57: 'সাতান্ন', 58: 'আটান্ন', 59: '৫৯',
        60: 'ষাট', 61: 'একষট্টি', 62: 'বাষট্টি', 63: 'তেষট্টি', 64: 'চৌষট্টি', 65: 'পঁয়ষট্টি', 66: 'ছেষট্টি', 67: 'সাতষট্টি', 68: 'আটষট্টি', 69: '৬৯',
        70: 'সত্তর', 71: 'একাত্তর', 72: 'বাহাত্তর', 73: 'তিয়াত্তর', 74: 'চৌহাত্তর', 75: 'পঁচাত্তর', 76: 'ছিয়াত্তর', 77: 'সাতাত্তর', 78: 'আটাত্তর', 79: '৭৯',
        80: 'আশি', 81: 'একাশি', 82: 'বিরাশি', 83: 'তিরাশি', 84: 'চৌরাশি', 85: 'পঁচাশি', 86: 'ছিয়াশি', 87: 'সাতাশি', 88: 'আটাশি', 89: '৮৯',
        90: 'নব্বই', 91: 'একানব্বই', 92: 'বিয়ানব্বই', 93: 'তিরানব্বই', 94: 'চৌরানব্বই', 95: 'পঁচানব্বই', 96: 'ছিয়ানব্বই', 97: 'সাতানব্বই', 98: 'আটানব্বই', 99: 'নিরানব্বই'
    };

    function convertGroup(n) {
        if (n <= 0) return '';
        return banglaNums[n] || n.toString();
    }

    let words = '';
    let crore = Math.floor(amount / 10000000);
    amount %= 10000000;
    let lakh = Math.floor(amount / 100000);
    amount %= 100000;
    let thousand = Math.floor(amount / 1000);
    amount %= 1000;
    let hundred = Math.floor(amount / 100);
    amount %= 100;

    if (crore > 0) words += convertGroup(crore) + ' কোটি ';
    if (lakh > 0) words += convertGroup(lakh) + ' লাখ ';
    if (thousand > 0) words += convertGroup(thousand) + ' হাজার ';
    if (hundred > 0) words += convertGroup(hundred) + ' শত ';
    if (amount > 0) words += convertGroup(amount) + ' ';

    return words.trim() + ' টাকা মাত্র';
}

// Generate A4 Khata (All Members Monthly Collection Ledger Book)
// ================== ADMIN INDIVIDUAL MEMBER REPORT ==================

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

function generateAllMembersKhata() {
    const yearSelectAdmin = document.getElementById('adayKhataYearSelect');
    const yearSelectMake = document.getElementById('khataMakeYear');
    let selectedYear = new Date().getFullYear();
    if (yearSelectAdmin && yearSelectAdmin.value) {
        selectedYear = parseInt(yearSelectAdmin.value);
    } else if (yearSelectMake && yearSelectMake.value) {
        selectedYear = parseInt(yearSelectMake.value);
    }
    
    // Approved active members
    const approvedActiveMembers = state.members.filter(m => {
        if (!m) return false;
        const st = (m.status || '').toLowerCase();
        return (st === 'active' || st === 'suspended' || st === '') && !m.delete_requested && !m.is_deleted;
    });

    if (approvedActiveMembers.length === 0) {
        alert("খাতা তৈরি করার জন্য কোনো অনুমোদিত সক্রিয় সদস্য পাওয়া যায়নি!");
        return;
    }
    
    // Sort members numerically by realIndex/ID
    const activeMembers = [...approvedActiveMembers];
    activeMembers.sort((a, b) => {
        const indexA = state.members.findIndex(m => m.id === a.id);
        const indexB = state.members.findIndex(m => m.id === b.id);
        return indexA - indexB;
    });
    
    let htmlContent = '';
    const months = ['জানুয়ারি', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1 to 12

    const mosqueName = state.settings.mosque_name || state.settings.mosqueName || DEFAULT_SETTINGS.mosque_name || 'মসজিদের নাম';
    const mosqueAddress = state.settings.mosque_address || state.settings.address || DEFAULT_SETTINGS.mosque_address || '';
    const logoSrc = state.settings.logo_base64 || state.settings.logoData || '';
    
    activeMembers.forEach(member => {
        const realIndex = state.members.findIndex(m => m.id === member.id) + 1;
        const memberNum = englishToBanglaNum(String(realIndex).padStart(2, '0'));
        
        let tableRows = '';
        let totalMonthlyFeeSum = 0;
        let totalClaimSum = 0;
        let totalPaidSum = 0;
        let totalRemainingDueSum = 0;

        // Opening arrears computation prior to selectedYear
        let runningArrear = parseFloat(member.opening_arrears || 0);
        const joinParts = (member.join_date || '2025-01-01').split('-');
        const joinYear = parseInt(joinParts[0]) || 2025;
        const joinMonth = parseInt(joinParts[1]) || 1;

        if (joinYear < selectedYear) {
            for (let y = joinYear; y < selectedYear; y++) {
                const sM = y === joinYear ? joinMonth : 1;
                for (let m = sM; m <= 12; m++) {
                    const sub = state.subscriptions.find(s => s.member_id === member.id && s.year === y && s.month === m);
                    const fee = member.member_type === 'Free' ? 0 : (parseFloat(member.monthly_fee) || 0);
                    const paid = sub ? parseFloat(sub.amount_paid || 0) : 0;
                    runningArrear = (runningArrear + fee) - paid;
                    if (runningArrear < 0) runningArrear = 0;
                }
            }
        }

        let initialBokiaForYear = runningArrear;

        months.forEach((monthName, index) => {
            const mNum = index + 1;
            const isFutureMonth = (selectedYear > currentYear) || (selectedYear === currentYear && mNum > currentMonth);
            const sub = state.subscriptions.find(s => s.member_id === member.id && s.year === selectedYear && s.month === mNum);
            
            let monthlyFee = member.member_type === 'Free' ? 0 : (parseFloat(member.monthly_fee) || 0);
            let paid = sub ? parseFloat(sub.amount_paid || 0) : 0;

            let currentMonthBokia = 0;
            let totalClaim = 0;
            let remainingDue = 0;
            let remainingDueText = '—';
            let receiptNo = sub && sub.receipt_no ? englishToBanglaNum(sub.receipt_no.toString()) : '';
            if (!receiptNo && sub && sub.status === 'Paid') receiptNo = '—';

            let collector = sub && sub.collector ? sub.collector : '';
            if (!collector && sub && sub.last_payment_date) {
                const matchingTx = state.transactions.find(t => t.member_id === member.id && t.date === sub.last_payment_date);
                if (matchingTx) collector = matchingTx.created_by || matchingTx.collected_by || '';
            }

            if (isFutureMonth) {
                // Future months: do NOT calculate fee or claim debt
                if (paid > 0) {
                    remainingDueText = '<span style="color: #1b5e20;">পরিশোধিত (অগ্রিম)</span>';
                    totalPaidSum += paid;
                } else {
                    remainingDueText = '—';
                }
            } else {
                // Past and Current Months: calculate claims and arrears
                currentMonthBokia = runningArrear;
                totalClaim = currentMonthBokia + monthlyFee;
                remainingDue = totalClaim - paid;
                if (remainingDue < 0) remainingDue = 0;

                runningArrear = remainingDue;

                if (member.member_type === 'Free') {
                    remainingDueText = '<span style="color: #1565c0;">মওকুফ</span>';
                } else if (remainingDue > 0) {
                    remainingDueText = `<span style="color: #b71c1c; font-weight: 700;">৳ ${englishToBanglaNum(remainingDue.toFixed(0))}</span>`;
                } else {
                    remainingDueText = '<span style="color: #1b5e20; font-weight: 700;">পরিশোধিত</span>';
                }

                totalMonthlyFeeSum += monthlyFee;
                totalClaimSum += totalClaim;
                totalPaidSum += paid;
                totalRemainingDueSum = remainingDue;
            }

            tableRows += `
                <tr style="${isFutureMonth ? 'background-color: #fafafa; color: #777;' : ''}">
                    <td style="text-align: left; font-weight: bold;">${monthName} ${isFutureMonth ? '<small style="font-weight:normal;color:#999;">(অগ্রিম)</small>' : ''}</td>
                    <td>${!isFutureMonth && currentMonthBokia > 0 ? englishToBanglaNum(currentMonthBokia.toFixed(0)) : '—'}</td>
                    <td>${!isFutureMonth && monthlyFee > 0 ? englishToBanglaNum(monthlyFee.toFixed(0)) : (isFutureMonth ? '—' : '০')}</td>
                    <td>${!isFutureMonth && totalClaim > 0 ? englishToBanglaNum(totalClaim.toFixed(0)) : '—'}</td>
                    <td>${receiptNo || '—'}</td>
                    <td>${paid > 0 ? englishToBanglaNum(paid.toFixed(0)) : '—'}</td>
                    <td>${remainingDueText}</td>
                    <td>${collector || '—'}</td>
                </tr>
            `;
        });
        
        // Total row up to current month
        const totalDueDisplay = totalRemainingDueSum > 0 
            ? `<span style="color: #b71c1c; font-weight: 800;">৳ ${englishToBanglaNum(totalRemainingDueSum.toFixed(0))}</span>` 
            : `<span style="color: #1b5e20; font-weight: 800;">পরিশোধিত</span>`;

        tableRows += `
            <tr style="font-weight: bold; background-color: #f0f4f1; border-top: 2px solid #000;">
                <td style="text-align: left;">সর্ব মোট (বর্তমান মাস পর্যন্ত)</td>
                <td>${initialBokiaForYear > 0 ? englishToBanglaNum(initialBokiaForYear.toFixed(0)) : '—'}</td>
                <td>${totalMonthlyFeeSum > 0 ? englishToBanglaNum(totalMonthlyFeeSum.toFixed(0)) : '০'}</td>
                <td>${totalClaimSum > 0 ? englishToBanglaNum(totalClaimSum.toFixed(0)) : '—'}</td>
                <td></td>
                <td>${totalPaidSum > 0 ? englishToBanglaNum(totalPaidSum.toFixed(0)) : '০'}</td>
                <td>${totalDueDisplay}</td>
                <td></td>
            </tr>
        `;
        
        const paidWords = totalPaidSum > 0 ? numberToBanglaWords(totalPaidSum) : 'শূন্য';

        const memberHtml = `
            <div class="khata-page">
                ${getPadHeaderHTML('মাসিক চাঁদা আদায় বহি (খাতা)', `বছর: ${englishToBanglaNum(selectedYear.toString())} খ্রি: (বর্তমান মাস পর্যন্ত)`, 'আদায়-খাতা/' + englishToBanglaNum(selectedYear.toString()))}
                <div style="text-align: right; margin-top: -10px; margin-bottom: 10px;">
                    <span style="font-weight: bold; font-size: 13px; border: 1.5px solid #0f5132; padding: 3px 10px; border-radius: 6px; background: #f4faf6;">
                        সদস্য নং: ${memberNum}
                    </span>
                </div>
                
                <div class="khata-top-info" style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; font-size: 14px; background: #fdfdfd; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                    <div>নাম: <span style="font-weight: normal; margin-left: 5px;">${member.name}</span></div>
                    <div>মোবাইল: <span style="font-weight: normal; margin-left: 5px;">${member.phone ? englishToBanglaNum(member.phone) : '—'}</span></div>
                    <div>বর্তমান স্থিতি: <span style="margin-left: 5px;">${totalRemainingDueSum > 0 ? `<span style="color:#b71c1c;">বকেয়া ৳ ${englishToBanglaNum(totalRemainingDueSum.toFixed(0))}</span>` : `<span style="color:#1b5e20;">পরিশোধিত</span>`}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">মাস</th>
                            <th style="width: 11%;">বকেয়া</th>
                            <th style="width: 13%;">মাসিক চাঁদা</th>
                            <th style="width: 12%;">মোট দাবী</th>
                            <th style="width: 13%;">রশিদ নম্বর</th>
                            <th style="width: 12%;">মোট আদায়</th>
                            <th style="width: 14%;">মোট বাকী / স্থিতি</th>
                            <th style="width: 10%;">আদায়কারী</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                
                <div class="khata-footer" style="margin-top: 20px; font-size: 13px; line-height: 1.8;">
                    উক্ত সদস্য থেকে ${englishToBanglaNum(selectedYear.toString())} সালে সর্ব মোট ${totalPaidSum > 0 ? englishToBanglaNum(totalPaidSum.toFixed(0)) : '০'} টাকা গ্রহণ করা হয়েছে। (কথায়: ${paidWords} টাকা)<br>
                    <strong>বর্তমান হিসাব স্থিতি:</strong> ${totalRemainingDueSum > 0 ? `সর্বমোট বকেয়া পরিমাণ ৳ ${englishToBanglaNum(totalRemainingDueSum.toFixed(0))}` : `<span style="color: #1b5e20; font-weight: bold;">বর্তমান মাস পর্যন্ত সকল চাঁদা সফলভাবে পরিশোধিত হয়েছে।</span>`}
                </div>
                
                <div class="khata-signatures" style="display: flex; justify-content: space-between; margin-top: 40px; font-weight: bold; font-size: 13px;">
                    <div style="border-top: 1px solid #000; padding-top: 5px; width: 140px; text-align: center;">কোষাধ্যক্ষ</div>
                    <div style="border-top: 1px solid #000; padding-top: 5px; width: 140px; text-align: center;">সাধারণ সম্পাদক</div>
                    <div style="border-top: 1px solid #000; padding-top: 5px; width: 140px; text-align: center;">সভাপতি</div>
                </div>
            </div>
        `;
        
        htmlContent += memberHtml;
    });
    
    // ── Open a clean A4 print window (no mobile-frame influence) ──
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        alert("পপ-আপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজারে এই সাইটের জন্য পপ-আপ অনুমতি দিন এবং আবার চেষ্টা করুন।");
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <title>আদায় খাতা - ${englishToBanglaNum(selectedYear.toString())} খ্রি:</title>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', Arial, sans-serif;
            font-size: 13px;
            color: #000;
            background: #fff;
        }
        @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
        ${getPadCSS()}

        .khata-page {
            width: 100%;
            page-break-after: always;
            padding: 0;
        }
        .khata-page:last-child { page-break-after: auto; }

        .khata-header {
            display: flex;
            align-items: flex-start;
            justify-content: center;
            position: relative;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 12px;
            min-height: 80px;
        }
        .khata-logo {
            position: absolute; left: 0; top: 0;
            width: 68px; height: 68px; object-fit: contain;
        }
        .khata-title-block { text-align: center; }
        .khata-title-block h2 { font-size: 20px; font-weight: 700; margin-bottom: 3px; }
        .khata-title-block p { font-size: 12px; color: #444; margin-bottom: 3px; }
        .khata-title-block h3 {
            font-size: 16px; font-weight: 700; margin-bottom: 4px;
            border-bottom: 1px solid #555; display: inline-block; padding-bottom: 2px;
        }
        .year-text { font-size: 14px; font-weight: 700; color: #000; }
        .khata-serial {
            position: absolute; right: 0; top: 0;
            font-size: 13px; font-weight: 700;
            border: 1px solid #000; padding: 4px 10px; border-radius: 4px;
        }

        .khata-member-info {
            display: flex; justify-content: space-between;
            font-size: 14px; margin-bottom: 10px;
            padding: 6px 0; border-bottom: 1px dashed #888;
        }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td {
            border: 1px solid #000; padding: 6px 4px;
            text-align: center; vertical-align: middle; word-wrap: break-word;
        }
        thead tr { background-color: #d6e4d6; }
        th { font-size: 12px; font-weight: 700; }
        tbody tr:nth-child(even) { background-color: #f9f9f9; }
        .total-row { background-color: #e8e8e8 !important; font-weight: 700; }

        .khata-footer {
            margin-top: 18px; font-size: 13px; line-height: 1.9;
            border-top: 1px dashed #888; padding-top: 10px;
        }
        .khata-signatures {
            display: flex; justify-content: space-between; margin-top: 40px;
        }
        .sig-box {
            text-align: center; width: 160px;
            border-top: 1px solid #000; padding-top: 5px;
            font-size: 13px; font-weight: 700;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 900);
}

// ==========================================
// Print Individual Member Statement / Yearly Report (A4 Layout)
// ==========================================
function generateYearlyPrintReport(targetMemberId) {
    try {
        const memberId = targetMemberId || state.activeMemberId;
        const member = (state.members || []).find(m => m.id === memberId);
        
        if (!member) {
            alert("কোনো সদস্য নির্বাচন করা হয়নি!");
            return;
        }

        const mosqueName = state.settings.mosque_name || state.settings.mosqueName || (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS.mosque_name : 'মসজিদের নাম');
        const mosqueAddress = state.settings.mosque_address || state.settings.address || (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS.mosque_address : '');
        const logoSrc = state.settings.logo_base64 || state.settings.logoData || '';
        const printDate = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });

        const totalDue = calculateMemberTotalDue(member.id);
        const advanceBal = parseFloat(member.advance_balance || 0);
        const openingArrears = parseFloat(member.opening_arrears || 0);

        // Get all transactions for this member
        const memberTxList = (state.transactions || [])
            .filter(t => t.member_id === member.id && t.transaction_type === 'INCOME')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        let totalPaidAllTime = memberTxList.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        // Build Month-by-Month Subscription Payment Table
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const joinParts = (member.join_date || '2025-01-01').split('-');
        const joinYear = parseInt(joinParts[0]) || 2025;
        const joinMonth = parseInt(joinParts[1]) || 1;

        let monthGridRowsHtml = '';
        for (let y = joinYear; y <= currentYear; y++) {
            let yearTotalExpected = 0;
            let yearTotalPaid = 0;
            let cellsHtml = '';

            for (let m = 1; m <= 12; m++) {
                const isBeforeJoin = (y === joinYear && m < joinMonth);
                const isFutureMonth = (y > currentYear) || (y === currentYear && m > currentMonth);
                
                if (isBeforeJoin) {
                    cellsHtml += `<td style="text-align:center; color:#999; background:#f5f5f5; font-size:10px;">—</td>`;
                    continue;
                }

                const fee = parseFloat(member.monthly_fee || 0);
                const sub = (state.subscriptions || []).find(s => s.member_id === member.id && s.year === y && s.month === m);
                const paid = sub ? parseFloat(sub.amount_paid || 0) : 0;

                if (!isFutureMonth) {
                    yearTotalExpected += fee;
                    yearTotalPaid += paid;
                }

                let cellBg = '#ffffff';
                let cellText = '৳ ০';
                let statusStyle = 'color:#b71c1c; font-weight:bold;';

                if (isFutureMonth) {
                    if (paid > 0) {
                        cellBg = '#e8f5e9';
                        cellText = `৳ ${englishToBanglaNum(paid.toFixed(0))}`;
                        statusStyle = 'color:#2e7d32; font-weight:bold;';
                    } else {
                        cellBg = '#fafafa';
                        cellText = '—';
                        statusStyle = 'color:#999;';
                    }
                } else if (member.member_type === 'Free') {
                    cellBg = '#e8f5e9';
                    cellText = 'মওকুফ';
                    statusStyle = 'color:#2e7d32; font-weight:bold;';
                } else if (paid >= fee) {
                    cellBg = '#e8f5e9';
                    cellText = `৳ ${englishToBanglaNum(paid.toFixed(0))}`;
                    statusStyle = 'color:#2e7d32; font-weight:bold;';
                } else if (paid > 0) {
                    cellBg = '#fffde7';
                    cellText = `৳ ${englishToBanglaNum(paid.toFixed(0))}`;
                    statusStyle = 'color:#f57f17; font-weight:bold;';
                } else {
                    cellBg = '#ffebee';
                    cellText = 'অনাদায়ী';
                    statusStyle = 'color:#c62828; font-weight:bold; font-size:10px;';
                }

                cellsHtml += `<td style="text-align:center; background:${cellBg}; ${statusStyle} font-size:11px; padding:6px 2px;">${cellText}</td>`;
            }

            const yearNetDue = Math.max(0, yearTotalExpected - yearTotalPaid);

            monthGridRowsHtml += `<tr>
                <td style="text-align:center; font-weight:bold; background:#f0f4f0; font-size:11px;">${englishToBanglaNum(y.toString())} খ্রি:</td>
                ${cellsHtml}
                <td style="text-align:right; font-weight:bold; color:#1b5e20; background:#f1f8f1; font-size:11px;">৳ ${englishToBanglaNum(yearTotalPaid.toFixed(0))}</td>
                <td style="text-align:right; font-weight:bold; color:${yearNetDue > 0 ? '#b71c1c' : '#2e7d32'}; background:${yearNetDue > 0 ? '#fff5f5' : '#f1f8f1'}; font-size:11px;">${yearNetDue > 0 ? '৳ ' + englishToBanglaNum(yearNetDue.toFixed(0)) : 'পরিশোধিত'}</td>
            </tr>`;
        }

        // Build Transaction History Rows
        let txRowsHtml = '';
        if (memberTxList.length === 0) {
            txRowsHtml = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#777;">এখনো কোনো নগদ/ব্যাংক রশিদের চাঁদা পরিশোধ এন্ট্রি পাওয়া যায়নি।</td></tr>`;
        } else {
            memberTxList.forEach((tx, idx) => {
                const dateBN = formatDate(tx.date);
                const receiptBN = tx.receipt_no ? englishToBanglaNum(tx.receipt_no) : '—';
                const modeBN = (tx.payment_mode === 'BANK' || tx.payment_method === 'BANK') ? 'ব্যাংক' : 'নগদ';
                const amtBN = englishToBanglaNum(parseFloat(tx.amount || 0).toFixed(2));
                txRowsHtml += `<tr>
                    <td style="text-align:center;">${englishToBanglaNum((idx + 1).toString())}</td>
                    <td style="text-align:center;">${dateBN}</td>
                    <td style="text-align:center; font-weight:bold; color:#1565c0;">${receiptBN}</td>
                    <td style="text-align:left;">${tx.description || 'মাসিক চাঁদা পরিশোধ'}</td>
                    <td style="text-align:center;">${modeBN}</td>
                    <td style="text-align:right; font-weight:bold; color:#2e7d32;">৳ ${amtBN}</td>
                </tr>`;
            });
        }

        const memberRoleLabel = member.committee_role || (member.member_type === 'Poor' ? 'দরিদ্র সদস্য' : member.member_type === 'Free' ? 'ফ্রি সদস্য (মওকুফ)' : 'সাধারণ সদস্য');

        const htmlContent = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>${mosqueName} — ${member.name}-এর বাৎসরিক বিবরণী</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 10mm; }
  @page { size: A4 portrait; margin: 10mm; }
  
  .header-container { display: flex; align-items: center; position: relative; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; min-height: 75px; }
  .logo-container { position: absolute; left: 0; top: 0; width: 68px; height: 68px; border-radius: 50%; background: #ffffff; border: 1.5px solid #ddd; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 3px; }
  .logo-container img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
  .title-block { text-align: center; flex: 1; }
  .title-block h1 { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
  .title-block p { font-size: 11px; color: #333; margin-bottom: 2px; }
  .title-block h2 { font-size: 14px; font-weight: 700; display: inline-block; border-bottom: 1px solid #333; padding-bottom: 2px; margin-top: 4px; }
  .print-date { position: absolute; right: 0; top: 0; font-size: 10px; color: #555; text-align: right; }

  .member-card { background: #f8faf8; border: 1px solid #c8e6c9; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; }
  .member-card div { margin-bottom: 3px; }
  .member-card strong { color: #1b5e20; }

  .summary-boxes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .sbox { border-radius: 6px; padding: 8px; text-align: center; border: 1px solid #ccc; }
  .sbox.due { background: #ffebee; border-color: #ef5350; }
  .sbox.adv { background: #e8f5e9; border-color: #66bb6a; }
  .sbox.paid { background: #e3f2fd; border-color: #42a5f5; }
  .sbox .lbl { font-size: 10px; color: #555; margin-bottom: 2px; }
  .sbox .val { font-size: 14px; font-weight: 800; }

  .section-title { font-size: 12px; font-weight: 700; color: #2e7d32; margin-bottom: 6px; border-left: 4px solid #2e7d32; padding-left: 6px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10px; }
  th, td { border: 1px solid #444; padding: 5px 4px; vertical-align: middle; }
  th { background: #f0f4f0; font-weight: 700; text-align: center; }

  .sigs { display: flex; justify-content: space-between; margin-top: 35px; }
  .sig { text-align: center; width: 150px; border-top: 1px solid #000; padding-top: 5px; font-size: 11px; font-weight: 700; }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  ${getPadCSS()}
</style>
</head>
<body>

${getPadHeaderHTML(`${member.name}-এর বাৎসরিক ও ব্যক্তিগত বিবরণী`, `সদস্য নং: ${englishToBanglaNum(member.member_no || member.id)} | পদবী: ${memberRoleLabel}`, 'সদস্য/' + englishToBanglaNum(member.member_no || member.id), printDate)}

<div class="member-card">
  <div><strong>সদস্যের নাম:</strong> ${member.name}</div>
  <div><strong>সদস্য নং:</strong> ${englishToBanglaNum(member.member_no || member.id)}</div>
  <div><strong>মোবাইল নম্বর:</strong> ${englishToBanglaNum(member.phone || '—')}</div>
  <div><strong>পদবী / সদস্যের ধরণ:</strong> ${memberRoleLabel}</div>
  <div><strong>ঠিকানা:</strong> ${member.address || '—'}</div>
  <div><strong>মাসিক চাঁদার হার:</strong> ৳ ${englishToBanglaNum(parseFloat(member.monthly_fee || 0).toFixed(2))}</div>
  <div><strong>যোগদানের তারিখ:</strong> ${formatDate(member.join_date || '2025-01-01')}</div>
  <div><strong>বিগত বছরের বকেয়া:</strong> ৳ ${englishToBanglaNum(openingArrears.toFixed(2))}</div>
</div>

<div class="summary-boxes">
  <div class="sbox due">
    <div class="lbl">বর্তমান মোট বকেয়া</div>
    <div class="val" style="color: #b71c1c;">৳ ${englishToBanglaNum(totalDue.toFixed(2))}</div>
  </div>
  <div class="sbox adv">
    <div class="lbl">অগ্রিম জমা ব্যালেন্স</div>
    <div class="val" style="color: #1b5e20;">৳ ${englishToBanglaNum(advanceBal.toFixed(2))}</div>
  </div>
  <div class="sbox paid">
    <div class="lbl">সর্বমোট পরিশোধিত চাঁদা</div>
    <div class="val" style="color: #0d47a1;">৳ ${englishToBanglaNum(totalPaidAllTime.toFixed(2))}</div>
  </div>
</div>

<div class="section-title">📅 মাসভিত্তিক চাঁদা পরিশোধ স্ট্যাটাস</div>
<table>
  <thead>
    <tr>
      <th style="width: 10%;">বছর</th>
      <th>জানু</th><th>ফেব্রু</th><th>মার্চ</th><th>এপ্রিল</th><th>মে</th><th>জুন</th>
      <th>জুলাই</th><th>আগস্ট</th><th>সেপ্টে</th><th>অক্টো</th><th>নভে</th><th>ডিসে</th>
      <th style="width: 11%;">আদায়</th>
      <th style="width: 11%;">বকেয়া</th>
    </tr>
  </thead>
  <tbody>
    ${monthGridRowsHtml}
  </tbody>
</table>

<div class="section-title">🧾 রশিদের মাধ্যমে পরিশোধিত চাঁদার তারিখভিত্তিক ইতিহাস</div>
<table>
  <thead>
    <tr>
      <th style="width: 6%;">ক্রমিক</th>
      <th style="width: 14%;">তারিখ</th>
      <th style="width: 16%;">রশিদ নং</th>
      <th style="width: 36%; text-align: left;">বিবরণ</th>
      <th style="width: 12%;">মাধ্যম</th>
      <th style="width: 16%; text-align: right;">পরিমাণ (৳)</th>
    </tr>
  </thead>
  <tbody>
    ${txRowsHtml}
  </tbody>
</table>

<div class="sigs">
  <div class="sig">সদস্যের স্বাক্ষর</div>
  <div class="sig">কোষাধ্যক্ষের স্বাক্ষর</div>
  <div class="sig">সভাপতি / সাধারণ সম্পাদক</div>
</div>

</body>
</html>`;

        const printWindow = window.open('', '_blank', 'width=920,height=750');
        if (!printWindow) {
            alert("পপ-আপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজারে পপ-আপ অনুমতি দিন।");
            return;
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 800);

    } catch (err) {
        console.error("Error in generateYearlyPrintReport: ", err);
        alert("বাৎসরিক বিবরণী তৈরি করার সময় ত্রুটি হয়েছে: " + err.message);
    }
}

// 1. Print General Member Directory & Register (A4 Layout)
// Column Layout: সদস্য নং | নাম | পদবী | মোবাইল | স্বাক্ষর | মন্তব্য
// ==========================================
function printAllMembersList() {
    const searchVal = (document.getElementById('memberSearchInput')?.value || '').toLowerCase();
    
    const approvedActiveMembers = state.members.filter(m => {
        if (!m) return false;
        const st = (m.status || '').toLowerCase();
        return (st === 'active' || st === 'suspended' || st === '') && !m.delete_requested && !m.is_deleted;
    });

    const filteredMembers = approvedActiveMembers.filter(m => {
        const memberDue = calculateMemberTotalDue(m.id);
        const realIndex = state.members.findIndex(member => member.id === m.id) + 1;
        const displayNum = String(realIndex).padStart(2, '0');
        const displayNumBN = englishToBanglaNum(displayNum);
        
        const matchesSearch = !searchVal || 
                              m.name.toLowerCase().includes(searchVal) || 
                              (m.phone && m.phone.includes(searchVal)) ||
                              displayNum.includes(searchVal) ||
                              displayNumBN.includes(searchVal) ||
                              m.id.includes(searchVal);
                              
        if (!matchesSearch) return false;

        if (state.memberFilter === 'due') return memberDue > 0;
        if (state.memberFilter !== 'all' && m.member_type !== state.memberFilter) return false;

        return true;
    });

    if (filteredMembers.length === 0) {
        alert("প্রিন্ট করার জন্য কোনো সদস্য পাওয়া যায়নি!");
        return;
    }

    // Sort numerically by real Index
    filteredMembers.sort((a, b) => {
        const indexA = state.members.findIndex(m => m.id === a.id);
        const indexB = state.members.findIndex(m => m.id === b.id);
        return indexA - indexB;
    });

    let filterText = 'সকল সদস্য';
    if (state.memberFilter === 'due') filterText = 'বকেয়া সদস্য';
    else if (state.memberFilter === 'General') filterText = 'সাধারণ সদস্য';
    else if (state.memberFilter === 'Poor') filterText = 'দরিদ্র সদস্য';
    else if (state.memberFilter === 'Free') filterText = 'ফ্রি সদস্য';

    let tableRows = '';

    filteredMembers.forEach((m) => {
        const realIndex = state.members.findIndex(member => member.id === m.id) + 1;
        const displayNum = String(realIndex).padStart(2, '0');

        // Determine designation/committee role
        let designation = 'সাধারণ সদস্য';
        if (state.committee && Array.isArray(state.committee)) {
            const comMember = state.committee.find(c => c.member_id === m.id || c.name === m.name);
            if (comMember && comMember.role) {
                designation = comMember.role;
            }
        }
        if (designation === 'সাধারণ সদস্য') {
            if (m.member_type === 'Poor') designation = 'দরিদ্র সদস্য';
            else if (m.member_type === 'Free') designation = 'ফ্রি সদস্য';
        }

        tableRows += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${englishToBanglaNum(displayNum)}</td>
                <td style="text-align: left; font-weight: bold;">${m.name}</td>
                <td style="text-align: center;">${designation}</td>
                <td style="text-align: center;">${m.phone ? englishToBanglaNum(m.phone) : '—'}</td>
                <td style="text-align: center; min-width: 80px;"></td>
                <td style="text-align: center; min-width: 80px;"></td>
            </tr>
        `;
    });

    const printDate = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const mosqueName = state.settings.mosque_name || state.settings.mosqueName || DEFAULT_SETTINGS.mosque_name || 'মসজিদের নাম';
    const mosqueAddress = state.settings.mosque_address || state.settings.address || DEFAULT_SETTINGS.mosque_address || '';
    const logoSrc = state.settings.logo_base64 || state.settings.logoData || '';

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert("পপ-আপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজারে পপ-আপ অনুমতি দিন।"); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>${mosqueName} — সদস্য রেজিস্টার (${filterText})</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', Arial, sans-serif; font-size: 13px; color: #000; background: #fff; }
  @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
  .header { display: flex; align-items: flex-start; justify-content: center; position: relative; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; min-height: 75px; }
  .logo { position: absolute; left: 0; top: 0; width: 68px; height: 68px; object-fit: contain; }
  .title-block { text-align: center; }
  .title-block h2 { font-size: 20px; font-weight: 700; margin-bottom: 3px; }
  .title-block p { font-size: 12px; color: #444; margin-bottom: 3px; }
  .title-block h3 { font-size: 15px; font-weight: 700; margin-top: 4px; border-bottom: 1px solid #555; display: inline-block; padding-bottom: 2px; }
  .print-date { position: absolute; right: 0; top: 0; font-size: 11px; color: #555; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
  th, td { border: 1px solid #000; padding: 8px 6px; vertical-align: middle; word-wrap: break-word; }
  thead tr { background-color: #d6e4d6; }
  th { font-size: 12px; font-weight: 700; text-align: center; }
  tbody tr:nth-child(even) { background-color: #fcfcfc; }
  .signatures { display: flex; justify-content: space-between; margin-top: 45px; }
  .sig-box { text-align: center; width: 160px; border-top: 1px solid #000; padding-top: 5px; font-size: 13px; font-weight: 700; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  ${getPadCSS()}
</style>
</head>
<body>
${getPadHeaderHTML('সদস্য রেজিস্টার তালিকা', `শ্রেণী/ফিল্টার: ${filterText}`, 'রেজিস্টার/' + englishToBanglaNum(new Date().getFullYear().toString()), printDate)}
<table>
  <thead>
    <tr>
      <th style="width: 10%;">সদস্য নং</th>
      <th style="width: 28%; text-align: left;">সদস্যের নাম</th>
      <th style="width: 18%;">পদবী</th>
      <th style="width: 18%;">মোবাইল</th>
      <th style="width: 14%;">স্বাক্ষর</th>
      <th style="width: 12%;">মন্তব্য</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
</table>
<div class="signatures">
  <div class="sig-box">কোষাধ্যক্ষ</div>
  <div class="sig-box">সাধারণ সম্পাদক</div>
  <div class="sig-box">সভাপতি</div>
</div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 800);
}

// ==========================================
// 2. Print Arrears Member List (A4 Layout)
// Column Layout: সদস্য নং | নাম | মোবাইল | মাসিক চাঁদা | বকেয়া চাঁদা | মন্তব্য
// ==========================================
function printArrearsList() {
    const searchVal = (document.getElementById('memberSearchInput')?.value || '').toLowerCase();
    
    const approvedActiveMembers = state.members.filter(m => {
        if (!m) return false;
        const st = (m.status || '').toLowerCase();
        return (st === 'active' || st === 'suspended' || st === '') && !m.delete_requested && !m.is_deleted;
    });

    // Only members with arrears (dueAmount > 0)
    const arrearsMembers = approvedActiveMembers.filter(m => {
        const memberDue = calculateMemberTotalDue(m.id);
        if (memberDue <= 0) return false;

        const realIndex = state.members.findIndex(member => member.id === m.id) + 1;
        const displayNum = String(realIndex).padStart(2, '0');
        const displayNumBN = englishToBanglaNum(displayNum);
        
        const matchesSearch = !searchVal || 
                              m.name.toLowerCase().includes(searchVal) || 
                              (m.phone && m.phone.includes(searchVal)) ||
                              displayNum.includes(searchVal) ||
                              displayNumBN.includes(searchVal) ||
                              m.id.includes(searchVal);
                              
        return matchesSearch;
    });

    if (arrearsMembers.length === 0) {
        alert("কোনো বকেয়া সদস্য পাওয়া যায়নি!");
        return;
    }

    // Sort numerically by real Index
    arrearsMembers.sort((a, b) => {
        const indexA = state.members.findIndex(m => m.id === a.id);
        const indexB = state.members.findIndex(m => m.id === b.id);
        return indexA - indexB;
    });

    let tableRows = '';
    let totalDuesSum = 0;

    arrearsMembers.forEach((m) => {
        const realIndex = state.members.findIndex(member => member.id === m.id) + 1;
        const displayNum = String(realIndex).padStart(2, '0');
        const dueAmount = calculateMemberTotalDue(m.id);
        const monthlyFee = m.member_type === 'Free' ? 0 : (parseFloat(m.monthly_fee) || 0);
        totalDuesSum += dueAmount;

        tableRows += `
            <tr>
                <td style="text-align: center; font-weight: bold;">${englishToBanglaNum(displayNum)}</td>
                <td style="text-align: left; font-weight: bold;">${m.name}</td>
                <td style="text-align: center;">${m.phone ? englishToBanglaNum(m.phone) : '—'}</td>
                <td style="text-align: right;">${monthlyFee > 0 ? '৳ ' + englishToBanglaNum(monthlyFee.toFixed(0)) : 'মওকুফ'}</td>
                <td style="text-align: right; font-weight: bold; color: #b71c1c;">৳ ${englishToBanglaNum(dueAmount.toFixed(0))}</td>
                <td style="text-align: center;"></td>
            </tr>
        `;
    });

    const printDate = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const mosqueName = state.settings.mosque_name || state.settings.mosqueName || DEFAULT_SETTINGS.mosque_name || 'মসজিদের নাম';
    const mosqueAddress = state.settings.mosque_address || state.settings.address || DEFAULT_SETTINGS.mosque_address || '';
    const logoSrc = state.settings.logo_base64 || state.settings.logoData || '';

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert("পপ-আপ ব্লক করা আছে। অনুগ্রহ করে ব্রাউজারে পপ-আপ অনুমতি দিন।"); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>${mosqueName} — বকেয়া সদস্য তালিকা</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', Arial, sans-serif; font-size: 13px; color: #000; background: #fff; }
  @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
  .header { display: flex; align-items: flex-start; justify-content: center; position: relative; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; min-height: 75px; }
  .logo { position: absolute; left: 0; top: 0; width: 68px; height: 68px; object-fit: contain; }
  .title-block { text-align: center; }
  .title-block h2 { font-size: 20px; font-weight: 700; margin-bottom: 3px; }
  .title-block p { font-size: 12px; color: #444; margin-bottom: 3px; }
  .title-block h3 { font-size: 15px; font-weight: 700; margin-top: 4px; border-bottom: 1px solid #555; display: inline-block; padding-bottom: 2px; color: #b71c1c; }
  .print-date { position: absolute; right: 0; top: 0; font-size: 11px; color: #555; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
  th, td { border: 1px solid #000; padding: 8px 6px; vertical-align: middle; word-wrap: break-word; }
  thead tr { background-color: #fbe9e7; }
  th { font-size: 12px; font-weight: 700; text-align: center; }
  tbody tr:nth-child(even) { background-color: #fff8f6; }
  tfoot tr { background-color: #f5d6d1; font-weight: 700; }
  .signatures { display: flex; justify-content: space-between; margin-top: 45px; }
  .sig-box { text-align: center; width: 160px; border-top: 1px solid #000; padding-top: 5px; font-size: 13px; font-weight: 700; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  ${getPadCSS()}
</style>
</head>
<body>
${getPadHeaderHTML('সদস্যদের বকেয়া চাঁদা পরিশোধের তালিকা', `মোট বকেয়া সদস্য সংখ্যা: ${englishToBanglaNum(arrearsMembers.length.toString())} জন`, 'বকেয়া-তালিকা/' + englishToBanglaNum(new Date().getFullYear().toString()), printDate)}
<table>
  <thead>
    <tr>
      <th style="width: 10%;">সদস্য নং</th>
      <th style="width: 28%; text-align: left;">সদস্যের নাম</th>
      <th style="width: 18%;">মোবাইল</th>
      <th style="width: 14%; text-align: right;">মাসিক চাঁদা</th>
      <th style="width: 16%; text-align: right;">মোট বকেয়া (৳)</th>
      <th style="width: 14%;">মন্তব্য</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
    <tr style="font-weight: bold; background-color: #f5d6d1; border-top: 2px solid #000;">
      <td colspan="4" style="text-align: right; font-weight: bold; padding: 10px 8px;">সর্বমোট বকেয়া পরিমাণ:</td>
      <td style="text-align: right; color: #b71c1c; font-size: 14px; font-weight: 800; padding: 10px 8px;">৳ ${englishToBanglaNum(totalDuesSum.toFixed(0))}</td>
      <td></td>
    </tr>
  </tbody>
</table>
<div class="signatures">
  <div class="sig-box">কোষাধ্যক্ষ</div>
  <div class="sig-box">সাধারণ সম্পাদক</div>
  <div class="sig-box">সভাপতি</div>
</div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 800);
}

// ==========================================
// Excel Export Function for Admin Settings
// ==========================================
function exportMembersToExcel() {
    // Filter active & approved members
    const approvedActiveMembers = state.members.filter(m => {
        if (!m) return false;
        const st = (m.status || '').toLowerCase();
        return (st === 'active' || st === 'suspended' || st === '') && !m.delete_requested && !m.is_deleted;
    });

    if (approvedActiveMembers.length === 0) {
        alert("এক্সপোর্ট করার মতো কোনো সক্রিয় সদস্য পাওয়া যায়নি!");
        return;
    }

    // Sort members numerically by realIndex/ID
    approvedActiveMembers.sort((a, b) => {
        const indexA = state.members.findIndex(m => m.id === a.id);
        const indexB = state.members.findIndex(m => m.id === b.id);
        return indexA - indexB;
    });

    const exportData = approvedActiveMembers.map(m => {
        const realIndex = state.members.findIndex(member => member.id === m.id) + 1;
        const displayNum = String(realIndex).padStart(2, '0');
        const dueAmount = calculateMemberTotalDue(m.id);

        return {
            'সদস্য নম্বর': `সদস্য নং- ${displayNum}`,
            'নাম': m.name || '',
            'মোবাইল': m.phone || '',
            'বকেয়া চাঁদা (৳)': dueAmount
        };
    });

    if (typeof XLSX === 'undefined') {
        alert("এক্সেল লাইব্রেরি লোড হয়নি, অনুগ্রহ করে পেজটি রিফ্রেশ করুন।");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for clean readability
    worksheet['!cols'] = [
        { wch: 18 }, // সদস্য নম্বর
        { wch: 28 }, // নাম
        { wch: 18 }, // মোবাইল
        { wch: 20 }  // বকেয়া চাঁদা (৳)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'সদস্য তালিকা');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Member_List_${dateStr}.xlsx`);
}

