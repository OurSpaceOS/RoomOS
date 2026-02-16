/* ============================================
   MAID ATTENDANCE TRACKER — APP LOGIC
   ============================================ */

const MONTHLY_RATE = 1300;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── State ───
let state = {
    persons: [],        // [{ id, name }]
    attendance: {},     // { "2026-02": { personId: { "1": { morning: false, evening: false }, ... } } }
    currentMonth: null, // Date object for current selected month
    pickerYear: null
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    if (!state.currentMonth) {
        state.currentMonth = new Date();
    }
    state.pickerYear = state.currentMonth.getFullYear();

    setupEventListeners();
    createParticles();
    render();
});

// ─── Storage ───
function loadState() {
    try {
        const saved = localStorage.getItem('maid-attendance-data');
        if (saved) {
            const data = JSON.parse(saved);
            state.persons = data.persons || [];
            state.attendance = data.attendance || {};
            if (data.currentMonth) {
                state.currentMonth = new Date(data.currentMonth);
            }
        }
    } catch (e) {
        console.error('Failed to load state:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('maid-attendance-data', JSON.stringify({
            persons: state.persons,
            attendance: state.attendance,
            currentMonth: state.currentMonth.toISOString()
        }));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

// ─── Event Listeners ───
function setupEventListeners() {
    // Add person
    document.getElementById('add-person-btn').addEventListener('click', addPerson);
    document.getElementById('person-name-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addPerson();
    });

    // Month navigation
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    // Month picker modal
    document.getElementById('month-display').addEventListener('click', openMonthPicker);
    document.getElementById('modal-close').addEventListener('click', closeMonthPicker);
    document.getElementById('month-picker-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeMonthPicker();
    });

    // Year nav in modal
    document.getElementById('year-prev').addEventListener('click', () => {
        state.pickerYear--;
        renderMonthGrid();
    });
    document.getElementById('year-next').addEventListener('click', () => {
        state.pickerYear++;
        renderMonthGrid();
    });
}

// ─── Person Management ───
function addPerson() {
    const input = document.getElementById('person-name-input');
    const name = input.value.trim();
    if (!name) {
        showToast('Please enter a name', 'error');
        input.focus();
        return;
    }

    const person = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name
    };

    state.persons.push(person);
    input.value = '';
    input.focus();
    saveState();
    render();
    showToast(`${name} added!`, 'success');
}

function removePerson(personId) {
    const person = state.persons.find(p => p.id === personId);
    if (!person) return;

    showConfirmDialog(
        `Remove ${person.name}?`,
        'All attendance data for this person will be deleted.',
        () => {
            state.persons = state.persons.filter(p => p.id !== personId);
            // Remove attendance data for this person across all months
            for (const monthKey in state.attendance) {
                delete state.attendance[monthKey][personId];
            }
            saveState();
            render();
            showToast(`${person.name} removed`, 'success');
        }
    );
}

// ─── Month Navigation ───
function getMonthKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function changeMonth(delta) {
    const d = new Date(state.currentMonth);
    d.setMonth(d.getMonth() + delta);
    state.currentMonth = d;
    saveState();
    render();
}

function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ─── Attendance ───
function toggleAttendance(personId, day, slot) {
    const monthKey = getMonthKey(state.currentMonth);

    if (!state.attendance[monthKey]) state.attendance[monthKey] = {};
    if (!state.attendance[monthKey][personId]) state.attendance[monthKey][personId] = {};
    if (!state.attendance[monthKey][personId][day]) {
        state.attendance[monthKey][personId][day] = { morning: false, evening: false };
    }

    state.attendance[monthKey][personId][day][slot] = !state.attendance[monthKey][personId][day][slot];
    saveState();
    render();
}

function getAttendance(personId, day) {
    const monthKey = getMonthKey(state.currentMonth);
    const data = state.attendance?.[monthKey]?.[personId]?.[day];
    return data || { morning: false, evening: false };
}

// ─── Calculations ───
function calculatePersonStats(personId) {
    const monthKey = getMonthKey(state.currentMonth);
    const daysInMonth = getDaysInMonth(state.currentMonth);
    const perDayRate = MONTHLY_RATE / daysInMonth;

    let totalVisits = 0;
    let daysCame = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const att = getAttendance(personId, String(d));
        const visits = (att.morning ? 1 : 0) + (att.evening ? 1 : 0);
        totalVisits += visits;
        if (visits > 0) daysCame++;
    }

    const amountToPay = Math.round(daysCame * perDayRate * 100) / 100;

    return {
        totalVisits,
        daysCame,
        daysInMonth,
        perDayRate,
        amountToPay
    };
}

// ─── Rendering ───
function render() {
    renderMonthDisplay();
    renderPersonCards();
    renderGrandTotal();
    updateEmptyState();
}

