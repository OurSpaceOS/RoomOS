/**
 * RoomOS Theme Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');

        const applyTheme = (theme) => {
            if (theme === 'light') {
                body.classList.add('light-theme');
                if (icon) {
                    icon.classList.remove('ph-sun');
                    icon.classList.add('ph-moon');
                }
            } else {
                body.classList.remove('light-theme');
                if (icon) {
                    icon.classList.remove('ph-moon');
                    icon.classList.add('ph-sun');
                }
            }
        };

        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('light-theme')) {
                localStorage.setItem('roomos-theme', 'dark');
                applyTheme('dark');
            } else {
                localStorage.setItem('roomos-theme', 'light');
                applyTheme('light');
            }
        });

        // Apply saved theme on load
        const savedTheme = localStorage.getItem('roomos-theme') || 'dark';
        applyTheme(savedTheme);
    } else {
        // Apply saved theme on load for pages without a toggle
        const savedTheme = localStorage.getItem('roomos-theme') || 'dark';
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
        }
    }
});
