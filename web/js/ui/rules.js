/* ============================================
   MAID ATTENDANCE — Server-Backed, Mobile-First
   30-day billing cycle, shift-based cost.
   ============================================ */
import { apiCall } from '../api.js';
import { showToast } from './toast.js';

const MONTHS = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const CYCLE_DAYS = 30;

// ─── State ───
let state = {
    cycleOffset: 0,       // 0 = current cycle, -1 = previous, etc.
    att: {},
    config: { split: 4, rate: 1300, cycleStart: null }, // cycleStart = "YYYY-MM-DD"
    loading: true,
    saving: {}
};

function getToken() { return localStorage.getItem('token'); }

// Date helpers
function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDate(s) {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
}
function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}
function fmtShort(d) {
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
}
function fmtFull(d) {
    return `${DAY_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ─── Cycle Dates ───
function getCycleStart() {
    if (!state.config.cycleStart) return null;
    const base = parseDate(state.config.cycleStart);
    return addDays(base, state.cycleOffset * CYCLE_DAYS);
}
function getCycleEnd() {
    const start = getCycleStart();
    if (!start) return null;
    return addDays(start, CYCLE_DAYS - 1);
}
function getCycleDays() {
    const start = getCycleStart();
    if (!start) return [];
    const days = [];
    for (let i = 0; i < CYCLE_DAYS; i++) {
        days.push(addDays(start, i));
    }
    return days;
}

// ─── API ───
async function fetchCycle() {
    state.loading = true;
    state.att = {};
    render();

    const token = getToken();

    // First load config to know cycle start
    try {
        const cfgRes = await apiCall('/settings/group-get?key=maid_config', 'GET', null, token);
        if (cfgRes.value) {
            try {
                const c = typeof cfgRes.value === 'string' ? JSON.parse(cfgRes.value) : cfgRes.value;
                state.config = {
                    split: c.split || 4,
                    rate: c.rate || 1300,
                    cycleStart: c.cycleStart || null
                };
            } catch(err) {}
        }
    } catch(err) {
        if (err.message !== 'OFFLINE_QUEUED') showToast('Failed to load config', 'error');
    }

    // If no cycle start, show setup screen
    if (!state.config.cycleStart) {
        state.loading = false;
        render();
        return;
    }

    // Fetch attendance for this cycle's date range
    const start = getCycleStart();
    const end = getCycleEnd();
    try {
        const attRes = await apiCall(
            `/settings/group-get-range?key=maid_att&from=${fmtDate(start)}&to=${fmtDate(end)}`,
            'GET', null, token
        );
        if (attRes.entries) {
            attRes.entries.forEach(e => {
                try { state.att[e.date] = typeof e.value === 'string' ? JSON.parse(e.value) : e.value; }
                catch(err) {}
            });
        }
    } catch(err) {
        if (err.message !== 'OFFLINE_QUEUED') showToast('Failed to load attendance', 'error');
    }

    state.loading = false;
    render();
}

async function saveDay(dateKey, val) {
    state.saving[dateKey] = true;
    try {
        await apiCall('/settings/group-set', 'POST', { key: 'maid_att', value: val, date: dateKey }, getToken());
    } catch(err) {
        if (err.message !== 'OFFLINE_QUEUED') showToast('Failed to save', 'error');
    }
    delete state.saving[dateKey];
}

async function saveConfig() {
    try {
        await apiCall('/settings/group-set', 'POST', { key: 'maid_config', value: state.config }, getToken());
    } catch(err) {
        if (err.message !== 'OFFLINE_QUEUED') showToast('Failed to save settings', 'error');
    }
}

function toggle(dateKey, slot) {
    if (!state.att[dateKey]) state.att[dateKey] = { m: false, e: false };
    state.att[dateKey][slot] = !state.att[dateKey][slot];
    render();
    saveDay(dateKey, state.att[dateKey]);
}

function toggleFull(dateKey) {
    if (!state.att[dateKey]) state.att[dateKey] = { m: false, e: false };
    const a = state.att[dateKey];
    const allOn = a.m && a.e;
    state.att[dateKey] = { m: !allOn, e: !allOn };
    render();
    saveDay(dateKey, state.att[dateKey]);
}

// ─── Stats ───
function calcStats() {
    const totalShifts_possible = CYCLE_DAYS * 2;
    // rate = per-person monthly cost; total maid salary = rate × split
    const totalSalary = state.config.rate * state.config.split;
    const shiftRate = totalSalary / totalShifts_possible;
    let came = 0, mornings = 0, evenings = 0, totalShifts = 0;

    const days = getCycleDays();
    days.forEach(d => {
        const dk = fmtDate(d);
        const a = state.att[dk];
        if (a) {
            if (a.m) { mornings++; totalShifts++; }
            if (a.e) { evenings++; totalShifts++; }
            if (a.m || a.e) came++;
        }
    });

    const total = Math.round(totalShifts * shiftRate);
    const perPerson = Math.round(total / Math.max(1, state.config.split));
    return { came, mornings, evenings, totalShifts, total, perPerson, shiftRate, totalSalary };
}

// ─── Dashboard Export ───
export function getMaidDashboardSummary() {
    if (!state.config.cycleStart) return null;
    const s = calcStats();
    if (s.came === 0 && Object.keys(state.att).length === 0) return null;
    const start = getCycleStart();
    return {
        month: `${fmtShort(start)} – ${fmtShort(getCycleEnd())}`,
        daysCame: s.came, totalDays: CYCLE_DAYS,
        total: s.total, perPerson: s.perPerson,
        split: state.config.split,
        mornings: s.mornings, evenings: s.evenings
    };
}

export async function preloadForDashboard() {
    const token = getToken();
    if (!token) return;
    state.cycleOffset = 0;
    try {
        const cfgRes = await apiCall('/settings/group-get?key=maid_config', 'GET', null, token);
        if (cfgRes.value) {
            try {
                const c = typeof cfgRes.value === 'string' ? JSON.parse(cfgRes.value) : cfgRes.value;
                state.config = { split: c.split || 4, rate: c.rate || 1300, cycleStart: c.cycleStart || null };
            } catch(err) {}
        }
    } catch(err) { return; }

    if (!state.config.cycleStart) return;

    const start = getCycleStart();
    const end = getCycleEnd();
    try {
        const attRes = await apiCall(
            `/settings/group-get-range?key=maid_att&from=${fmtDate(start)}&to=${fmtDate(end)}`,
            'GET', null, token
        );
        state.att = {};
        if (attRes.entries) {
            attRes.entries.forEach(e => {
                try { state.att[e.date] = typeof e.value === 'string' ? JSON.parse(e.value) : e.value; }
                catch(err) {}
            });
        }
    } catch(err) {}
}

// ─── Render ───
export function renderRules() {
    const container = document.getElementById('view-container');
    container.innerHTML = `<div class="fade-in" style="padding-bottom:120px;"><div id="matt-root"></div></div>`;
    state.cycleOffset = 0;
    fetchCycle();
}

function render() {
    const root = document.getElementById('matt-root');
    if (!root) return;

    if (state.loading) {
        root.innerHTML = `
            <div class="ma-loading">
                <div class="spinner"></div>
                <p>Loading attendance...</p>
            </div>
        `;
        return;
    }

    // ─── Setup Screen (no cycle start set yet) ───
    if (!state.config.cycleStart) {
        root.innerHTML = `
            <div class="ma-setup">
                <div class="ma-setup-icon">📋</div>
                <h3 class="ma-setup-title">Set Up Maid Attendance</h3>
                <p class="ma-setup-text">When did the maid start? The billing cycle will run for 30 days from that date.</p>
                <input type="date" id="ma-start-input" class="ma-date-input" value="${fmtDate(new Date())}">
                <button class="ma-start-btn" id="ma-start-btn">
                    <i class="ph ph-play"></i> Start Tracking
                </button>
            </div>
        `;
        document.getElementById('ma-start-btn').onclick = async () => {
            const val = document.getElementById('ma-start-input').value;
            if (!val) { showToast('Pick a start date', 'error'); return; }
            state.config.cycleStart = val;
            await saveConfig();
            fetchCycle();
        };
        return;
    }

    // ─── Main View ───
    const s = calcStats();
    const today = new Date();
    const todayStr = fmtDate(today);
    const start = getCycleStart();
    const end = getCycleEnd();
    const pct = Math.round((s.came / CYCLE_DAYS) * 100);

    // Build today card if today falls within this cycle
    const cycleDays = getCycleDays();
    const todayInCycle = cycleDays.some(d => fmtDate(d) === todayStr);
    let todayCard = '';
    if (todayInCycle) {
        const a = state.att[todayStr] || { m: false, e: false };
        const bothOn = a.m && a.e;
        todayCard = `
            <div class="ma-today-card">
                <div class="ma-today-header">
                    <div>
                        <div class="ma-today-title">Today</div>
                        <div class="ma-today-date">${fmtFull(today)}</div>
                    </div>
                    <button class="ma-full-btn ${bothOn ? 'ma-full-on' : ''}" data-dk="${todayStr}" data-action="full">
                        ${bothOn ? '✓ Full Day' : 'Mark Full Day'}
                    </button>
                </div>
                <div class="ma-today-toggles">
                    <button class="ma-big-toggle ${a.m ? 'ma-big-on-m' : ''}" data-dk="${todayStr}" data-s="m">
                        <span class="ma-big-icon">☀️</span>
                        <span class="ma-big-text">${a.m ? 'Morning ✓' : 'Morning'}</span>
                    </button>
                    <button class="ma-big-toggle ${a.e ? 'ma-big-on-e' : ''}" data-dk="${todayStr}" data-s="e">
                        <span class="ma-big-icon">🌙</span>
                        <span class="ma-big-text">${a.e ? 'Evening ✓' : 'Evening'}</span>
                    </button>
                </div>
            </div>
        `;
    }

    // Build day rows (ascending order — oldest first, skip today)
    let rows = '';
    for (let i = 0; i < CYCLE_DAYS; i++) {
        const d = cycleDays[i];
        const dk = fmtDate(d);
        if (dk === todayStr && todayInCycle) continue;
        const a = state.att[dk] || { m: false, e: false };
        const dayName = DAY_NAMES[d.getDay()];
        const both = a.m && a.e;
        const one = (a.m || a.e) && !both;

        let statusClass = both ? 'ma-row-full' : one ? 'ma-row-half' : '';

        rows += `
            <div class="ma-row ${statusClass}">
                <div class="ma-row-left">
                    <div class="ma-row-daynum">
                        <span class="ma-row-num">${d.getDate()}</span>
                        <span class="ma-row-day">${dayName}</span>
                    </div>
                    <span class="ma-row-month">${MONTHS[d.getMonth()].slice(0,3)}</span>
                    ${both ? '<span class="ma-row-badge ma-badge-full">Full</span>' :
                      one ? `<span class="ma-row-badge ma-badge-half">${a.m ? 'AM' : 'PM'}</span>` :
                      '<span class="ma-row-badge ma-badge-absent">—</span>'}
                </div>
                <div class="ma-row-toggles">
                    <button class="ma-toggle ${a.m ? 'ma-toggle-on-m' : ''}" data-dk="${dk}" data-s="m">☀️</button>
                    <button class="ma-toggle ${a.e ? 'ma-toggle-on-e' : ''}" data-dk="${dk}" data-s="e">🌙</button>
                </div>
            </div>
        `;
    }

    root.innerHTML = `
        <!-- Cycle Nav -->
        <div class="ma-month-bar">
            <button class="ma-arrow" id="ma-prev"><i class="ph ph-caret-left"></i></button>
            <div class="ma-cycle-label">
                <span class="ma-cycle-range">${fmtShort(start)} → ${fmtShort(end)}</span>
                <span class="ma-cycle-sub">30-day cycle</span>
            </div>
            <button class="ma-arrow" id="ma-next"><i class="ph ph-caret-right"></i></button>
        </div>

        <!-- Today Card -->
        ${todayCard}

        <!-- Summary -->
        <div class="ma-summary">
            <div class="ma-summary-top">
                <div class="ma-summary-block">
                    <span class="ma-summary-num">${s.came}<span class="ma-summary-dim">/${CYCLE_DAYS}</span></span>
                    <span class="ma-summary-label">Days</span>
                </div>
                <div class="ma-summary-block">
                    <span class="ma-summary-num">₹${s.total}</span>
                    <span class="ma-summary-label">Total (₹${s.totalSalary}/mo)</span>
                </div>
                <div class="ma-summary-block ma-summary-green">
                    <span class="ma-summary-num">₹${s.perPerson}</span>
                    <span class="ma-summary-label">Each (÷${state.config.split})</span>
                </div>
            </div>
            <div class="ma-progress-wrap">
                <div class="ma-progress-bar">
                    <div class="ma-progress-fill" style="width:${pct}%"></div>
                </div>
                <span class="ma-progress-text">${pct}%</span>
            </div>
            <div class="ma-summary-meta">
                <span>☀️ ${s.mornings}</span>
                <span class="ma-dot-sep"></span>
                <span>🌙 ${s.evenings}</span>
                <span class="ma-dot-sep"></span>
                <span>${s.totalShifts} shifts</span>
                <span class="ma-dot-sep"></span>
                <span>₹${s.shiftRate.toFixed(0)}/shift</span>
            </div>
        </div>

        <!-- Config -->
        <div class="ma-config">
            <div class="ma-config-item">
                <span class="ma-config-label">👥 People</span>
                <div class="ma-config-ctrl">
                    <button class="ma-config-btn" id="ma-split-down"><i class="ph ph-minus"></i></button>
                    <span class="ma-config-val">${state.config.split}</span>
                    <button class="ma-config-btn" id="ma-split-up"><i class="ph ph-plus"></i></button>
                </div>
            </div>
            <div class="ma-config-sep"></div>
            <div class="ma-config-item">
                <span class="ma-config-label">💰 Per Person</span>
                <div class="ma-config-ctrl">
                    <button class="ma-config-btn" id="ma-rate-down"><i class="ph ph-minus"></i></button>
                    <span class="ma-config-val">₹${state.config.rate}</span>
                    <button class="ma-config-btn" id="ma-rate-up"><i class="ph ph-plus"></i></button>
                </div>
            </div>
        </div>

        <!-- Day List -->
        <div class="ma-list-header">
            <span>All Days</span>
        </div>
        <div class="ma-day-list">
            ${rows || '<div class="ma-empty-msg">No days in this cycle</div>'}
        </div>
    `;

    // ─── Events ───
    document.getElementById('ma-prev').onclick = () => { state.cycleOffset--; fetchCycle(); };
    document.getElementById('ma-next').onclick = () => { state.cycleOffset++; fetchCycle(); };

    document.getElementById('ma-split-down').onclick = () => {
        if (state.config.split > 1) { state.config.split--; saveConfig(); render(); }
    };
    document.getElementById('ma-split-up').onclick = () => {
        if (state.config.split < 20) { state.config.split++; saveConfig(); render(); }
    };
    document.getElementById('ma-rate-down').onclick = () => {
        if (state.config.rate > 100) { state.config.rate -= 100; saveConfig(); render(); }
    };
    document.getElementById('ma-rate-up').onclick = () => {
        state.config.rate += 100; saveConfig(); render();
    };

    // Toggles
    root.querySelectorAll('.ma-toggle').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); toggle(btn.dataset.dk, btn.dataset.s); });
    });
    root.querySelectorAll('.ma-big-toggle').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); toggle(btn.dataset.dk, btn.dataset.s); });
    });
    root.querySelectorAll('[data-action="full"]').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); toggleFull(btn.dataset.dk); });
    });
}
