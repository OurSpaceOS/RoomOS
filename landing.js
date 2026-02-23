/**
 * RoomOS - Shared Living Operating System
 * Marketing Website JavaScript
 * Enhanced with Advanced Animations and Interactions (Adapted from ProSpine)
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initSmoothScroll();
    initMobileMenu();
    initScrollAnimations();
    initHeroParallax();
    initParallaxEffects();
    initTiltEffect();
    initCounterAnimation();
    initMagneticButtons();
    initScreenshotLightbox();
    initDemoModal();
});

/**
 * Sticky Navigation with Scroll Effect
 */
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const scrollThreshold = 50;
    let lastScroll = 0;

    if (!navbar) return;

    function handleScroll() {
        const currentScroll = window.scrollY;
        
        if (currentScroll > scrollThreshold) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide/show navbar on scroll direction
        if (currentScroll > lastScroll && currentScroll > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
}

/**
 * Smooth Scroll for Anchor Links
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href.length < 2) return;
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();
                
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                closeMobileMenu();
            }
        });
    });
}

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links'); // Note: This might need adjustment if using a separate mobile menu container
    
    // Create a mobile menu container if it doesn't exist to match the reference logic
    // Reference logic toggles .active on navLinks. 
    // In RoomOS new HTML, we might want a specific mobile menu overlay.
    // For now, let's assume standard toggle.

    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            // If we have a dedicated mobile menu container
            const mobileMenu = document.querySelector('.mobile-menu-container') || navLinks;
            if(mobileMenu) {
                mobileMenu.classList.toggle('active');
                mobileMenu.style.display = mobileMenu.classList.contains('active') ? 'flex' : 'none';
                if(mobileMenu === navLinks) {
                     mobileMenu.style.flexDirection = 'column';
                     mobileMenu.style.position = 'absolute';
                     mobileMenu.style.top = '72px';
                     mobileMenu.style.left = '0';
                     mobileMenu.style.right = '0';
                     mobileMenu.style.background = 'white';
                     mobileMenu.style.padding = '20px';
                     mobileMenu.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                }
            }
            document.body.style.overflow = this.classList.contains('active') ? 'hidden' : '';
        });
    }
}

function closeMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const mobileMenu = document.querySelector('.mobile-menu-container') || navLinks;
    
    if (menuBtn) {
        menuBtn.classList.remove('active');
        if(mobileMenu) {
            mobileMenu.classList.remove('active');
            if(mobileMenu === navLinks) mobileMenu.style.display = ''; // Reset
        }
        document.body.style.overflow = '';
    }
}

/**
 * Advanced Scroll Animations
 */
function initScrollAnimations() {
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) translateX(0) scale(1) !important;
        }
        
        .animate-element {
            opacity: 0;
            transform: translateY(40px);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .animate-left { transform: translateX(-60px); }
        .animate-right { transform: translateX(60px); }
        .animate-scale { transform: scale(0.8); }
        
        @keyframes counterUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Elements to animate
    const animationConfig = [
        { selector: '.benefit-card', animation: 'up', stagger: 100 },
        { selector: '.module-card', animation: 'up', stagger: 50 },
        { selector: '.timeline-item', animation: 'scale', stagger: 200 },
        { selector: '.showcase-hero-image', animation: 'up', stagger: 0 },
        { selector: '.showcase-feature', animation: 'up', stagger: 150 },
        { selector: '.section-header', animation: 'up', stagger: 0 }
    ];

    animationConfig.forEach(config => {
        const elements = document.querySelectorAll(config.selector);
        elements.forEach((el, index) => {
            el.classList.add('animate-element');
            if (config.animation === 'left') el.classList.add('animate-left');
            if (config.animation === 'right') el.classList.add('animate-right');
            if (config.animation === 'scale') el.classList.add('animate-scale');
            el.style.transitionDelay = `${index * config.stagger}ms`;
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-element').forEach(el => observer.observe(el));
}

/**
 * Hero Bento Card Parallax (Scroll + Mouse)
 */
function initHeroParallax() {
    const bentoCards = document.querySelectorAll('.bento-card');
    const hero = document.querySelector('.hero');
    if (!bentoCards.length || !hero) return;

    // Scroll-based parallax: move cards at different speeds
    let ticking = false;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const heroRect = hero.getBoundingClientRect();
        const heroBottom = hero.offsetTop + hero.offsetHeight;

        // Only apply parallax when hero is in view
        if (scrolled < heroBottom) {
            bentoCards.forEach(card => {
                const speed = parseFloat(card.dataset.speed) || 0.3;
                const yOffset = scrolled * speed;
                // Preserve the CSS animation by only adding scroll offset
                card.style.transform = `translateY(${-yOffset}px)`;
            });
        }
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });

    // Mouse-based 3D tilt on bento cards (desktop only)
    if (window.innerWidth > 768) {
        hero.addEventListener('mousemove', (e) => {
            const x = (e.clientX - window.innerWidth / 2) / window.innerWidth;
            const y = (e.clientY - window.innerHeight / 2) / window.innerHeight;

            bentoCards.forEach((card, index) => {
                const speed = parseFloat(card.dataset.speed) || 0.3;
                const scrollOffset = window.pageYOffset * speed;
                const mx = x * (15 + index * 8);
                const my = y * (10 + index * 5);
                card.style.transform = `translate(${mx}px, ${my - scrollOffset}px)`;
            });
        });
    }
}

/**
 * Parallax Effects for Background Shapes
 */
function initParallaxEffects() {
    const shapes = document.querySelectorAll('.hero-bg-shapes .shape');
    
    if (window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX - window.innerWidth / 2) / window.innerWidth;
            const y = (e.clientY - window.innerHeight / 2) / window.innerHeight;
            
            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 15;
                shape.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
            });
        });
    }

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        shapes.forEach((shape, index) => {
            const speed = 0.08 * (index + 1);
            shape.style.transform = `translateY(${scrolled * speed}px)`;
        });
    }, { passive: true });
}

