const fs = require('fs');
const css = fs.readFileSync('landing.css', 'utf8');

const startMarker = '/* ========================================\n   Feature Showcase Section (Premium)\n   ======================================== */';

const endMarker = '/* ========================================\n   Marquee Section\n   ======================================== */';

const startIndex = css.indexOf(startMarker);
const endIndex = css.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = css.substring(0, startIndex);
    const after = css.substring(endIndex);

    const newCSS = `/* ========================================
   Interactive Showcase (Split Layout)
   ======================================== */
.interactive-showcase {
    padding: var(--section-padding);
    background: var(--white);
    position: relative;
    border-top: 1px solid var(--gray-200);
}

.showcase-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
    position: relative;
}

/* Left side: Scrolling Content */
.showcase-content {
    padding-bottom: 30vh;
}

.showcase-header {
    text-align: left;
    max-width: 100%;
    margin: 0 0 60px 0;
}

.feature-blocks {
    display: flex;
    flex-direction: column;
    gap: 120px;
}

.feature-block {
    opacity: 0.3;
    transform: translateX(-20px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 32px;
    border-radius: var(--radius-xl);
    border: 1px solid transparent;
}

.feature-block.active {
    opacity: 1;
    transform: translateX(0);
    background: var(--gray-50);
    border-color: var(--gray-200);
    box-shadow: var(--shadow-sm);
}

.feature-block h3 {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--gray-900);
    margin: 16px 0;
    letter-spacing: -0.02em;
}

.feature-block p {
    font-size: 1.0625rem;
    color: var(--gray-600);
    line-height: 1.7;
    margin-bottom: 20px;
}

/* Right side: Sticky Demo Phone */
.showcase-demo-wrapper {
    position: sticky;
    top: 120px;
    height: calc(100vh - 140px);
    display: flex;
    align-items: center;
    justify-content: center;
}

.demo-phone-sticky {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.demo-hint {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-sm);
}

/* Galaxy S25 Ultra Frame */
.demo-phone {
    flex-shrink: 0;
    position: relative;
}

.demo-phone-frame {
    height: 80vh;
    max-height: 850px;
    min-height: 550px;
    aspect-ratio: 9/20;
    background: #050505;
    border-radius: 28px;
    padding: 6px;
    position: relative;
    box-shadow:
        0 0 0 2.5px #5c5c5c,
        0 0 0 4px #2a2a2a,
        0 0 0 5px rgba(255, 255, 255, 0.12),
        0 35px 90px -15px rgba(0, 0, 0, 0.55),
        0 0 50px rgba(99, 102, 241, 0.06);
    overflow: hidden;
}

/* Punch-hole camera (S25 Ultra) */
.demo-phone-frame::before {
    content: '';
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 10px;
    background: #111;
    border-radius: 50%;
    z-index: 10;
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.9), 0 0 0 1.5px #222;
}

/* Volume rocker */
.demo-phone-frame::after {
    content: '';
    position: absolute;
    left: -4px;
    top: 160px;
    width: 4px;
    height: 70px;
    background: linear-gradient(to bottom, #666, #555, #666);
    border-radius: 3px 0 0 3px;
}

/* Status Bar */
.demo-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 20px;
    background: transparent;
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    z-index: 5;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
}

.demo-status-icons {
    display: flex;
    gap: 6px;
    font-size: 14px;
}

.demo-time {
    font-variant-numeric: tabular-nums;
}

/* iframe */
.demo-phone-frame iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 22px;
    background: #fff;
    pointer-events: auto;
}

/* Home Indicator  */
.demo-home-indicator {
    width: 120px;
    height: 5px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 100px;
    margin: 10px auto 0;
}

/* Responsive Stacking */
@media (max-width: 992px) {
    .showcase-container {
        grid-template-columns: 1fr;
        gap: 60px;
    }

    .showcase-header {
        text-align: center;
        margin: 0 auto 40px;
    }

    .showcase-demo-wrapper {
        position: relative;
        top: 0;
        height: auto;
        order: -1;
        margin-bottom: 24px;
    }

    .feature-blocks {
        gap: 40px;
    }

    .feature-block {
        opacity: 1;
        transform: none;
        padding: 24px;
        background: var(--gray-50);
        border-color: var(--gray-200);
    }
    
    .demo-hint.desktop-only {
        display: none;
    }

    .demo-phone-frame {
        width: 100%;
        max-width: 340px;
        height: auto;
        aspect-ratio: 9/20;
    }
}
\n\n`;

    fs.writeFileSync('landing.css', before + newCSS + after);
    console.log("Success");
} else {
    console.log("Markers not found.");
}
