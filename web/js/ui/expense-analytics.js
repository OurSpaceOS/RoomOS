import { apiCall } from '../api.js';
import { getState } from '../state.js';

// Category definitions with icons and colors
const CATEGORIES = {
    'food': { icon: 'ph-hamburger', color: '#f59e0b', label: 'Food & Dining' },
    'groceries': { icon: 'ph-shopping-cart', color: '#10b981', label: 'Groceries' },
    'transport': { icon: 'ph-car', color: '#3b82f6', label: 'Transport' },
    'utilities': { icon: 'ph-lightning', color: '#8b5cf6', label: 'Utilities' },
    'entertainment': { icon: 'ph-film-strip', color: '#ec4899', label: 'Entertainment' },
    'shopping': { icon: 'ph-bag', color: '#06b6d4', label: 'Shopping' },
    'health': { icon: 'ph-heart-pulse', color: '#ef4444', label: 'Health' },
    'rent': { icon: 'ph-house', color: '#6366f1', label: 'Rent & Housing' },
    'other': { icon: 'ph-dots-three', color: '#64748b', label: 'Other' }
};

// Detect category from description
function detectCategory(description) {
    const desc = description.toLowerCase();
    if (desc.includes('food') || desc.includes('lunch') || desc.includes('dinner') || desc.includes('breakfast') || desc.includes('restaurant') || desc.includes('cafe') || desc.includes('pizza') || desc.includes('burger')) return 'food';
    if (desc.includes('grocery') || desc.includes('vegetables') || desc.includes('milk') || desc.includes('bread') || desc.includes('eggs')) return 'groceries';
    if (desc.includes('uber') || desc.includes('ola') || desc.includes('taxi') || desc.includes('petrol') || desc.includes('fuel') || desc.includes('gas') || desc.includes('transport') || desc.includes('metro') || desc.includes('bus')) return 'transport';
    if (desc.includes('electric') || desc.includes('water') || desc.includes('wifi') || desc.includes('internet') || desc.includes('bill') || desc.includes('recharge')) return 'utilities';
    if (desc.includes('movie') || desc.includes('netflix') || desc.includes('spotify') || desc.includes('game') || desc.includes('concert')) return 'entertainment';
    if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shop') || desc.includes('clothes') || desc.includes('shoes')) return 'shopping';
    if (desc.includes('medicine') || desc.includes('doctor') || desc.includes('hospital') || desc.includes('pharmacy')) return 'health';
    if (desc.includes('rent') || desc.includes('deposit') || desc.includes('maintenance')) return 'rent';
    return 'other';
}

// Animated counter function
function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    const formatNumber = (num) => '₹' + num.toFixed(2);
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeOutQuart;
        
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Render skeleton loader
function renderSkeleton() {
    return `
        <div class="fade-in" style="padding-bottom: 80px;">
            <!-- Header Skeleton -->
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--bg-tertiary); animation: pulse 1.5s infinite;"></div>
                <div style="width: 180px; height: 28px; border-radius: 8px; background: var(--bg-tertiary); animation: pulse 1.5s infinite;"></div>
            </div>
            
            <!-- Cards Skeleton -->
            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
                <div style="flex: 1 1 140px; min-width: 140px; height: 120px; border-radius: 16px; background: var(--bg-tertiary); animation: pulse 1.5s infinite;"></div>
                <div style="flex: 1 1 140px; min-width: 140px; height: 120px; border-radius: 16px; background: var(--bg-tertiary); animation: pulse 1.5s infinite;"></div>
            </div>
            
            <!-- Chart Skeleton -->
            <div style="height: 200px; border-radius: 16px; background: var(--bg-tertiary); margin-bottom: 24px; animation: pulse 1.5s infinite; display: flex; align-items: center; justify-content: center;">
                <div style="width: 140px; height: 140px; border-radius: 50%; background: var(--bg-secondary); animation: pulse 1.5s infinite;"></div>
            </div>
            
            <!-- Category Skeleton -->
            <div style="height: 24px; width: 150px; border-radius: 8px; background: var(--bg-tertiary); margin-bottom: 16px; animation: pulse 1.5s infinite;"></div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-bottom: 24px;">
                ${[1,2,3,4].map(() => `<div style="height: 80px; border-radius: 12px; background: var(--bg-tertiary); animation: pulse 1.5s infinite;"></div>`).join('')}
            </div>
            
            <!-- Monthly Skeleton -->
            <div style="height: 24px; width: 180px; border-radius: 8px; background: var(--bg-tertiary); margin-bottom: 16px; animation: pulse 1.5s infinite;"></div>
            ${[1,2].map(() => `<div style="height: 100px; border-radius: 16px; background: var(--bg-tertiary); margin-bottom: 16px; animation: pulse 1.5s infinite;"></div>`).join('')}
        </div>
        
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.7; }
            }
        </style>
    `;
}

