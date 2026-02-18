/**
 * RoomOS Theme Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');

        const updateThemeImages = (theme) => {
            const images = document.querySelectorAll('[data-img-light]');
            images.forEach(img => {
                if (theme === 'light') {
                    const lightSrc = img.getAttribute('data-img-light');
                    if (lightSrc) img.src = lightSrc;
                } else {
                    const darkSrc = img.getAttribute('data-img-dark');
                    if (darkSrc) img.src = darkSrc;
                }
            });
        };

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
            updateThemeImages(theme);
        };

        themeToggle.addEventListener('click', () => {
            // ... existing click logic ...
            if (body.classList.contains('light-theme')) { // This check is pre-toggle state
                // It was light, so we are switching to dark
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
        // ... existing fallback ...
        const savedTheme = localStorage.getItem('roomos-theme') || 'dark';
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            // We should also try to update images if possible, even without multiple toggles
            const images = document.querySelectorAll('[data-img-light]');
            images.forEach(img => {
                const lightSrc = img.getAttribute('data-img-light');
                if (lightSrc) img.src = lightSrc;
            });
        }
    }
});
