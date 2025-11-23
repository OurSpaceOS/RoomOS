import { apiCall } from '../api.js';
import { showToast } from './toast.js';

let dateTimeInterval = null;

export async function renderDashboard() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="flex-center p-4"><div class="loader">Loading...</div></div>';

    if (dateTimeInterval) {
        clearInterval(dateTimeInterval);
    }

    try {
        const token = localStorage.getItem('token');
        // Parallel fetch: Roster (Today) + Tasks (Today)
        const [rosterRes, tasksRes] = await Promise.all([
            apiCall('/roster/today', 'GET', null, token),
            apiCall('/tasks/today', 'GET', null, token)
        ]);

        const day = rosterRes.day;
        const tasks = tasksRes.tasks;

        // Parse Roster Data
        let morning = [], night = [], passengerM = '', passengerN = '';

        if (day) {
            morning = JSON.parse(day.morning || '[]');
            night = JSON.parse(day.night || '[]');
            passengerM = day.passenger_m || '';
            passengerN = day.passenger_n || '';
        }

        // Normalize to {n: name, t: time} format
        morning = morning.map(x => typeof x === 'string' ? { n: x, t: '' } : x);
        night = night.map(x => typeof x === 'string' ? { n: x, t: '' } : x);

        // Determine Current Shift (Morning < 4PM)
        const h = parseInt(new Date().toLocaleTimeString('en-GB', { timeZone: "Asia/Kolkata", hour: '2-digit', hour12: false }), 10);
        const isMorn = h < 16;
        const activeTeam = isMorn ? morning : night;
        const activePassenger = isMorn ? passengerM : passengerN;
        const badgeClass = isMorn ? 'badge-m' : 'badge-n';
        const badgeText = isMorn ? '☀️ MORNING' : '🌙 NIGHT';

        // Helper for names
        const teamNames = activeTeam.length ? activeTeam.map(x => x.n).join(' + ') : 'No One Assigned';

        let html = `
            <div class="fade-in" style="padding-bottom: 80px;">
                <!-- Live Protocol -->
                <div class="card">
                    <h2>Live Protocol</h2>
                    <div id="live-datetime" style="display: flex; justify-content: center; gap: 8px; margin-top: 20px; margin-bottom: 20px; flex-wrap: wrap;"></div>
                    <span class="status-big" id="dash-status">${teamNames}</span>
                    <div class="status-row">
                        <span style="font-size:0.85rem; color:var(--text-secondary)">Active Team (Cook+Clean)</span>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                </div>

                <!-- Passenger -->
                <div class="card">
                    <h2>Passenger (Off-Duty)</h2>
                    <span class="status-big" id="passenger-name">${activePassenger || 'Not Set'}</span>
                    <div class="status-row">
                        <span style="font-size:0.85rem; color:var(--text-secondary)">Relaxing / Sleeping / Class</span>
                    </div>
                </div>

                <!-- Tasks / Lottery -->
                <div class="card">
                    <h2>Today's Micro-Tasks</h2>
                    <div id="dash-task-container">
                        ${renderTasksOrLottery(tasks)}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Start live date-time display
        const dateTimeEle = document.getElementById('live-datetime');
        if (dateTimeEle) {
            const updateTime = () => {
                const now = new Date();
                const day = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
                const date = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'long', day: 'numeric' });
                const time = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

                dateTimeEle.innerHTML = `
                    <span style="
                        background: var(--bg-elevated);
                        padding: 6px 12px;
                        border-radius: var(--radius-full);
                        font-size: 0.85rem;
                        font-weight: 600;
                        color: var(--text-secondary);
                    ">${day}</span>
                    <span style="
                        background: var(--bg-elevated);
                        padding: 6px 12px;
                        border-radius: var(--radius-full);
                        font-size: 0.85rem;
                        font-weight: 600;
                        color: var(--text-secondary);
                    ">${date}</span>
                    <span style="
                        background: var(--accent-gradient);
                        padding: 6px 12px;
                        border-radius: var(--radius-full);
                        font-size: 0.85rem;
                        font-weight: 700;
                        color: white;
                    ">${time}</span>
                `;
            };
            updateTime();
            dateTimeInterval = setInterval(updateTime, 1000);
        }

        // Attach Event Listener for Lottery
        const btn = document.getElementById('lottery-draw-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.innerText = '🎲 SPINNING...';
                try {
                    const res = await apiCall('/tasks/assign', 'POST', null, token);
                    // Refresh view
                    renderDashboard();
                    showToast('Tasks Assigned!', 'success');
                } catch (e) {
                    showToast(e.message, 'error');
                    btn.disabled = false;
                    btn.innerText = '🎲 SPIN THE WHEEL';
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

function renderTasksOrLottery(tasks) {
    if (tasks && tasks.length > 0) {
        // Render List
        let html = '';
        tasks.forEach(t => {
            html += `
                <div class="dash-task-row">
                    <span style="color:var(--text-secondary)">${t.task_name}</span>
                    <span style="font-weight:600">${t.assigned_to_name}</span>
                </div>
            `;
        });
        return html;
    } else {
        // Render Lottery Button
        return `
            <div style="text-align:center; padding:10px 0;">
                <button id="lottery-draw-btn" class="btn-primary" style="width:100%; padding:15px; font-size:1.1rem; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); border:none; box-shadow: 0 4px 15px rgba(0,122,255,0.3);">
                    🎲 SPIN THE WHEEL
                </button>
                <p style="margin-top:15px; font-size:0.8rem; color:var(--text-secondary);">
                    Tap to assign Brooming, Water, Trash & Market.
                </p>
            </div>
        `;
    }
}

export function stopDashboardUpdates() {
    if (dateTimeInterval) {
        clearInterval(dateTimeInterval);
        dateTimeInterval = null;
    }
}