/**
 * 3D Tilt Effect on Cards
 */
function initTiltEffect() {
    const cards = document.querySelectorAll('.benefit-card, .module-card, .screenshot-card');
    
    if (window.innerWidth > 768) {
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 20; // Reduced sensitivity
                const rotateY = (centerX - x) / 20;
                
                card.style.transform = `
                    perspective(1000px) 
                    rotateX(${rotateX}deg) 
                    rotateY(${rotateY}deg) 
                    translateY(-8px) 
                    scale(1.02)
                `;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }
}

/**
 * Counter Animation for Stats
 */
function initCounterAnimation() {
    const statValues = document.querySelectorAll('.stat-num'); // Changed from .stat-value to match RoomOS HTML class if reused, or update HTML
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statValues.forEach(stat => observer.observe(stat));
}

function animateCounter(element) {
    const text = element.textContent;
    const hasPlus = text.includes('+');
    const hasK = text.includes('K');
    const hasM = text.includes('M');
    const hasDollar = text.includes('$');
    const hasPercent = text.includes('%');
    
    let finalValue = parseFloat(text.replace(/[^0-9.]/g, ''));
    let currentValue = 0;
    const duration = 2000;
    const steps = 60;
    const increment = finalValue / steps;
    const stepDuration = duration / steps;
    
    element.style.animation = 'counterUp 0.5s ease';
    
    const counter = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= finalValue) {
            currentValue = finalValue;
            clearInterval(counter);
        }
        
        let displayValue = Math.floor(currentValue * 10) / 10;
        if(Number.isInteger(finalValue)) displayValue = Math.floor(currentValue);

        let output = displayValue;
        if (hasDollar) output = '$' + output;
        if (hasM) output = output + 'M';
        if (hasK) output = output + 'K';
        if (hasPercent) output = output + '%';
        if (hasPlus) output = output + '+';
        
        element.textContent = output;
    }, stepDuration);
}

/**
 * Magnetic Button Effect
 */
function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-lg');
    
    if (window.innerWidth > 768) {
        buttons.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }
}

/**
 * Scroll Progress Indicator
 */
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: var(--gradient-primary);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = progress + '%';
    }, { passive: true });
}

// Initialize scroll progress
initScrollProgress();

/**
 * Screenshot Lightbox
 * Click any showcase screenshot to view it fullscreen
 */
function initScreenshotLightbox() {
    const overlay = document.getElementById('screenshotLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');

    if (!overlay || !lightboxImg) return;

    const phoneFrame = document.querySelector('.lightbox-phone');

    // Click on any showcase screenshot to open lightbox
    document.querySelectorAll('.phone-mockup img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;

            // Wait for image to load, then size the frame to match
            const onLoad = () => {
                const natW = lightboxImg.naturalWidth;
                const natH = lightboxImg.naturalHeight;
                const maxH = window.innerHeight * 0.85;
                const maxW = Math.min(400, window.innerWidth * 0.85);

                // Calculate scaled dimensions keeping aspect ratio
                let w = natW;
                let h = natH;
                if (h > maxH) { w = w * (maxH / h); h = maxH; }
                if (w > maxW) { h = h * (maxW / w); w = maxW; }

                // Add padding for the phone bezel
                if (phoneFrame) {
                    phoneFrame.style.width = (w + 20) + 'px';
                    phoneFrame.style.height = (h + 20) + 'px';
                }
                lightboxImg.style.width = w + 'px';
                lightboxImg.style.height = h + 'px';
                lightboxImg.removeEventListener('load', onLoad);
            };

            if (lightboxImg.complete && lightboxImg.naturalWidth) {
                onLoad();
            } else {
                lightboxImg.addEventListener('load', onLoad);
            }

            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close on overlay click (but not image click)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeLightbox();
        }
    });

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeLightbox();
        }
    });

    function closeLightbox() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Live Demo Glassmorphism Modal
 */
function initDemoModal() {
    const btn = document.getElementById('openDemoModalBtn');
    const modal = document.getElementById('demoModal');
    const closeBtn = document.getElementById('demoModalClose');
    const frame = document.getElementById('demoModalFrame');

    if (!btn || !modal) return;

    // Open Modal
    btn.addEventListener('click', () => {
        // Lazy load the iframe source to save resources on initial page load
        if (frame && !frame.src) {
            frame.src = frame.getAttribute('data-src');
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });

    // Close Modal function
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Close on overlay click (outside the phone)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}