function renderMonthDisplay() {
    const d = state.currentMonth;
    document.getElementById('month-display').textContent =
        `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function renderPersonCards() {
    const container = document.getElementById('persons-container');
    container.innerHTML = '';

    state.persons.forEach(person => {
        container.appendChild(createPersonCard(person));
    });
}

function createPersonCard(person) {
    const stats = calculatePersonStats(person.id);
    const card = document.createElement('div');
    card.className = 'person-card';
    card.id = `card-${person.id}`;

    const initial = person.name.charAt(0).toUpperCase();

    card.innerHTML = `
        <div class="person-header">
            <div class="person-info">
                <div class="person-avatar">${initial}</div>
                <span class="person-name">${escapeHtml(person.name)}</span>
            </div>
            <div class="person-actions">
                <button class="delete-btn" title="Remove ${escapeHtml(person.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>

        <div class="person-summary">
            <div class="person-stat">
                <span class="stat-label">Days Present</span>
                <span class="stat-value">${stats.daysCame}/${stats.daysInMonth}</span>
            </div>
            <div class="person-stat">
                <span class="stat-label">Total Visits</span>
                <span class="stat-value">${stats.totalVisits}</span>
            </div>
            <div class="person-stat amount">
                <span class="stat-label">Amount</span>
                <span class="stat-value">₹${Math.round(stats.amountToPay)}</span>
            </div>
        </div>

        <div class="attendance-section">
            <div class="attendance-section-title">
                <span>Attendance</span>
                <div class="legend">
                    <span class="legend-item"><span class="legend-dot morning"></span> Morning</span>
                    <span class="legend-item"><span class="legend-dot evening"></span> Evening</span>
                </div>
            </div>
            <div class="attendance-grid" id="grid-${person.id}"></div>
        </div>
    `;

    // Delete button
    card.querySelector('.delete-btn').addEventListener('click', () => removePerson(person.id));

    // Attendance grid
    const grid = card.querySelector(`#grid-${person.id}`);
    buildAttendanceGrid(grid, person.id);

    return card;
}

function buildAttendanceGrid(grid, personId) {
    const d = state.currentMonth;
    const daysInMonth = getDaysInMonth(d);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay(); // 0=Sun

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === d.getFullYear() && today.getMonth() === d.getMonth();
    const todayDate = today.getDate();

    // Weekday headers
    WEEKDAYS.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-cell empty';
        header.innerHTML = `<span class="day-weekday" style="font-weight:600; color:var(--text-muted);">${day}</span>`;
        grid.appendChild(header);
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        grid.appendChild(empty);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const att = getAttendance(personId, String(day));
        const cell = document.createElement('div');
        const isFuture = isCurrentMonth && day > todayDate;
        const isToday = isCurrentMonth && day === todayDate;

        cell.className = 'day-cell' + (isToday ? ' today' : '') + (isFuture ? ' future' : '');

        cell.innerHTML = `
            <span class="day-number">${day}</span>
            <div class="attendance-toggles">
                <button class="att-toggle morning ${att.morning ? 'active' : ''}" title="Morning" data-day="${day}" data-slot="morning">☀</button>
                <button class="att-toggle evening ${att.evening ? 'active' : ''}" title="Evening" data-day="${day}" data-slot="evening">🌙</button>
            </div>
        `;

        // Toggle handlers
        cell.querySelectorAll('.att-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const dayNum = btn.dataset.day;
                const slot = btn.dataset.slot;
                toggleAttendance(personId, dayNum, slot);
            });
        });

        grid.appendChild(cell);
    }
}

function renderGrandTotal() {
    const section = document.getElementById('grand-total-section');
    if (state.persons.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const daysInMonth = getDaysInMonth(state.currentMonth);
    const perDayRate = MONTHLY_RATE / daysInMonth;

    let grandTotal = 0;
    state.persons.forEach(person => {
        const stats = calculatePersonStats(person.id);
        grandTotal += stats.amountToPay;
    });

    document.getElementById('total-persons').textContent = state.persons.length;
    document.getElementById('per-day-rate').textContent = `₹${perDayRate.toFixed(2)}`;
    document.getElementById('grand-total').textContent = `₹${Math.round(grandTotal)}`;
    document.getElementById('rate-info').textContent =
        `₹${MONTHLY_RATE}/month ÷ ${daysInMonth} days = ₹${perDayRate.toFixed(2)}/day`;
}

function updateEmptyState() {
    const empty = document.getElementById('empty-state');
    empty.style.display = state.persons.length === 0 ? 'block' : 'none';
}

// ─── Month Picker Modal ───
function openMonthPicker() {
    state.pickerYear = state.currentMonth.getFullYear();
    const modal = document.getElementById('month-picker-modal');
    modal.classList.add('active');
    renderMonthGrid();
}

function closeMonthPicker() {
    document.getElementById('month-picker-modal').classList.remove('active');
}

function renderMonthGrid() {
    document.getElementById('year-display').textContent = state.pickerYear;
    const grid = document.getElementById('month-grid');
    grid.innerHTML = '';

    const nowYear = new Date().getFullYear();
    const nowMonth = new Date().getMonth();
    const selectedMonth = state.currentMonth.getMonth();
    const selectedYear = state.currentMonth.getFullYear();

    MONTH_SHORT.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = 'month-grid-btn';

        if (state.pickerYear === selectedYear && idx === selectedMonth) {
            btn.classList.add('active');
        }
        if (state.pickerYear === nowYear && idx === nowMonth) {
            btn.classList.add('current');
        }

        btn.textContent = name;
        btn.addEventListener('click', () => {
            state.currentMonth = new Date(state.pickerYear, idx, 1);
            saveState();
            closeMonthPicker();
            render();
        });
        grid.appendChild(btn);
    });
}

// ─── Confirm Dialog ───
function showConfirmDialog(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-card">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="confirm-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm-delete">Delete</button>
            </div>
        </div>
    `;

    overlay.querySelector('.btn-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.btn-confirm-delete').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
}

// ─── Toast ───
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = 'toast';
    }, 2500);
}

// ─── Background Particles ───
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 6 + 2;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 20 + 15) + 's';
        p.style.animationDelay = (Math.random() * 20) + 's';
        container.appendChild(p);
    }
}

// ─── Utility ───
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
