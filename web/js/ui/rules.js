export function renderRules() {
    const container = document.getElementById('view-container');

    const rules = [
        { num: 1, text: "Respect everyone's space and belongings" },
        { num: 2, text: "Clean up after yourself immediately, especially in the kitchen and bathroom" },
        { num: 3, text: "Communicate openly and honestly about any issues or concerns" },
        { num: 4, text: "Share responsibilities fairly, including chores and bill payments" },
        { num: 5, text: "Keep noise levels reasonable, especially after 10 PM on weekdays" },
        { num: 6, text: "Ask for permission before using or borrowing others' personal items" },
        { num: 7, text: "Contribute to shared expenses on time without needing reminders" },
        { num: 8, text: "Inform your roommates in advance if you plan on bringing guests over" },
        { num: 9, text: "Take turns with shared spaces like the living room and kitchen" },
        { num: 10, text: "Be considerate and understanding of each other's schedules and lifestyles" },
        { num: 11, text: "The weekly roster is auto-generated based on everyone's class schedule to be fair" },
        { num: 12, text: "Morning work requires at least a 2-hour buffer after the first person leaves for class" },
        { num: 13, text: "The person who leaves earliest is the 'Alarm Clock' and is a passenger in the morning" },
        { num: 14, text: "Night shifts prioritize those who were passengers in the morning to balance the workload" },
        { num: 15, text: "On group off-days, work is assigned based on who has the fewest shifts that week" }
    ];

    let html = `
        <div class="fade-in" style="padding-bottom: 80px;">

            
            <div class="card" style="padding: 0; overflow: hidden;">
    `;

    rules.forEach((rule, index) => {
        const isLast = index === rules.length - 1;
        html += `
            <div style="
                display: flex;
                align-items: center;
                gap: var(--space-lg);
                padding: var(--space-lg);
                border-bottom: ${isLast ? 'none' : '1px solid var(--border-subtle)'};
                transition: background var(--transition-fast);
            " class="rule-item">
                <div style="
                    width: 48px;
                    height: 48px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--accent-gradient);
                    border-radius: var(--radius-md);
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: white;
                    box-shadow: var(--shadow-glow);
                ">
                    ${rule.num}
                </div>
                <p style="
                    margin: 0;
                    font-size: 1rem;
                    line-height: 1.6;
                    color: var(--text-primary);
                    font-weight: 500;
                ">
                    ${rule.text}
                </p>
            </div>
        `;
    });

    html += `
            </div>
            
            <div style="
                margin-top: var(--space-xl);
                margin-bottom: var(--space-lg);
                padding: var(--space-lg);
                background: var(--bg-elevated);
                border: 1px solid var(--border-subtle);
                border-radius: var(--radius-lg);
                text-align: center;
            ">
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                    💡 <strong>Remember:</strong> These rules help us live harmoniously together
                </p>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Add hover effect
    const style = document.createElement('style');
    style.textContent = `
        .rule-item:hover {
            background: var(--bg-elevated) !important;
        }
    `;
    document.head.appendChild(style);
}
