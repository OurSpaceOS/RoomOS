import { apiCall } from '../api.js';

export async function renderCrew() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="flex-center p-4"><div class="loader">Loading...</div></div>';

    try {
        const token = localStorage.getItem('token');
        // Fetch members and roster to calc stats
        const [membersRes, rosterRes] = await Promise.all([
            apiCall('/group/members', 'GET', null, token),
            apiCall('/roster/week', 'GET', null, token)
        ]);

        const members = membersRes.members;
        const roster = rosterRes.roster;

        // Calculate Shifts
        const shiftCounts = {};
        members.forEach(m => shiftCounts[m.name] = 0);

        roster.forEach(day => {
            const m = JSON.parse(day.morning || '[]');
            const n = JSON.parse(day.night || '[]');

            // Handle both string and object formats
            const process = (arr) => {
                arr.forEach(p => {
                    const name = typeof p === 'string' ? p : p.n;
                    if (shiftCounts[name] !== undefined) shiftCounts[name]++;
                });
            };
            process(m);
            process(n);
        });

        let html = '<div class="fade-in" style="padding-bottom: 80px;">';
        html += '<h1 style="margin-bottom: var(--space-lg); font-size: 1.75rem; font-weight: 800;">Crew Members</h1>';

        members.forEach(member => {
            const shifts = shiftCounts[member.name] || 0;
            const maxShifts = 14; // 7 days * 2 shifts
            const percent = Math.min(100, (shifts / maxShifts) * 100);

            // Mock Colors based on ID
            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
            const color = colors[member.id % colors.length];
            const initial = member.name.charAt(0).toUpperCase();
            const role = member.role === 'admin' ? 'Admin' : 'Member';

            html += `
                <div class="crew-card">
                    <div class="crew-avatar" style="background: ${color};">${initial}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs);">
                            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${member.name}</h3>
                            <span class="badge" style="background: ${color}15; color: ${color}; border: 1px solid ${color}30; font-size: 0.65rem; padding: 4px 8px;">${role}</span>
                        </div>
                        <p style="margin: 0 0 var(--space-md) 0; font-size: 0.85rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${member.email}</p>
                        
                        <div style="display: flex; gap: var(--space-lg); margin-bottom: var(--space-sm);">
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Weekly Shifts</div>
                                <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${shifts}<span style="font-size: 0.85rem; color: var(--text-secondary);">/${maxShifts}</span></div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Workload</div>
                                <div style="font-size: 1.25rem; font-weight: 700; color: ${color};">${Math.round(percent)}%</div>
                            </div>
                        </div>
                        
                        <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                            <div style="height: 100%; background: ${color}; width: ${percent}%; transition: width var(--transition-base);"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

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
