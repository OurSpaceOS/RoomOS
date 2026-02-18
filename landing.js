/**
 * RoomOS Senior Interface Logic
 * 1. Mobile Menu Toggle
 * 2. Scroll Reveal for Bento Grid
 * 3. 3D Tilt Effect for Hero Image
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('ph-list', 'ph-x');
                document.body.style.overflow = 'hidden'; // Lock scroll
            } else {
                icon.classList.replace('ph-x', 'ph-list');
                document.body.style.overflow = ''; // Unlock scroll
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.querySelector('i').classList.replace('ph-x', 'ph-list');
                document.body.style.overflow = '';
            });
        });
    }

    // 2. Scroll Reveal for Bento Grid
    const observerOptions = {
        threshold: 0.1,
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

    const revealItems = document.querySelectorAll('.bento-card, .section-head, .stat-item, .footer-content');
    revealItems.forEach((item, index) => {
        // Add staggered delay
        item.style.transitionDelay = `${index * 50}ms`;
        observer.observe(item);
    });

    // 3. 3D Tilt Effect for Hero Image
    const heroSection = document.querySelector('.hero');
    const heroImage = document.querySelector('.hero-main-img');

    if (heroSection && heroImage) {
        heroSection.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { offsetWidth, offsetHeight } = heroSection;
            const x = (clientX / offsetWidth - 0.5) * 10; // Max 5 deg tilt
            const y = (clientY / offsetHeight - 0.5) * -10;

            heroImage.style.transform = `rotateX(${2 + y}deg) rotateY(${x}deg)`;
        });

        heroSection.addEventListener('mouseleave', () => {
            heroImage.style.transform = 'rotateX(2deg) rotateY(0deg)'; // Reset
        });
    }

    console.log("RoomOS Senior Interface Initialized");
});