// Create SVG donut chart
function createDonutChart(shared, personal, total) {
    if (total === 0) {
        return `
            <div style="display: flex; align-items: center; justify-content: center; height: 180px; color: var(--text-tertiary);">
                No expenses to display
            </div>
        `;
    }
    
    const sharedPercent = (shared / total) * 100;
    const personalPercent = (personal / total) * 100;
    
    // SVG donut chart
    const size = 160;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    const sharedDash = (sharedPercent / 100) * circumference;
    const personalDash = (personalPercent / 100) * circumference;
    
    return `
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; padding: 16px 0;">
            <!-- Donut Chart -->
            <div style="position: relative; width: ${size}px; height: ${size}px;">
                <svg width="${size}" height="${size}" style="transform: rotate(-90deg);">
                    <!-- Background circle -->
                    <circle cx="${size/2}" cy="${size/2}" r="${radius}" 
                            fill="none" stroke="var(--bg-tertiary)" stroke-width="${strokeWidth}"/>
                    
                    <!-- Shared segment (purple) -->
                    <circle cx="${size/2}" cy="${size/2}" r="${radius}"
                            fill="none" stroke="url(#sharedGradient)" stroke-width="${strokeWidth}"
                            stroke-dasharray="${sharedDash} ${circumference}"
                            stroke-linecap="round"
                            class="donut-segment"
                            style="animation: donutFill 1s ease-out forwards;"/>
                    
                    <!-- Personal segment (pink) -->
                    <circle cx="${size/2}" cy="${size/2}" r="${radius}"
                            fill="none" stroke="url(#personalGradient)" stroke-width="${strokeWidth}"
                            stroke-dasharray="${personalDash} ${circumference}"
                            stroke-dashoffset="${-sharedDash}"
                            stroke-linecap="round"
                            class="donut-segment"
                            style="animation: donutFill 1s ease-out 0.3s forwards; opacity: 0;"/>
                    
                    <!-- Gradients -->
                    <defs>
                        <linearGradient id="sharedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#667eea"/>
                            <stop offset="100%" stop-color="#764ba2"/>
                        </linearGradient>
                        <linearGradient id="personalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#f093fb"/>
                            <stop offset="100%" stop-color="#f5576c"/>
                        </linearGradient>
                    </defs>
                </svg>
                
                <!-- Center text -->
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px;">Total</div>
                    <div id="chart-total" style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">₹0</div>
                </div>
            </div>
            
            <!-- Legend -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 14px; height: 14px; border-radius: 4px; background: linear-gradient(135deg, #667eea, #764ba2);"></div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">Shared</div>
                        <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">${sharedPercent.toFixed(1)}%</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 14px; height: 14px; border-radius: 4px; background: linear-gradient(135deg, #f093fb, #f5576c);"></div>
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">Personal</div>
                        <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">${personalPercent.toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            @keyframes donutFill {
                from { stroke-dasharray: 0 ${circumference}; opacity: 1; }
                to { opacity: 1; }
            }
        </style>
    `;
}

