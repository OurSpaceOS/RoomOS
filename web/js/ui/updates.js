import { apiCall } from '../api.js';

let updateCheckInterval = null;

/**
 * Check for app updates
 */
export async function checkForUpdates() {
    try {
        const token = localStorage.getItem('token');
        const response = await apiCall('/updates/check', 'GET', null, token);

        console.log('Update check response:', response);

        if (response.success && response.has_update) {
            console.log('New update available!', response);
            showUpdatePopup(response);
        } else {
            console.log('No updates available');
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
}

/**
 * Show update notification popup
 */
function showUpdatePopup(updateInfo) {
    // Check if user has dismissed this version already
    const dismissedVersion = localStorage.getItem('dismissed_update_version');
    if (dismissedVersion === updateInfo.latest_version) {
        return; // User already dismissed this update
    }

    // Remove existing popup if any
    const existingPopup = document.getElementById('update-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup HTML
    const popup = document.createElement('div');
    popup.id = 'update-popup';
    popup.style.cssText = `
        display: flex;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    popup.innerHTML = `
        <div style="
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.3s ease;
        ">
            <!-- Header with Icon -->
            <div style="
                display: flex;
                align-items: center;
                gap: var(--space-md);
                margin-bottom: var(--space-lg);
            ">
                <div style="
                    width: 48px;
                    height: 48px;
                    background: var(--accent-gradient);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                ">
                    🎉
                </div>
                <div>
                    <h3 style="
                        margin: 0;
                        font-size: 1.5rem;
                        font-weight: 800;
                        color: var(--text-primary);
                    ">New Update Available!</h3>
                    <p style="
                        margin: 4px 0 0 0;
                        color: var(--text-secondary);
                        font-size: 0.9rem;
                    ">Version ${updateInfo.latest_version}</p>
                </div>
            </div>

            <!-- Version Info -->
            <div style="
                background: var(--bg-elevated);
                border-radius: var(--radius-md);
                padding: var(--space-md);
                margin-bottom: var(--space-lg);
            ">
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-md);
                ">
                    <div>
                        <span style="
                            display: block;
                            font-size: 0.75rem;
                            color: var(--text-tertiary);
                            margin-bottom: 4px;
                        ">Current Version</span>
                        <span style="
                            font-weight: 700;
                            color: var(--text-primary);
                        ">${updateInfo.current_version}</span>
                    </div>
                    <div>
                        <span style="
                            display: block;
                            font-size: 0.75rem;
                            color: var(--text-tertiary);
                            margin-bottom: 4px;
                        ">Latest Version</span>
                        <span style="
                            font-weight: 700;
                            color: var(--success);
                        ">${updateInfo.latest_version}</span>
                    </div>
                </div>
            </div>

            <!-- Release Notes -->
            <div style="margin-bottom: var(--space-lg);">
                <h4 style="
                    margin: 0 0 var(--space-sm) 0;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                ">What's New:</h4>
                <ul style="
                    margin: 0;
                    padding-left: var(--space-lg);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    line-height: 1.6;
                ">
                    ${updateInfo.release_notes.map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>

            <!-- Release Date -->
            <p style="
                margin: 0 0 var(--space-lg) 0;
                font-size: 0.85rem;
                color: var(--text-tertiary);
                text-align: center;
            ">
                Released on ${new Date(updateInfo.release_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
    })}
            </p>

            <!-- Action Buttons -->
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-md);
            ">
                <button id="dismiss-update-btn" class="btn" style="
                    background: var(--bg-elevated);
                    color: var(--text-primary);
                ">
                    Later
                </button>
                <button id="download-update-btn" class="btn" style="
                    background: var(--accent-gradient);
                    color: white;
                    font-weight: 700;
                ">
                    Download Now
                </button>
            </div>
        </div>

        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        </style>
    `;

    document.body.appendChild(popup);

    // Event Listeners
    const dismissBtn = popup.querySelector('#dismiss-update-btn');
    const downloadBtn = popup.querySelector('#download-update-btn');

    dismissBtn.addEventListener('click', () => {
        // Save dismissed version to localStorage
        localStorage.setItem('dismissed_update_version', updateInfo.latest_version);
        closeUpdatePopup();
    });

    downloadBtn.addEventListener('click', () => {
        // Open download URL in new tab
        window.open(updateInfo.download_url, '_blank');
        closeUpdatePopup();
    });

    // Close on background click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            localStorage.setItem('dismissed_update_version', updateInfo.latest_version);
            closeUpdatePopup();
        }
    });
}

/**
 * Close update popup
 */
function closeUpdatePopup() {
    const popup = document.getElementById('update-popup');
    if (popup) {
        popup.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => popup.remove(), 300);
    }
}

/**
 * Start periodic update checks (every 6 hours)
 */
export function startUpdateChecker() {
    // Check immediately on app start
    checkForUpdates();

    // Check every 6 hours
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
    }
    updateCheckInterval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
}

/**
 * Stop update checker
 */
export function stopUpdateChecker() {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
    }
}
