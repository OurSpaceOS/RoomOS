import { apiCall } from '../api.js';
import { showToast } from './toast.js';
import { dashboardSkeleton } from './skeleton.js';

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

        // Fetch group members for the dish spinner
        let members = [];
        try {
            const membersRes = await apiCall('/group/members', 'GET', null, token);
            members = membersRes.members || [];
        } catch (e) {
            console.error('Failed to fetch members for spinner:', e);
        }

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

                <!-- Dish Washer Spinner - Slot Machine Style -->
                <div class="card" style="overflow: hidden; background: linear-gradient(180deg, var(--bg-card) 0%, rgba(59, 130, 246, 0.05) 100%);">
                    <h2 style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">🍽️</span> 
                        Dish Duty Decider
                    </h2>
                    <div style="text-align: center; padding: 24px 0;">
                        
                        <!-- Slot Machine Display -->
                        <div style="
                            position: relative;
                            display: inline-block;
                            background: linear-gradient(145deg, var(--bg-secondary), var(--bg-tertiary));
                            border-radius: 20px;
                            padding: 24px 40px;
                            box-shadow: 
                                0 10px 40px rgba(0,0,0,0.3),
                                inset 0 2px 0 rgba(255,255,255,0.1),
                                inset 0 -2px 0 rgba(0,0,0,0.2);
                            border: 2px solid var(--border-medium);
                        ">
                            <!-- Decorative lights -->
                            <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px;">
                                ${[1,2,3,4,5].map(i => `<div class="slot-light" style="width: 10px; height: 10px; border-radius: 50%; background: ${['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF6B6B', '#FFE66D'][i-1]}; box-shadow: 0 0 8px ${['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF6B6B', '#FFE66D'][i-1]}; animation: blink ${0.3 + i * 0.1}s ease-in-out infinite alternate;"></div>`).join('')}
                            </div>
                            
                            <!-- Display Window -->
                            <div id="slot-display" style="
                                background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
                                border-radius: 12px;
                                padding: 20px 32px;
                                min-width: 180px;
                                box-shadow: 
                                    inset 0 4px 20px rgba(0,0,0,0.5),
                                    0 0 0 3px var(--border-subtle);
                                position: relative;
                                overflow: hidden;
                            ">
                                <!-- Glow effect -->
                                <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%); pointer-events: none;"></div>
                                
                                <div id="slot-name" style="
                                    font-size: 1.5rem;
                                    font-weight: 800;
                                    color: #4ECDC4;
                                    text-shadow: 0 0 20px rgba(78, 205, 196, 0.5), 0 0 40px rgba(78, 205, 196, 0.3);
                                    font-family: 'Courier New', monospace;
                                    letter-spacing: 2px;
                                    min-height: 36px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    ${members.length > 0 ? '? ? ?' : 'NO CREW'}
                                </div>
                            </div>
                            
                            <!-- Decorative bars -->
                            <div style="display: flex; justify-content: center; gap: 4px; margin-top: 12px;">
                                ${[1,2,3,4,5,6,7].map(() => `<div style="width: 8px; height: 4px; background: var(--accent-primary); border-radius: 2px; opacity: 0.6;"></div>`).join('')}
                            </div>
                        </div>
                        
                        <!-- Result Area -->
                        <div id="dish-result" style="margin-top: 24px; min-height: 60px;"></div>
                        
                        <!-- Spin Button -->
                        <button id="spin-dish-btn" style="
                            margin-top: 20px;
                            padding: 16px 48px;
                            font-size: 1.1rem;
                            font-weight: 700;
                            background: linear-gradient(145deg, #FF6B6B, #EE5A6F);
                            color: white;
                            border: none;
                            border-radius: 50px;
                            cursor: pointer;
                            box-shadow: 
                                0 6px 20px rgba(238, 90, 111, 0.4),
                                0 2px 0 rgba(255,255,255,0.2) inset;
                            transition: all 0.2s ease;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        " ${members.length === 0 ? 'disabled' : ''}>
                            🎰 Spin!
                        </button>
                        
                        <p style="margin-top: 16px; font-size: 0.8rem; color: var(--text-tertiary);">
                            Let fate decide who's on dish duty! ✨
                        </p>
                    </div>
                    
                    <style>
                        @keyframes blink {
                            0% { opacity: 0.4; transform: scale(0.9); }
                            100% { opacity: 1; transform: scale(1); }
                        }
                        #spin-dish-btn:hover:not(:disabled) {
                            transform: translateY(-2px);
                            box-shadow: 0 8px 25px rgba(238, 90, 111, 0.5);
                        }
                        #spin-dish-btn:active:not(:disabled) {
                            transform: translateY(0);
                        }
                        #spin-dish-btn:disabled {
                            opacity: 0.6;
                            cursor: not-allowed;
                        }
                        .slot-spinning {
                            animation: slotCycle 0.1s linear infinite;
                        }
                        @keyframes slotCycle {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.7; }
                        }
                    </style>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Dish Spinner Event Handler - Slot Machine Style
        const spinBtn = document.getElementById('spin-dish-btn');
        const slotName = document.getElementById('slot-name');
        const resultDiv = document.getElementById('dish-result');
        
        if (spinBtn && slotName && members.length > 0) {
            spinBtn.addEventListener('click', () => {
                spinBtn.disabled = true;
                spinBtn.innerHTML = '🎰 Spinning...';
                resultDiv.innerHTML = '';
                
                // Slot machine cycling effect
                let cycleCount = 0;
                const totalCycles = 25;
                
                // Weighted selection - admins have lower probability 😉
                // Build weighted array: regular members get 100% weight, admins get 30%
                const weightedMembers = [];
                members.forEach(m => {
                    const weight = m.role === 'admin' ? 1 : 3; // Admins 3x less likely
                    for (let i = 0; i < weight; i++) {
                        weightedMembers.push(m);
                    }
                });
                const selectedMember = weightedMembers[Math.floor(Math.random() * weightedMembers.length)];
                const selectedIndex = members.findIndex(m => m.id === selectedMember.id);
                
                const cycleInterval = setInterval(() => {
                    const randomMember = members[Math.floor(Math.random() * members.length)];
                    slotName.textContent = randomMember.name.split(' ')[0].toUpperCase();
                    slotName.classList.add('slot-spinning');
                    cycleCount++;
                    
                    if (cycleCount >= totalCycles) {
                        clearInterval(cycleInterval);
                        
                        // Final selection with dramatic pause
                        setTimeout(() => {
                            const winner = members[selectedIndex];
                            slotName.classList.remove('slot-spinning');
                            slotName.textContent = winner.name.toUpperCase();
                            slotName.style.color = '#10b981';
                            slotName.style.textShadow = '0 0 30px rgba(16, 185, 129, 0.8), 0 0 60px rgba(16, 185, 129, 0.4)';
                            
                            resultDiv.innerHTML = `
                                <div style="
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 12px;
                                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
                                    border: 2px solid #10b981;
                                    border-radius: 50px;
                                    padding: 12px 24px;
                                    animation: winnerPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                                ">
                                    <span style="font-size: 1.5rem;">🧽</span>
                                    <span style="font-weight: 700; color: #10b981; font-size: 1rem;">
                                        ${winner.name} is on dish duty!
                                    </span>
                                    <span style="font-size: 1.5rem;">✨</span>
                                </div>
                                <style>
                                    @keyframes winnerPop {
                                        0% { transform: scale(0) rotate(-10deg); opacity: 0; }
                                        60% { transform: scale(1.1) rotate(2deg); }
                                        100% { transform: scale(1) rotate(0); opacity: 1; }
                                    }
                                </style>
                            `;
                            
                            spinBtn.disabled = false;
                            spinBtn.innerHTML = '🎰 Spin Again!';
                            
                            // Reset slot display color after a delay
                            setTimeout(() => {
                                slotName.style.color = '#4ECDC4';
                                slotName.style.textShadow = '0 0 20px rgba(78, 205, 196, 0.5), 0 0 40px rgba(78, 205, 196, 0.3)';
                            }, 3000);
                        }, 300);
                    }
                }, 80 + cycleCount * 8); // Gradually slow down
            });
        }

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