export async function renderExpenseAnalytics() {
    const container = document.getElementById('view-container');
    
    // Show skeleton loader
    container.innerHTML = renderSkeleton();

    try {
        const token = localStorage.getItem('token');
        const [transRes, membersRes] = await Promise.all([
            apiCall('/transactions/list', 'GET', null, token),
            apiCall('/group/members', 'GET', null, token)
        ]);
        
        const transactions = transRes.transactions;
        const members = membersRes.members;
        const balances = transRes.balances || []; // Get balance data (who owes whom)
        const currentUser = getState().user;
        
        // Calculate total pending amount (what others owe you - shown in red)
        const totalPendingFromOthers = balances
            .filter(b => b.balance > 0) // Positive means they owe you
            .reduce((sum, b) => sum + parseFloat(b.balance), 0);
        
        // Filter transactions where current user is in the split_between array (privacy)
        const myTransactions = transactions.filter(t => {
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            return splitBetween.includes(currentUser.id);
        });
        
        // Separate into SHARED vs PERSONAL vs SETTLEMENTS
        const sharedExpenses = [];
        const personalExpenses = [];
        const settlements = []; // New: track settlement transactions
        const categoryTotals = {};
        
        myTransactions.forEach(t => {
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            const myShare = splitBetween.length > 0 ? parseFloat(t.amount) / splitBetween.length : 0;
            const isPersonal = (t.user_id === currentUser.id) && (splitBetween.length === 1) && (splitBetween[0] === currentUser.id);
            
            // Settlement detection:
            // 1. I paid to only ONE other person (not me) - I'm settling up with them
            // 2. Someone else paid and split_between only has me - they're settling up with me
            const isSettlement = (splitBetween.length === 1) && (splitBetween[0] !== t.user_id);
            const isSettlementByMe = isSettlement && (t.user_id === currentUser.id);
            const isSettlementToMe = isSettlement && (splitBetween[0] === currentUser.id) && (t.user_id !== currentUser.id);
            
            const category = detectCategory(t.description);
            
            if (isSettlementByMe || isSettlementToMe) {
                // This is a settlement - don't count as expense
                const otherPersonId = isSettlementByMe ? splitBetween[0] : t.user_id;
                const otherPerson = members.find(m => m.id === otherPersonId);
                settlements.push({
                    ...t, 
                    myShare: parseFloat(t.amount), 
                    isSettlement: true,
                    settlementType: isSettlementByMe ? 'paid' : 'received',
                    otherPerson: otherPerson ? otherPerson.name : 'Unknown',
                    otherPersonId
                });
            } else {
                // Regular expense - track in category totals
                if (!categoryTotals[category]) {
                    categoryTotals[category] = 0;
                }
                categoryTotals[category] += myShare;
                
                const transactionWithShare = {...t, myShare, isPersonal, category};
                
                if (isPersonal) {
                    personalExpenses.push(transactionWithShare);
                } else {
                    sharedExpenses.push(transactionWithShare);
                }
            }
        });
        
        // Calculate totals
        const totalShared = sharedExpenses.reduce((sum, t) => sum + t.myShare, 0);
        const totalPersonal = personalExpenses.reduce((sum, t) => sum + t.myShare, 0);
        const totalExpenses = totalShared + totalPersonal;
        
        // Sort categories by total
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6); // Top 6 categories
        
        // Generate consistent colors and profile pictures for each user
        const userColors = {};
        const userProfilePics = {};
        const uploadsBaseUrl = 'https://prospine.in/roomOS/server/uploads/';
        const colorPalette = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c', 
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#fa709a', '#fee140', '#30cfd0', '#330867'
        ];
        members.forEach((member, index) => {
            userColors[member.id] = colorPalette[index % colorPalette.length];
            // Construct full URL from filename
            userProfilePics[member.id] = member.profile_picture 
                ? uploadsBaseUrl + member.profile_picture 
                : null;
        });
        
        // Group ALL transactions by month (EXCLUDING settlements)
        const monthlyData = {};
        myTransactions.forEach(t => {
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            const isPersonal = (t.user_id === currentUser.id) && (splitBetween.length === 1) && (splitBetween[0] === currentUser.id);
            
            // Skip settlements from monthly expense data
            const isSettlement = (splitBetween.length === 1) && (splitBetween[0] !== t.user_id);
            if (isSettlement) return; // Don't include settlements in monthly breakdown
            
            const date = new Date(t.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    name: monthName,
                    total: 0,
                    shared: [],
                    personal: []
                };
            }
            
            const myShare = splitBetween.length > 0 ? parseFloat(t.amount) / splitBetween.length : 0;
            
            monthlyData[monthKey].total += myShare;
            
            if (isPersonal) {
                monthlyData[monthKey].personal.push({...t, myShare});
            } else {
                monthlyData[monthKey].shared.push({...t, myShare});
            }
        });
        
        // Sort months in descending order (newest first)
        const sortedMonths = Object.keys(monthlyData).sort().reverse();
        
        let html = `
            <div class="fade-in" style="padding-bottom: 80px;">

                <!-- ═══════════════════════════════════════════════════════ -->
                <!-- SECTION: Expense Distribution Chart (MOVED UP) -->
                <!-- ═══════════════════════════════════════════════════════ -->
                <div class="card" style="padding: 20px; margin-bottom: 24px; background: var(--bg-card);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="ph ph-chart-pie-slice" style="color: var(--text-secondary);"></i>
                        <span style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Expense Distribution</span>
                    </div>
                    ${createDonutChart(totalShared, totalPersonal, totalExpenses)}
                </div>

                <!-- Your Expense Summary (MOVED DOWN) -->
                <div class="card" style="
                    background: var(--bg-card);
                    padding: 20px;
                    margin-bottom: 24px;
                    border: 1px solid var(--border-subtle);
                ">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <i class="ph ph-wallet" style="color: var(--accent-primary); font-size: 1.2rem;"></i>
                        <span style="color: var(--text-primary); font-size: 1rem; font-weight: 600;">Your Expense Summary</span>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Gross Expense -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-input); border-radius: 10px;">
                            <span style="color: var(--text-secondary); font-size: 0.9rem;">Total Expenses (Your Share)</span>
                            <span style="color: var(--text-primary); font-weight: 700; font-size: 1.1rem;">₹${totalExpenses.toFixed(2)}</span>
                        </div>
                        
                        ${totalPendingFromOthers > 0 ? `
                        <!-- Pending Returns (Red) -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 10px; border: 1px dashed #ef4444;">
                            <span style="color: #ef4444; font-size: 0.9rem; font-weight: 500;">⏳ Pending from Others</span>
                            <span style="color: #ef4444; font-weight: 700; font-size: 1.1rem;">- ₹${totalPendingFromOthers.toFixed(2)}</span>
                        </div>
                        
                        <!-- Net Expense (Green) -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.15)); border-radius: 10px; border: 1px solid #10b981;">
                            <span style="color: #10b981; font-size: 1rem; font-weight: 600;">✓ Your Actual Expense</span>
                            <span style="color: #10b981; font-weight: 800; font-size: 1.3rem;">₹${(totalExpenses - totalPendingFromOthers).toFixed(2)}</span>
                        </div>
                        ` : `
                        <!-- All Settled -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.15)); border-radius: 10px; border: 1px solid #10b981;">
                            <span style="color: #10b981; font-size: 1rem; font-weight: 600;">✓ All Settled Up!</span>
                            <span style="color: #10b981; font-weight: 800; font-size: 1.3rem;">₹${totalExpenses.toFixed(2)}</span>
                        </div>
                        `}
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════ -->
                <!-- SECTION: Quick Stats (Shared vs Personal) with Month Filter -->
                <!-- ═══════════════════════════════════════════════════════ -->
                
                <!-- Premium Custom Month/Year Dropdown -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="
                            width: 36px;
                            height: 36px;
                            border-radius: 10px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                        ">
                            <i class="ph ph-chart-bar" style="color: white; font-size: 1.1rem;"></i>
                        </div>
                        <span style="color: var(--text-primary); font-size: 1.05rem; font-weight: 700;">Quick Stats</span>
                    </div>
                    
                    <!-- Custom Dropdown Container -->
                    <div id="custom-month-dropdown" style="position: relative; z-index: 50;">
                        <!-- Dropdown Trigger Button -->
                        <button id="month-dropdown-trigger" type="button" style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
                            border: 1px solid rgba(102, 126, 234, 0.3);
                            border-radius: 12px;
                            padding: 10px 14px;
                            cursor: pointer;
                            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                            min-width: 160px;
                        " onclick="window.toggleMonthDropdown()">
                            <i class="ph ph-calendar-blank" style="color: #667eea; font-size: 1rem;"></i>
                            <span id="selected-month-text" style="
                                color: var(--text-primary);
                                font-size: 0.85rem;
                                font-weight: 600;
                                flex: 1;
                                text-align: left;
                            ">All Time</span>
                            <i id="dropdown-arrow" class="ph ph-caret-down" style="
                                color: #667eea;
                                font-size: 0.8rem;
                                transition: transform 0.25s ease;
                            "></i>
                        </button>
                        
                        <!-- Dropdown Menu -->
                        <div id="month-dropdown-menu" style="
                            position: absolute;
                            top: calc(100% + 8px);
                            right: 0;
                            min-width: 200px;
                            max-height: 280px;
                            overflow-y: auto;
                            background: var(--bg-card);
                            backdrop-filter: blur(30px) saturate(180%);
                            -webkit-backdrop-filter: blur(30px) saturate(180%);
                            border: 1px solid var(--border-medium);
                            border-radius: 16px;
                            padding: 8px;
                            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.05);
                            opacity: 0;
                            visibility: hidden;
                            transform: translateY(-10px) scale(0.95);
                            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                        ">
                            <!-- All Time Option -->
                            <div class="month-option" data-value="all" onclick="window.selectMonth('all', 'All Time')" style="
                                display: flex;
                                align-items: center;
                                gap: 12px;
                                padding: 12px 14px;
                                border-radius: 10px;
                                cursor: pointer;
                                transition: all 0.15s ease;
                                background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
                                margin-bottom: 4px;
                            ">
                                <i class="ph ph-infinity" style="color: #667eea; font-size: 1.1rem;"></i>
                                <span style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem;">All Time</span>
                                <i id="check-all" class="ph-fill ph-check-circle" style="color: #667eea; font-size: 1rem; margin-left: auto;"></i>
                            </div>
                            
                            <div style="height: 1px; background: var(--border-subtle); margin: 8px 0;"></div>
                            
                            <!-- Month Options -->
                            ${sortedMonths.map((monthKey, index) => {
                                const month = monthlyData[monthKey];
                                const [year, monthNum] = monthKey.split('-');
                                const monthShort = new Date(year, parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short' });
                                return `
                                    <div class="month-option" data-value="${monthKey}" onclick="window.selectMonth('${monthKey}', '${month.name}')" style="
                                        display: flex;
                                        align-items: center;
                                        gap: 12px;
                                        padding: 11px 14px;
                                        border-radius: 10px;
                                        cursor: pointer;
                                        transition: all 0.15s ease;
                                        ${index < sortedMonths.length - 1 ? 'margin-bottom: 4px;' : ''}
                                    "
                                    onmouseover="this.style.background='var(--bg-elevated)'"
                                    onmouseout="this.style.background='transparent'">
                                        <div style="
                                            width: 32px;
                                            height: 32px;
                                            border-radius: 8px;
                                            background: var(--bg-tertiary);
                                            display: flex;
                                            flex-direction: column;
                                            align-items: center;
                                            justify-content: center;
                                            flex-shrink: 0;
                                        ">
                                            <span style="font-size: 0.55rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; line-height: 1;">${monthShort}</span>
                                            <span style="font-size: 0.75rem; color: var(--text-primary); font-weight: 800; line-height: 1;">${year.slice(-2)}</span>
                                        </div>
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="color: var(--text-primary); font-weight: 600; font-size: 0.85rem;">${month.name}</div>
                                            <div style="color: var(--text-tertiary); font-size: 0.7rem;">${month.shared.length + month.personal.length} expenses</div>
                                        </div>
                                        <i id="check-${monthKey}" class="ph-fill ph-check-circle" style="color: #667eea; font-size: 1rem; opacity: 0; transition: opacity 0.15s;"></i>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
                
                <style>
                    #month-dropdown-trigger:hover {
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%) !important;
                        border-color: rgba(102, 126, 234, 0.5) !important;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
                    }
                    #month-dropdown-menu::-webkit-scrollbar {
                        width: 6px;
                    }
                    #month-dropdown-menu::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    #month-dropdown-menu::-webkit-scrollbar-thumb {
                        background: var(--border-medium);
                        border-radius: 3px;
                    }
                </style>
                
                <div id="filtered-stats-container" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
                    <!-- Shared Expenses Card -->
                    <div class="card expense-summary-card" style="
                        flex: 1 1 140px;
                        min-width: 140px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 16px;
                        position: relative;
                        overflow: hidden;
                        border: 1px solid rgba(255,255,255,0.15);
                        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
                        margin-bottom: 0;
                    ">
                        <div style="position: absolute; top: -15px; right: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: relative; z-index: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                                <i class="ph ph-users" style="color: rgba(255,255,255,0.9); font-size: 1rem;"></i>
                                <span style="color: rgba(255,255,255,0.95); font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Shared</span>
                            </div>
                            <div id="shared-amount" style="font-size: 1.4rem; font-weight: 800; color: white; margin-bottom: 4px;">₹0</div>
                            <div id="shared-count" style="color: rgba(255,255,255,0.8); font-size: 0.7rem;">${sharedExpenses.length} expense${sharedExpenses.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    
                    <!-- Personal Expenses Card -->
                    <div class="card expense-summary-card" style="
                        flex: 1 1 140px;
                        min-width: 140px;
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        padding: 16px;
                        position: relative;
                        overflow: hidden;
                        border: 1px solid rgba(255,255,255,0.15);
                        box-shadow: 0 4px 20px rgba(245, 87, 108, 0.2);
                        margin-bottom: 0;
                    ">
                        <div style="position: absolute; top: -15px; right: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: relative; z-index: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                                <i class="ph ph-user" style="color: rgba(255,255,255,0.9); font-size: 1rem;"></i>
                                <span style="color: rgba(255,255,255,0.95); font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Personal</span>
                            </div>
                            <div id="personal-amount" style="font-size: 1.4rem; font-weight: 800; color: white; margin-bottom: 4px;">₹0</div>
                            <div id="personal-count" style="color: rgba(255,255,255,0.8); font-size: 0.7rem;">${personalExpenses.length} expense${personalExpenses.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    
                    <!-- Settlements Quick Card -->
                    <div id="settlements-quick-card" class="card" style="
                        flex: 1 1 140px;
                        min-width: 140px;
                        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
                        padding: 16px;
                        position: relative;
                        overflow: hidden;
                        border: 1px solid rgba(255,255,255,0.15);
                        box-shadow: 0 4px 20px rgba(6, 182, 212, 0.2);
                        margin-bottom: 0;
                        display: ${settlements.length > 0 ? 'block' : 'none'};
                    ">
                        <div style="position: absolute; top: -15px; right: -15px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: relative; z-index: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                                <i class="ph ph-handshake" style="color: rgba(255,255,255,0.9); font-size: 1rem;"></i>
                                <span style="color: rgba(255,255,255,0.95); font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Settlements</span>
                            </div>
                            <div id="settlements-amount" style="font-size: 1.4rem; font-weight: 800; color: white; margin-bottom: 4px;">₹${settlements.reduce((sum, s) => sum + parseFloat(s.amount), 0).toFixed(0)}</div>
                            <div id="settlements-count" style="color: rgba(255,255,255,0.8); font-size: 0.7rem;">${settlements.length} transfer${settlements.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
                
                <!-- ═══════════════════════════════════════════════════════ -->
                <!-- SECTION: Pending Returns Alert (only if someone owes you) -->
                <!-- ═══════════════════════════════════════════════════════ -->
                ${totalPendingFromOthers > 0 ? `
                <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 14px 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: #ef4444; display: flex; align-items: center; justify-content: center;">
                            <i class="ph ph-warning" style="color: white; font-size: 1rem;"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.85rem; font-weight: 600; color: #ef4444;">Pending Returns</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${balances.filter(b => b.balance > 0).map(b => b.other_user_name).join(', ')}</div>
                        </div>
                    </div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #ef4444;">₹${totalPendingFromOthers.toFixed(0)}</div>
                </div>
                ` : ''}
                
                <!-- ═══════════════════════════════════════════════════════ -->
                <!-- SECTION: Settlements History (collapsible) -->
                <!-- ═══════════════════════════════════════════════════════ -->
                ${settlements.length > 0 ? `
                <div class="card" style="padding: 0; margin-bottom: 24px; background: var(--bg-card); overflow: hidden;">
                    <div style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-bottom: 1px solid var(--border-subtle);" onclick="const el = document.getElementById('settlements-list'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; this.querySelector('.toggle-icon').style.transform = el.style.display === 'none' ? 'rotate(0deg)' : 'rotate(180deg)';">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="ph ph-handshake" style="color: #06b6d4; font-size: 1.1rem;"></i>
                            <span style="color: var(--text-primary); font-size: 0.95rem; font-weight: 600;">Settlement History</span>
                            <span style="background: #06b6d420; color: #06b6d4; padding: 2px 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 600;">${settlements.length}</span>
                        </div>
                        <i class="ph ph-caret-down toggle-icon" style="color: var(--text-tertiary); transition: transform 0.2s;"></i>
                    </div>
                    <div id="settlements-list" style="display: none; padding: 16px 20px;">
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 12px; padding: 8px 10px; background: var(--bg-input); border-radius: 8px;">
                            💰 1-to-1 payments for settling up. These don't count as expenses.
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
                            ${settlements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(s => {
                                const date = new Date(s.created_at);
                                const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
                                const isPaid = s.settlementType === 'paid';
                                const badgeColor = isPaid ? '#10b981' : '#3b82f6';
                                const icon = isPaid ? 'ph-arrow-up-right' : 'ph-arrow-down-left';
                                
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-input); border-radius: 10px; border-left: 3px solid ${badgeColor};">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <i class="ph ${icon}" style="color: ${badgeColor}; font-size: 0.9rem;"></i>
                                            <div>
                                                <div style="font-weight: 500; color: var(--text-primary); font-size: 0.85rem;">${s.description}</div>
                                                <div style="font-size: 0.7rem; color: var(--text-tertiary);">${formattedDate} • ${isPaid ? 'To' : 'From'} ${s.otherPerson}</div>
                                            </div>
                                        </div>
                                        <div style="font-weight: 600; color: ${badgeColor}; font-size: 0.9rem;">₹${parseFloat(s.amount).toFixed(0)}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- Category Breakdown -->
                ${sortedCategories.length > 0 ? `
                    <div style="margin-bottom: 28px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                            <i class="ph ph-tag" style="color: var(--text-secondary);"></i>
                            <span style="color: var(--text-primary); font-size: 1.1rem; font-weight: 600;">Top Categories</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px;">
                            ${sortedCategories.map(([cat, amount]) => {
                                const catInfo = CATEGORIES[cat] || CATEGORIES.other;
                                const percent = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(0) : 0;
                                return `
                                    <div class="card" style="padding: 14px; text-align: center; margin-bottom: 0; background: var(--bg-card);">
                                        <div style="width: 40px; height: 40px; border-radius: 12px; background: ${catInfo.color}20; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                                            <i class="ph ${catInfo.icon}" style="font-size: 1.2rem; color: ${catInfo.color};"></i>
                                        </div>
                                        <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${catInfo.label}</div>
                                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">₹${amount.toFixed(0)}</div>
                                        <div style="font-size: 0.65rem; color: ${catInfo.color}; font-weight: 600;">${percent}%</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Monthly Breakdown -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <i class="ph ph-calendar" style="color: var(--text-secondary);"></i>
                    <span style="color: var(--text-primary); font-size: 1.1rem; font-weight: 600;">Monthly Breakdown</span>
                </div>
                
                ${sortedMonths.length === 0 ? '<p style="color: var(--text-secondary); padding: 20px 0; text-align: center;">No expenses recorded yet.</p>' : ''}
                
                ${sortedMonths.map(monthKey => {
                    const month = monthlyData[monthKey];
                    const percentage = totalExpenses > 0 ? ((month.total / totalExpenses) * 100).toFixed(1) : 0;
                    const totalCount = month.shared.length + month.personal.length;
                    
                    return `
                        <div class="card" style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 16px; padding: 18px;" 
                             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" 
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                             onclick="const el = document.getElementById('month-${monthKey}'); el.style.display = el.style.display === 'none' ? 'block' : 'none'">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div>
                                    <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 4px;">${month.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${totalCount} expense${totalCount !== 1 ? 's' : ''} (${month.shared.length} shared, ${month.personal.length} personal)</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 700; font-size: 1.2rem; color: var(--text-primary); margin-bottom: 2px;">₹${month.total.toFixed(2)}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${percentage}%</div>
                                </div>
                            </div>
                            
                            <!-- Progress Bar -->
                            <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 3px; transition: width 0.5s ease;"></div>
                            </div>
                            
                            <!-- Expandable Content -->
                            <div id="month-${monthKey}" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
                                ${month.shared.length > 0 ? `
                                    <h4 style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 12px 0; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                        <span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 10px; border-radius: 10px; font-size: 0.7rem;">Shared</span>
                                        ${month.shared.length} expense${month.shared.length !== 1 ? 's' : ''}
                                    </h4>
                                    ${month.shared.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(t => {
                                        const date = new Date(t.created_at);
                                        const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
                                        const payer = members.find(m => m.id === t.user_id);
                                        const payerName = payer ? payer.name : 'Unknown';
                                        const payerColor = userColors[t.user_id] || '#667eea';
                                        const payerProfilePic = userProfilePics[t.user_id];
                                        const payerInitials = payerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                        const isPaidByMe = t.user_id === currentUser.id;
                                        
                                        // Avatar content - profile pic or initials
                                        const avatarContent = payerProfilePic 
                                            ? `<img src="${payerProfilePic}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="${payerName}">`
                                            : payerInitials;
                                        
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-input); border-radius: 12px; margin-bottom: 8px; border-left: 3px solid ${payerColor};">
                                                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                                                    <div style="width: 34px; height: 34px; border-radius: 50%; background: ${payerColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; overflow: hidden;">
                                                        ${avatarContent}
                                                    </div>
                                                    <div style="min-width: 0; flex: 1;">
                                                        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.description}</div>
                                                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${formattedDate} • ${isPaidByMe ? 'You' : payerName}</div>
                                                    </div>
                                                </div>
                                                <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
                                                    <div style="font-weight: 700; color: var(--text-primary); font-size: 1rem;">₹${t.myShare.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                ` : ''}
                                
                                ${month.personal.length > 0 ? `
                                    <h4 style="font-size: 0.85rem; color: var(--text-secondary); margin: ${month.shared.length > 0 ? '16px' : '0'} 0 12px 0; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                        <span style="background: linear-gradient(135deg, #f093fb, #f5576c); color: white; padding: 4px 10px; border-radius: 10px; font-size: 0.7rem;">Personal</span>
                                        ${month.personal.length} expense${month.personal.length !== 1 ? 's' : ''}
                                    </h4>
                                    ${month.personal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(t => {
                                        const date = new Date(t.created_at);
                                        const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
                                        const payerColor = userColors[currentUser.id] || '#f093fb';
                                        const payerProfilePic = userProfilePics[currentUser.id];
                                        const payerInitials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                        
                                        // Avatar content - profile pic or initials
                                        const avatarContent = payerProfilePic 
                                            ? `<img src="${payerProfilePic}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="You">`
                                            : payerInitials;
                                        
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-input); border-radius: 12px; margin-bottom: 8px; border-left: 3px solid ${payerColor};">
                                                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                                                    <div style="width: 34px; height: 34px; border-radius: 50%; background: ${payerColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; overflow: hidden;">
                                                        ${avatarContent}
                                                    </div>
                                                    <div style="min-width: 0; flex: 1;">
                                                        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.description}</div>
                                                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${formattedDate} • Personal</div>
                                                    </div>
                                                </div>
                                                <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
                                                    <div style="font-weight: 700; color: var(--text-primary); font-size: 1rem;">₹${t.myShare.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = html;
        
        // Store data for filtering
        window.expenseFilterData = {
            sharedExpenses,
            personalExpenses,
            settlements,
            monthlyData,
            totalShared,
            totalPersonal,
            currentUser
        };
        
        // Define filter function for month selection
        window.filterExpensesByMonth = function(monthKey) {
            const data = window.expenseFilterData;
            if (!data) return;
            
            let filteredShared, filteredPersonal, filteredSettlements;
            
            if (monthKey === 'all') {
                // Show all time data
                filteredShared = data.sharedExpenses;
                filteredPersonal = data.personalExpenses;
                filteredSettlements = data.settlements;
            } else {
                // Filter by selected month
                const filterByMonth = (transactions) => {
                    return transactions.filter(t => {
                        const date = new Date(t.created_at);
                        const tMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        return tMonthKey === monthKey;
                    });
                };
                
                filteredShared = filterByMonth(data.sharedExpenses);
                filteredPersonal = filterByMonth(data.personalExpenses);
                filteredSettlements = filterByMonth(data.settlements);
            }
            
            // Calculate totals
            const sharedTotal = filteredShared.reduce((sum, t) => sum + t.myShare, 0);
            const personalTotal = filteredPersonal.reduce((sum, t) => sum + t.myShare, 0);
            const settlementsTotal = filteredSettlements.reduce((sum, s) => sum + parseFloat(s.amount), 0);
            
            // Update amounts with animation
            const sharedAmountEl = document.getElementById('shared-amount');
            const personalAmountEl = document.getElementById('personal-amount');
            const settlementsAmountEl = document.getElementById('settlements-amount');
            
            if (sharedAmountEl) sharedAmountEl.textContent = '₹' + sharedTotal.toFixed(2);
            if (personalAmountEl) personalAmountEl.textContent = '₹' + personalTotal.toFixed(2);
            if (settlementsAmountEl) settlementsAmountEl.textContent = '₹' + settlementsTotal.toFixed(0);
            
            // Update counts
            const sharedCountEl = document.getElementById('shared-count');
            const personalCountEl = document.getElementById('personal-count');
            const settlementsCountEl = document.getElementById('settlements-count');
            const settlementsCard = document.getElementById('settlements-quick-card');
            
            if (sharedCountEl) sharedCountEl.textContent = `${filteredShared.length} expense${filteredShared.length !== 1 ? 's' : ''}`;
            if (personalCountEl) personalCountEl.textContent = `${filteredPersonal.length} expense${filteredPersonal.length !== 1 ? 's' : ''}`;
            if (settlementsCountEl) settlementsCountEl.textContent = `${filteredSettlements.length} transfer${filteredSettlements.length !== 1 ? 's' : ''}`;
            
            // Show/hide settlements card based on data
            if (settlementsCard) {
                settlementsCard.style.display = filteredSettlements.length > 0 ? 'block' : 'none';
            }
        };
        
        // Custom dropdown toggle function
        window.toggleMonthDropdown = function() {
            const menu = document.getElementById('month-dropdown-menu');
            const arrow = document.getElementById('dropdown-arrow');
            if (!menu) return;
            
            const isOpen = menu.style.visibility === 'visible';
            
            if (isOpen) {
                // Close
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(-10px) scale(0.95)';
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            } else {
                // Open
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.transform = 'translateY(0) scale(1)';
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }
        };
        
        // Select month function
        window.selectMonth = function(value, label) {
            // Update selected text
            const selectedText = document.getElementById('selected-month-text');
            if (selectedText) selectedText.textContent = label;
            
            // Update checkmarks
            document.querySelectorAll('[id^="check-"]').forEach(el => {
                el.style.opacity = '0';
            });
            const activeCheck = document.getElementById(`check-${value}`);
            if (activeCheck) activeCheck.style.opacity = '1';
            
            // Update option backgrounds
            document.querySelectorAll('.month-option').forEach(el => {
                if (el.dataset.value === value) {
                    el.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)';
                } else {
                    el.style.background = 'transparent';
                }
            });
            
            // Close dropdown
            window.toggleMonthDropdown();
            
            // Apply filter
            window.filterExpensesByMonth(value);
        };
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('custom-month-dropdown');
            const menu = document.getElementById('month-dropdown-menu');
            if (dropdown && menu && !dropdown.contains(e.target)) {
                if (menu.style.visibility === 'visible') {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                    menu.style.transform = 'translateY(-10px) scale(0.95)';
                    const arrow = document.getElementById('dropdown-arrow');
                    if (arrow) arrow.style.transform = 'rotate(0deg)';
                }
            }
        });
        
        // Animate numbers after render
        setTimeout(() => {
            animateValue('shared-amount', 0, totalShared, 1000);
            animateValue('personal-amount', 0, totalPersonal, 1000);
            animateValue('chart-total', 0, totalExpenses, 1200);
        }, 100);

    } catch (error) {
        container.innerHTML = `<div class="p-4" style="color: var(--danger)">Error: ${error.message}</div>`;
    }
}
