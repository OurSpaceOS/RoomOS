/**
 * Interactive Particle Network Background
 * 
 * Creates a canvas-based particle system that reacts to mouse movement.
 * Particles float, connect with lines when close, and are attracted to the cursor.
 * 
 * Features:
 * - Responsive canvas resizing
 * - Theme-aware colors (light/dark mode support)
 * - Mouse interaction (repulsion/attraction)
 * - Connection lines based on proximity
 * - Optimized performance (requestAnimationFrame)
 */

(function () {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Configuration
    const config = {
        particleCount: 80,
        connectionDistance: 140,
        mouseDistance: 180,
        particleSpeed: 0.4,
        particleSize: 1.8,
        color: '94, 92, 230', // Brand purple (RGB)
        opacity: 0.15
    };

    let particles = [];
    let mouse = { x: null, y: null };
    let theme = 'dark'; // Default

    // Initialize Canvas
    function init() {
        canvas.id = 'particle-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-1';
        canvas.style.pointerEvents = 'none';
        document.body.prepend(canvas);
        
        resize();
        window.addEventListener('resize', resize);
        
        // Mouse Listeners
        document.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        
        document.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        // Theme Listener
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    checkTheme();
                }
            });
        });
        observer.observe(document.body, { attributes: true });
        
        checkTheme();
        createParticles();
        animate();
    }

    // Check current theme
    function checkTheme() {
        if (document.body.classList.contains('light-theme')) {
            theme = 'light';
            config.color = '100, 100, 100'; // Gray for light mode
            config.opacity = 0.08;
        } else {
            theme = 'dark';
            config.color = '94, 92, 230'; // Purple for dark mode
            config.opacity = 0.4;
        }
    }

    // Resize Canvas
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Create Particles
    function createParticles() {
        particles = [];
        const count = window.innerWidth < 768 ? 40 : config.particleCount; // Fewer on mobile
        
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * config.particleSpeed,
                vy: (Math.random() - 0.5) * config.particleSpeed,
                size: Math.random() * config.particleSize + 0.5
            });
        }
    }

    // Animation Loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, index) => {
            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off edges
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

            // Mouse Interaction
            if (mouse.x != null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.mouseDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (config.mouseDistance - distance) / config.mouseDistance;
                    
                    // Gentle attraction
                    const attractionStrength = 0.03;
                    p.vx += forceDirectionX * force * attractionStrength;
                    p.vy += forceDirectionY * force * attractionStrength;
                }
            }

            // Draw Particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${config.color}, ${config.opacity})`;
            ctx.fill();

            // Connect Particles
            for (let j = index + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.connectionDistance) {
                    const opacity = 1 - (distance / config.connectionDistance);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(${config.color}, ${opacity * config.opacity})`; // Fainter lines
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        });

        requestAnimationFrame(animate);
    }

    // Start
    init();

})();
