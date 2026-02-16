import { apiCall } from '../api.js';
import { showToast } from './toast.js';
import { dashboardSkeleton } from './skeleton.js';
import { getMaidDashboardSummary, preloadForDashboard } from './rules.js';

let dateTimeInterval = null;

export async function renderDashboard() {
    const container = document.getElementById('view-container');
    container.innerHTML = dashboardSkeleton();

    if (dateTimeInterval) {
        clearInterval(dateTimeInterval);
    }

    try {
        const token = localStorage.getItem('token');
        // Parallel fetch: Roster (Week) + Tasks (Today)
        // We fetch the whole week to determine "Today" based on CLIENT timezone (India), not server timezone (Poland)
        const [rosterRes, tasksRes] = await Promise.all([
            apiCall('/roster/week', 'GET', null, token),
            apiCall('/tasks/today', 'GET', null, token)
        ]);

        // Determine correct day index for India (IST)
        const dayMap = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6 };
        const todayName = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
        const dayIndex = dayMap[todayName];

        const roster = rosterRes.roster || [];
        const day = roster.find(d => d.day_index === dayIndex) || {};
        const tasks = tasksRes.tasks;

        // Parse Roster Data
        let morning = [], night = [], passengerM = '', passengerN = '';

        if (day && day.morning) {
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

        // Get maid attendance summary for dashboard (fetch from server)
        await preloadForDashboard();
        const maidSummary = getMaidDashboardSummary();

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

                <!-- Maid Attendance Summary -->
                ${maidSummary ? `
                <div class="card" style="cursor: pointer; overflow: hidden; position: relative;" onclick="app.navigate('rules')">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--accent-gradient);"></div>
                    <h2 style="display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-md);">
                        <i class="ph ph-calendar-check" style="font-size: 1.2rem; color: var(--accent-primary);"></i>
                        Maid Attendance
                        <span style="margin-left: auto; font-size: 0.75rem; font-weight: 500; color: var(--text-tertiary);">${maidSummary.month}</span>
                    </h2>
                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <div style="flex:1; text-align:center; padding: 10px 6px; background: var(--bg-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                            <div style="font-size: 1.2rem; font-weight: 800;">${maidSummary.daysCame}<span style="font-size:0.8rem; font-weight:600; color:var(--text-tertiary);">/${maidSummary.totalDays}</span></div>
                            <div style="font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600; margin-top: 2px;">Days</div>
                        </div>
                        <div style="flex:1; text-align:center; padding: 10px 6px; background: var(--bg-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                            <div style="font-size: 1.2rem; font-weight: 800;">₹${maidSummary.total}</div>
                            <div style="font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600; margin-top: 2px;">Total</div>
                        </div>
                        <div style="flex:1; text-align:center; padding: 10px 6px; background: rgba(16,185,129,0.1); border-radius: var(--radius-md); border: 1px solid rgba(16,185,129,0.25);">
                            <div style="font-size: 1.2rem; font-weight: 800; color: var(--success);">₹${maidSummary.perPerson}</div>
                            <div style="font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600; margin-top: 2px;">Per Person</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.78rem; color: var(--text-tertiary);">
                        <span>☀️ ${maidSummary.mornings} AM</span>
                        <span style="width:3px;height:3px;border-radius:50%;background:var(--text-tertiary);"></span>
                        <span>🌙 ${maidSummary.evenings} PM</span>
                        <span style="width:3px;height:3px;border-radius:50%;background:var(--text-tertiary);"></span>
                        <span>÷ ${maidSummary.split}</span>
                    </div>
                    <div style="text-align: center; margin-top: 8px;">
                        <span style="font-size: 0.72rem; color: var(--text-tertiary);">Tap for details →</span>
                    </div>
                </div>
                ` : `
                <div class="card" style="cursor: pointer; text-align: center;" onclick="app.navigate('rules')">
                    <i class="ph ph-calendar-check" style="font-size: 2.5rem; color: var(--accent-primary); opacity: 0.5;"></i>
                    <p style="margin-top: var(--space-sm); color: var(--text-tertiary); font-size: 0.9rem;">No maid attendance tracked yet</p>
                    <p style="font-size: 0.8rem; color: var(--text-tertiary);">Tap to start tracking →</p>
                </div>
                `}

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
