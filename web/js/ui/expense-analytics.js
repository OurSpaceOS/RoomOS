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
        const currentUser = getState().user;
        
        // Filter transactions where current user is in the split_between array (privacy)
        const myTransactions = transactions.filter(t => {
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            return splitBetween.includes(currentUser.id);
        });
        
        // Separate into SHARED vs PERSONAL expenses and categorize
        const sharedExpenses = [];
        const personalExpenses = [];
        const categoryTotals = {};
        
        myTransactions.forEach(t => {
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            const myShare = splitBetween.length > 0 ? parseFloat(t.amount) / splitBetween.length : 0;
            const isPersonal = (t.user_id === currentUser.id) && (splitBetween.length === 1) && (splitBetween[0] === currentUser.id);
            const category = detectCategory(t.description);
            
            // Track category totals
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
        
        // Group ALL transactions by month
        const monthlyData = {};
        myTransactions.forEach(t => {
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
            
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            const myShare = splitBetween.length > 0 ? parseFloat(t.amount) / splitBetween.length : 0;
            const isPersonal = (t.user_id === currentUser.id) && (splitBetween.length === 1) && (splitBetween[0] === currentUser.id);
            
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
                <!-- Header with Back Button -->
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 28px;">
                    <button onclick="app.navigate('transactions')" class="icon-btn" style="background: var(--bg-input); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-subtle);">
                        <i class="ph ph-arrow-left"></i>
                    </button>
                    <div>
                        <h2 style="margin: 0; color: var(--text-primary); font-size: 1.5rem; font-weight: 700;">Analytics</h2>
                        <p style="margin: 0; color: var(--text-tertiary); font-size: 0.8rem;">${myTransactions.length} transactions analyzed</p>
                    </div>
                </div>

                <!-- Expense Type Summary Cards -->
                <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
                    <!-- Shared Expenses Card -->
                    <div class="card expense-summary-card" style="
                        flex: 1 1 140px;
                        min-width: 140px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 18px;
                        position: relative;
                        overflow: hidden;
                        border: 1px solid rgba(255,255,255,0.15);
                        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25);
                        margin-bottom: 0;
                    ">
                        <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: absolute; bottom: -10px; left: -10px; width: 50px; height: 50px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                        <div style="position: relative; z-index: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
                                <i class="ph ph-users" style="color: rgba(255,255,255,0.9); font-size: 1.1rem;"></i>
                                <span style="color: rgba(255,255,255,0.95); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Shared</span>
                            </div>
                            <div id="shared-amount" style="font-size: clamp(1.3rem, 5vw, 1.8rem); font-weight: 800; color: white; margin-bottom: 8px; line-height: 1.1;">
                                ₹0
                            </div>
                            <div style="color: rgba(255,255,255,0.85); font-size: 0.75rem; display: flex; align-items: center; gap: 6px;">
                                <span style="background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 10px; font-weight: 600;">${sharedExpenses.length}</span>
                                <span>expense${sharedExpenses.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Personal Expenses Card -->
                    <div class="card expense-summary-card" style="
                        flex: 1 1 140px;
                        min-width: 140px;
                        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        padding: 18px;
                        position: relative;
                        overflow: hidden;
                        border: 1px solid rgba(255,255,255,0.15);
                        box-shadow: 0 8px 32px rgba(245, 87, 108, 0.25);
                        margin-bottom: 0;
                    ">
                        <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: absolute; bottom: -10px; left: -10px; width: 50px; height: 50px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                        <div style="position: relative; z-index: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
                                <i class="ph ph-user" style="color: rgba(255,255,255,0.9); font-size: 1.1rem;"></i>
                                <span style="color: rgba(255,255,255,0.95); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Personal</span>
                            </div>
                            <div id="personal-amount" style="font-size: clamp(1.3rem, 5vw, 1.8rem); font-weight: 800; color: white; margin-bottom: 8px; line-height: 1.1;">
                                ₹0
                            </div>
                            <div style="color: rgba(255,255,255,0.85); font-size: 0.75rem; display: flex; align-items: center; gap: 6px;">
                                <span style="background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 10px; font-weight: 600;">${personalExpenses.length}</span>
                                <span>• Private</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Donut Chart Card -->
                <div class="card" style="padding: 20px; margin-bottom: 24px; background: var(--bg-card);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="ph ph-chart-pie-slice" style="color: var(--text-secondary);"></i>
                        <span style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Expense Distribution</span>
                    </div>
                    ${createDonutChart(totalShared, totalPersonal, totalExpenses)}
                </div>
                
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
