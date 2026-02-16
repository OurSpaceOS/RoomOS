/**
 * RoomOS Silk Modern Interface Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.querySelector('i').classList.toggle('ph-list');
            menuToggle.querySelector('i').classList.toggle('ph-x');
        });
    }

    // 2. Optimized Scroll Reveal for Zigzag
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                // observer.unobserve(entry.target); // Keep observing for entry animations if desired
            }
        });
    }, observerOptions);

    const revealItems = document.querySelectorAll('.zigzag-content, .zigzag-visual, .zigzag-row, .stat-item, .cta-inner');
    revealItems.forEach(item => {
        observer.observe(item);
    });

    // Injected Scroll Animation Style
    const style = document.createElement('style');
    style.innerHTML = `
        .fade-in-up {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // 4. Hero Visual Drift (Removed)

    console.log("RoomOS Silk Modern Initialized");
});
