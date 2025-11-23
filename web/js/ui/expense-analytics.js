import { apiCall } from '../api.js';
import { getState } from '../state.js';

export async function renderExpenseAnalytics() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="flex-center p-4"><div class="loader">Loading...</div></div>';

    try {
        const token = localStorage.getItem('token');
        const [transRes, membersRes] = await Promise.all([
            apiCall('/transactions/list', 'GET', null, token),
            apiCall('/group/members', 'GET', null, token)
        ]);
        
        const transactions = transRes.transactions;
        const members = membersRes.members;
        const currentUser = getState().user;
        
        // Filter transactions where current user is in the split_between array
        const myTransactions = transactions.filter(t => {
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            return splitBetween.includes(currentUser.id);
        });
        
        // Calculate total expenses (user's share only)
        let totalExpenses = 0;
        myTransactions.forEach(t => {
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            const myShare = splitBetween.length > 0 ? parseFloat(t.amount) / splitBetween.length : 0;
            totalExpenses += myShare;
        });
        
        // Group transactions by month
        const monthlyData = {};
        myTransactions.forEach(t => {
            const date = new Date(t.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    name: monthName,
                    total: 0,
                    transactions: []
                };
            }
            
            const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
            const myShare = splitBetween.length > 0 ? parseFloat(t.amount) / splitBetween.length : 0;
            monthlyData[monthKey].total += myShare;
            monthlyData[monthKey].transactions.push({...t, myShare});
        });
        
        // Sort months in descending order (newest first)
        const sortedMonths = Object.keys(monthlyData).sort().reverse();
        
        let html = `
            <div class="fade-in" style="padding-bottom: 80px;">
                <!-- Header with Back Button -->
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                    <button onclick="app.navigate('transactions')" class="icon-btn" style="background: var(--bg-input); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="ph ph-arrow-left"></i>
                    </button>

                </div>

                <!-- Total Expenses Summary -->
                <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin-bottom: 32px; padding: 24px;">
                    <div style="color: rgba(255,255,255,0.9); font-size: 0.95rem; margin-bottom: 8px;">Your Share of Expenses (All Time)</div>
                    <div style="font-size: 2.8rem; font-weight: 700; color: white; margin-bottom: 8px;">
                        ₹${totalExpenses.toFixed(2)}
                    </div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">
                        ${myTransactions.length} expense${myTransactions.length !== 1 ? 's' : ''} you're part of
                    </div>
                </div>

                <!-- Monthly Breakdown -->
                <h3 style="color: var(--text-primary); margin-bottom: 20px; font-size: 1.3rem;">Monthly Breakdown</h3>
        `;

        if (sortedMonths.length === 0) {
            html += '<p style="color: var(--text-secondary); padding: 20px 0;">No expenses recorded yet.</p>';
        } else {
            sortedMonths.forEach(monthKey => {
                const month = monthlyData[monthKey];
                const percentage = ((month.total / totalExpenses) * 100).toFixed(1);
                
                html += `
                    <div class="card" style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 20px; padding: 20px;" 
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" 
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                         onclick="document.getElementById('month-${monthKey}').style.display = document.getElementById('month-${monthKey}').style.display === 'none' ? 'block' : 'none'">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div>
                                <div style="font-weight: 600; font-size: 1.15rem; color: var(--text-primary); margin-bottom: 4px;">${month.name}</div>
                                <div style="font-size: 0.9rem; color: var(--text-secondary);">${month.transactions.length} transaction${month.transactions.length !== 1 ? 's' : ''}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; font-size: 1.3rem; color: var(--text-primary); margin-bottom: 2px;">₹${month.total.toFixed(2)}</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">${percentage}% of total</div>
                            </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div style="width: 100%; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; margin-top: 12px;">
                            <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;"></div>
                        </div>
                        
                        <!-- Expandable Transaction List -->
                        <div id="month-${monthKey}" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--bg-tertiary);">
                            <h4 style="font-size: 0.95rem; color: var(--text-secondary); margin: 0 0 16px 0; font-weight: 600;">Transactions:</h4>
                `;
                
                // Sort transactions by date (newest first)
                month.transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                month.transactions.forEach(t => {
                    const date = new Date(t.created_at);
                    const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
                    
                    // Find who paid
                    const payer = members.find(m => m.id === t.user_id);
                    const payerName = payer ? payer.name : 'Unknown';
                    const isPaidByMe = t.user_id === currentUser.id;
                    
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: var(--bg-input); border-radius: var(--radius-md); margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px; font-size: 1rem;">${t.description}</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">${formattedDate} • Paid by ${isPaidByMe ? 'You' : payerName}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: var(--text-primary); font-size: 1.15rem;">₹${t.myShare.toFixed(2)}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">your share</div>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = `<div class="p-4" style="color: var(--danger)">Error: ${error.message}</div>`;
    }
}
