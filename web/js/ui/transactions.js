import { apiCall } from '../api.js';
import { showToast } from './toast.js';
import { getState } from '../state.js';
import { queueAction } from '../store.js';

export async function renderTransactions() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="flex-center p-4"><div class="loader">Loading...</div></div>';

    try {
        const token = localStorage.getItem('token');
        const [transRes, membersRes] = await Promise.all([
            apiCall('/transactions/list', 'GET', null, token),
            apiCall('/group/members', 'GET', null, token)
        ]);

        const myBalance = parseFloat(transRes.my_balance);
        const transactions = transRes.transactions;
        const balances = transRes.balances;
        const members = membersRes.members;

        // Calculate total expenses for current month
        const currentUser = getState().user;
        const myTransactions = transactions.filter(t => t.user_id === currentUser.id);
        
        // Get current month's transactions
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Kolkata' });
        
        const currentMonthTransactions = myTransactions.filter(t => {
            const transDate = new Date(t.created_at);
            return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
        });
        
        const totalExpenses = currentMonthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);


        // Calculate total debt and surplus first
        let totalDebt = 0;
        let totalSurplus = 0;
        
        if (balances && balances.length > 0) {
            balances.forEach(balance => {
                const amount = parseFloat(balance.balance);
                if (amount > 0) {
                    totalSurplus += amount;
                } else if (amount < 0) {
                    totalDebt += Math.abs(amount);
                }
            });
        }

        let html = `
            <div class="fade-in" style="padding-bottom: 80px;">
                <!-- Debt & Surplus Stats -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                    <!-- Debt (Red) -->
                    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); border-radius: var(--radius-lg); padding: 16px; color: white; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(238, 90, 111, 0.3);">
                        <div style="display: flex; align-items: center; gap: 8px; opacity: 0.9; font-size: 0.9rem; font-weight: 600;">
                            <i class="ph-bold ph-trend-down"></i> You Owe
                        </div>
                        <div style="font-size: 1.5rem; font-weight: 800;">₹${totalDebt.toFixed(0)}</div>
                    </div>
                    
                    <!-- Surplus (Green) -->
                    <div style="background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%); border-radius: var(--radius-lg); padding: 16px; color: white; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(55, 178, 77, 0.3);">
                        <div style="display: flex; align-items: center; gap: 8px; opacity: 0.9; font-size: 0.9rem; font-weight: 600;">
                            <i class="ph-bold ph-trend-up"></i> Owed to You
                        </div>
                        <div style="font-size: 1.5rem; font-weight: 800;">₹${totalSurplus.toFixed(0)}</div>
                    </div>
                </div>

                <!-- Total Expenses Card -->
                <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); cursor: pointer; position: relative; margin-bottom: 32px; padding: 24px;" onclick="app.navigate('expense-analytics')">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="color: rgba(255,255,255,0.9); font-size: 0.95rem; margin-bottom: 8px;">${currentMonthName} Expense</div>
                            <div style="font-size: 2.8rem; font-weight: 700; color: white; margin-bottom: 8px;">
                                ₹${totalExpenses.toFixed(2)}
                            </div>
                        </div>
                        <div style="width: 52px; height: 52px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.6rem;">
                            <i class="ph ph-chart-line"></i>
                        </div>
                    </div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-top: 4px;">
                        Click to view detailed analytics →
                    </div>
                </div>

                <!-- Individual Balances -->
                <div class="card" style="margin-bottom: 28px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="font-size: 1.15rem; margin: 0; color: var(--text-primary); font-weight: 600;">Balance Breakdown</h3>
                        <button id="recalculate-btn" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 8px 14px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85rem; transition: all var(--transition-fast);">
                            <i class="ph ph-arrows-clockwise"></i>
                            <span>Recalculate</span>
                        </button>
                    </div>
        `;

        // Show individual balances
        if (balances && balances.length > 0) {
            balances.forEach(balance => {
                const amount = parseFloat(balance.balance);
                if (amount === 0) return; // Skip zero balances

                // Find the user name by matching ID
                let userName = 'Unknown User';
                if (balance.other_user_id) {
                    const member = members.find(m => m.id === balance.other_user_id);
                    userName = member ? member.name : 'Unknown User';
                } else if (balance.other_user_name) {
                    userName = balance.other_user_name;
                } else if (balance.user_name) {
                    userName = balance.user_name;
                }

                const isOwed = amount > 0;
                const color = isOwed ? 'var(--success)' : 'var(--danger)';
                const icon = isOwed ? '↑' : '↓';
                const text = isOwed ? 'owes you' : 'you owe';

                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--bg-tertiary);">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="width: 42px; height: 42px; border-radius: 50%; background: ${color}20; display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${color}; font-size: 1.1rem;">
                                ${userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 1.05rem; margin-bottom: 2px;">${userName}</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">${text}</div>
                            </div>
                        </div>
                        <div style="font-size: 1.3rem; font-weight: 700; color: ${color};">
                            ${icon} ₹${Math.abs(amount).toFixed(2)}
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<p style="color: var(--text-secondary); margin: 0; padding: 20px 0; text-align: center;">All settled up! 🎉</p>';
        }

        html += `
                </div>

                <!-- Add Button -->
                <button id="add-expense-btn" class="btn btn-primary" style="margin-bottom: 28px; padding: 14px 24px; font-size: 1rem;">
                    <span style="margin-right: 8px;">+</span> Add Expense
                </button>

                <!-- Recent List -->
                <h3 style="margin-bottom: 20px; font-size: 1.3rem; color: var(--text-primary);">Recent Expenses</h3>
                <div class="transactions-list">
        `;

        // Show all group transactions
        if (transactions.length === 0) {
            html += '<p style="color: var(--text-secondary); padding: 20px 0; text-align: center;">No expenses added yet.</p>';
        } else {
            transactions.forEach(t => {
                const splitBetween = t.split_between ? JSON.parse(t.split_between) : [];
                const splitBetweenNames = splitBetween.map(id => {
                    const member = members.find(m => m.id === id);
                    return member ? member.name : 'Unknown';
                }).join(', ');
                
                // Find the payer's name
                const payer = members.find(m => m.id === t.user_id);
                const payerName = payer ? payer.name : 'Unknown';
                const isPaidByCurrentUser = t.user_id === currentUser.id;
                
                html += `
                    <div class="card transaction-item" 
                         data-id="${t.id}"
                         data-description="${t.description}"
                         data-amount="${t.amount}"
                         data-payer="${payerName}"
                         data-split-between='${JSON.stringify(splitBetween)}'
                         data-split-names="${splitBetweenNames}"
                         data-date="${t.created_at}"
                         style="padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                         onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 4px; color: var(--text-primary);">${t.description}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Paid by ${isPaidByCurrentUser ? 'You' : payerName}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="font-weight: 700; color: var(--text-primary); font-size: 1.15rem;">₹${parseFloat(t.amount).toFixed(2)}</div>
                            ${isPaidByCurrentUser ? `<button class="delete-transaction-btn" data-id="${t.id}" style="background: var(--danger); color: white; border: none; padding: 8px 14px; border-radius: var(--radius-md); cursor: pointer; font-size: 0.9rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="event.stopPropagation()">
                                <i class="ph ph-trash"></i>
                            </button>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        html += '</div></div>';
        
        // Add custom delete confirmation modal
        html += `
            <div id="delete-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 9999; align-items: center; justify-content: center;">
                <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); animation: slideIn 0.3s ease-out;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--danger); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
                            <i class="ph ph-warning"></i>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 1.25rem; color: var(--text-primary);">Delete Expense?</h3>
                        </div>
                    </div>
                    <p style="color: var(--text-secondary); margin: 0 0 24px 0; line-height: 1.5;">
                        Are you sure you want to delete this expense? This will reverse all balance changes. This action cannot be undone.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="cancel-delete-btn" class="btn" style="background: var(--bg-input); color: var(--text-primary);">Cancel</button>
                        <button id="confirm-delete-btn" class="btn" style="background: var(--danger); color: white;">Delete</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add expense detail modal
        html += `
            <div id="expense-detail-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 9999; align-items: center; justify-content: center;">
                <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; max-width: 450px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); animation: slideIn 0.3s ease-out;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <h3 style="margin: 0; font-size: 1.4rem; color: var(--text-primary);">Expense Details</h3>
                        <button id="close-detail-modal" style="background: none; border: none; font-size: 1.5rem; color: var(--text-secondary); cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='none'">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>
                    
                    <div id="expense-detail-content" style="display: flex; flex-direction: column; gap: 20px;">
                        <!-- Content will be populated dynamically -->
                    </div>
                </div>
            </div>
        `;
        
        // Add expense modal
        html += `
            <div id="add-expense-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 9999; align-items: center; justify-content: center; overflow-y: auto; padding: 20px;">
                <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; max-width: 500px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); animation: slideIn 0.3s ease-out; margin: auto;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <h3 style="margin: 0; font-size: 1.5rem; color: var(--text-primary);">Add New Expense</h3>
                        <button id="close-add-modal" style="background: none; border: none; font-size: 1.5rem; color: var(--text-secondary); cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='none'">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>
                    
                    <div class="input-group">
                        <input type="text" id="desc" class="input-field" placeholder="Description (e.g. Milk)" style="margin-bottom: 16px;">
                    </div>
                    
                    <div class="input-group">
                        <input type="number" id="amount" class="input-field" placeholder="Amount (₹)" style="margin-bottom: 16px;">
                    </div>
                    
                    <div class="input-group">
                        <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px; display: block; font-weight: 600;">Split between:</label>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 12px; font-style: italic; padding: 8px; background: var(--bg-input); border-radius: var(--radius-sm);">
                            💡 Select one person = they owe you full amount | Select multiple = split equally
                        </div>
                        <div id="user-checkboxes" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding: 4px;">
        `;

        members.forEach(member => {
            const isChecked = member.id !== currentUser.id;
            html += `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; border-radius: var(--radius-md); background: var(--bg-input); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='var(--bg-input)'">
                    <input type="checkbox" class="user-checkbox" value="${member.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">${member.name}${member.id === currentUser.id ? ' (You)' : ''}</span>
                </label>
            `;
        });

        html += `
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                        <button id="cancel-expense" class="btn" style="background: var(--bg-input); color: var(--text-primary);">Cancel</button>
                        <button id="save-expense" class="btn btn-primary">Save Expense</button>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;

        // Handlers
        const addExpenseModal = document.getElementById('add-expense-modal');
        const addBtn = document.getElementById('add-expense-btn');
        const cancelBtn = document.getElementById('cancel-expense');
        const closeModalBtn = document.getElementById('close-add-modal');
        const saveBtn = document.getElementById('save-expense');

        // Show modal when add button is clicked
        addBtn.addEventListener('click', () => {
            addExpenseModal.style.display = 'flex';
        });

        // Close modal handlers
        const closeModal = () => {
            addExpenseModal.style.display = 'none';
            // Reset form
            document.getElementById('desc').value = '';
            document.getElementById('amount').value = '';
            // Reset checkboxes: uncheck yourself, check others
            document.querySelectorAll('.user-checkbox').forEach(cb => {
                cb.checked = (parseInt(cb.value) !== currentUser.id);
            });
        };

        cancelBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);

        // Close modal when clicking outside
        addExpenseModal.addEventListener('click', (e) => {
            if (e.target === addExpenseModal) {
                closeModal();
            }
        });

        saveBtn.addEventListener('click', async () => {
            const desc = document.getElementById('desc').value;
            const amount = document.getElementById('amount').value;

            // Get selected user IDs
            const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
                .map(cb => parseInt(cb.value));

            if (!desc || !amount) return showToast('Please fill all fields', 'error');
            if (selectedUsers.length === 0) return showToast('Please select at least one user', 'error');

            const payload = {
                description: desc,
                amount,
                split_between: selectedUsers
            };

            // Offline Handling
            if (!navigator.onLine) {
                // 1. Optimistic UI Update (Instant)
                const list = document.querySelector('.transactions-list');
                const tempHtml = `
                    <div class="card mb-2" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--warning);">
                        <div>
                            <div style="font-weight: 600;">${desc}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Paid by You (Pending Sync)</div>
                        </div>
                        <div style="font-weight: 700; color: var(--text-primary);">₹${parseFloat(amount).toFixed(2)}</div>
                    </div>
                `;

                if (list.innerHTML.includes('No transactions yet')) {
                    list.innerHTML = tempHtml;
                } else {
                    list.innerHTML = tempHtml + list.innerHTML;
                }

                // Close modal and reset form
                closeModal();

                showToast('Saved offline. Will sync when online.', 'warning');

                // 2. Queue in background
                queueAction('/transactions/add', 'POST', payload).catch(e => {
                    console.error('Failed to queue offline action', e);
                    // Fallback to localStorage
                    const offline = JSON.parse(localStorage.getItem('offline_transactions') || '[]');
                    offline.push(payload);
                    localStorage.setItem('offline_transactions', JSON.stringify(offline));
                });

                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                const token = localStorage.getItem('token');
                await apiCall('/transactions/add', 'POST', payload, token);
                showToast('Expense Added', 'success');
                renderTransactions(); // Refresh
            } catch (e) {
                showToast(e.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        });

        // Delete Transaction Handlers with Custom Modal
        const deleteModal = document.getElementById('delete-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        let pendingDeleteId = null;
        let pendingDeleteButton = null;

        // Show modal when delete button is clicked
        document.querySelectorAll('.delete-transaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                pendingDeleteId = e.currentTarget.getAttribute('data-id');
                pendingDeleteButton = e.currentTarget;
                deleteModal.style.display = 'flex';
            });
        });

        // Cancel deletion
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.style.display = 'none';
            pendingDeleteId = null;
            pendingDeleteButton = null;
        });

        // Close modal when clicking outside
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
                pendingDeleteId = null;
                pendingDeleteButton = null;
            }
        });

        // Confirm deletion
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!pendingDeleteId || !pendingDeleteButton) return;

            const originalText = pendingDeleteButton.innerHTML;
            pendingDeleteButton.disabled = true;
            pendingDeleteButton.innerHTML = '<i class="ph ph-spinner"></i>';
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Deleting...';

            try {
                const token = localStorage.getItem('token');
                await apiCall('/transactions/delete', 'POST', { transaction_id: parseInt(pendingDeleteId) }, token);
                showToast('Expense deleted successfully', 'success');
                deleteModal.style.display = 'none';
                renderTransactions(); // Refresh the page
            } catch (e) {
                showToast(e.message || 'Failed to delete expense', 'error');
                pendingDeleteButton.disabled = false;
                pendingDeleteButton.innerHTML = originalText;
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.textContent = 'Delete';
                deleteModal.style.display = 'none';
            }
        });

        // Expense Detail Modal Handlers
        const expenseDetailModal = document.getElementById('expense-detail-modal');
        const closeDetailBtn = document.getElementById('close-detail-modal');
        const expenseDetailContent = document.getElementById('expense-detail-content');

        // Show detail modal when clicking on a transaction
        document.querySelectorAll('.transaction-item').forEach(item => {
            item.addEventListener('click', () => {
                const description = item.getAttribute('data-description');
                const amount = parseFloat(item.getAttribute('data-amount'));
                const payer = item.getAttribute('data-payer');
                const splitBetween = JSON.parse(item.getAttribute('data-split-between'));
                const splitNames = item.getAttribute('data-split-names');
                const date = new Date(item.getAttribute('data-date'));
                const formattedDate = date.toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Kolkata'
                });

                // Calculate split amount
                const splitAmount = splitBetween.length > 0 ? (amount / splitBetween.length) : amount;

                // Build split details
                let splitDetails = '';
                if (splitBetween.length === 0) {
                    splitDetails = '<div style="color: var(--text-secondary); font-style: italic;">No split information available</div>';
                } else {
                    splitDetails = splitBetween.map(id => {
                        const member = members.find(m => m.id === id);
                        const memberName = member ? member.name : 'Unknown';
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-input); border-radius: var(--radius-sm);">
                                <div style="font-weight: 500; color: var(--text-primary);">${memberName}</div>
                                <div style="font-weight: 600; color: var(--text-primary);">₹${splitAmount.toFixed(2)}</div>
                            </div>
                        `;
                    }).join('');
                }

                expenseDetailContent.innerHTML = `
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: var(--radius-md); color: white;">
                        <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">${description}</div>
                        <div style="font-size: 2.2rem; font-weight: 700;">₹${amount.toFixed(2)}</div>
                    </div>

                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">PAID BY</div>
                        <div style="padding: 12px 16px; background: var(--bg-input); border-radius: var(--radius-md);">
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 1.05rem;">${payer}</div>
                        </div>
                    </div>

                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">SPLIT BETWEEN</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${splitDetails}
                        </div>
                    </div>

                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600;">DATE & TIME</div>
                        <div style="padding: 12px 16px; background: var(--bg-input); border-radius: var(--radius-md);">
                            <div style="color: var(--text-primary);">${formattedDate}</div>
                        </div>
                    </div>
                `;

                expenseDetailModal.style.display = 'flex';
            });
        });

        // Close detail modal
        closeDetailBtn.addEventListener('click', () => {
            expenseDetailModal.style.display = 'none';
        });

        // Close when clicking outside
        expenseDetailModal.addEventListener('click', (e) => {
            if (e.target === expenseDetailModal) {
                expenseDetailModal.style.display = 'none';
            }
        });

        // Recalculate Balance Handler
        const recalculateBtn = document.getElementById('recalculate-btn');
        if (recalculateBtn) {
            recalculateBtn.addEventListener('click', async () => {
                const originalHTML = recalculateBtn.innerHTML;
                recalculateBtn.innerHTML = '<i class="ph ph-spinner"></i><span>Recalculating...</span>';
                recalculateBtn.disabled = true;

                try {
                    const token = localStorage.getItem('token');
                    const response = await apiCall('/transactions/recalculate', 'POST', null, token);
                    
                    if (response.message) {
                        showToast(response.message + ` (${response.transactions_processed} transactions)`, 'success');
                        // Refresh the page
                        setTimeout(() => {
                            renderTransactions();
                        }, 500);
                    }
                } catch (error) {
                    showToast('Failed to recalculate: ' + error.message, 'error');
                    recalculateBtn.innerHTML = originalHTML;
                    recalculateBtn.disabled = false;
                }
            });
        }

    } catch (error) {
        container.innerHTML = `
            <div class="card" style="border-left: 4px solid var(--danger); animation: fadeIn 0.3s ease-out;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="ph ph-warning-circle" style="font-size: 2rem; color: var(--danger);"></i>
                    <div style="flex: 1;">
                        <h3 style="margin: 0; font-weight: 600; color: var(--text-primary);">An Error Occurred</h3>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">${error.message}</p>
                    </div>
                </div>
            </div>
        `;
    }
}
