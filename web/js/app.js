import { renderLogin } from './ui/login.js';
import { apiCall } from './api.js';
// import { renderForgotPassword } from './ui/forgot_password.js';
import { renderGroupSetup } from './ui/group_setup.js';
import { renderDashboard, stopDashboardUpdates } from './ui/dashboard.js';
import { renderRoster } from './ui/roster.js';
import { renderCrew } from './ui/crew.js';
import { renderRules } from './ui/rules.js';
import { renderProfile } from './ui/profile.js';
import { renderTransactions } from './ui/transactions.js';
import { renderExpenseAnalytics } from './ui/expense-analytics.js';
import { renderChat, stopChatPolling } from './ui/chat.js';
import { getState, updateState } from './state.js';
import { showToast } from './ui/toast.js';
import { startUpdateChecker, checkForUpdates } from './ui/updates.js';
import './sync.js'; // Start sync listener

// Navigation history stack for back button support
let navigationStack = [];
let isNavigatingBack = false;

// Expose app to window for global access (e.g. onclick in HTML)
window.app = {
    navigate: navigate,
    toggleTheme: toggleTheme,
    showToast: showToast,
    toggleChat: toggleChat,
    checkForUpdates: checkForUpdates, // For manual testing
    goBack: goBack // For manual back navigation
};

// Toggle Chat Function
function toggleChat() {
    const currentView = localStorage.getItem('last_view');

    if (currentView === 'chat') {
        // If we're in chat, go back to the previous view
        const previousView = localStorage.getItem('view_before_chat') || 'dashboard';
        navigate(previousView);
    } else {
        // If we're not in chat, go to chat
        navigate('chat');
    }
}

// Go Back Function - Navigate to previous view
function goBack() {
    if (navigationStack.length > 1) {
        // Remove current view
        navigationStack.pop();
        // Get previous view
        const previousView = navigationStack[navigationStack.length - 1];
        isNavigatingBack = true;
        history.back();
        // The popstate handler will take care of navigation
    } else {
        // If only one item in stack, go to dashboard
        navigate('dashboard');
    }
}

// Router
export function navigate(view, pushToHistory = true) {
    const container = document.getElementById('view-container');
    const state = getState();
    const bottomNav = document.querySelector('.bottom-nav');

    // Clear current view
    container.innerHTML = '';

    // Handle Auth Guard
    if (!localStorage.getItem('token') && !['login', 'forgot-password'].includes(view)) {
        view = 'login';
    }

    console.log('Navigating to:', view);
    console.log('Current State:', state);

    // Auth Guard
    if (!state.token && !['login', 'forgot-password'].includes(view)) {
        console.log('Auth Guard Blocked');
        renderLogin();
        return;
    }

    // Group Guard
    if (state.token && !state.group && view !== 'group_setup' && view !== 'login') {
        console.log('Group Guard Blocked. Token exists but no Group.');
        renderGroupSetup();
        return;
    }

    // Manage navigation stack and browser history
    const nonHistoryViews = ['login', 'group_setup', 'forgot-password'];
    if (!nonHistoryViews.includes(view)) {
        // Only push to stack if different from current top
        const currentTop = navigationStack[navigationStack.length - 1];
        if (currentTop !== view) {
            navigationStack.push(view);
            
            // Push to browser history for back button support
            if (pushToHistory && !isNavigatingBack) {
                history.pushState({ view: view }, '', `#${view}`);
            }
        }
    }
    isNavigatingBack = false;

    // Save current view
    if (view !== 'login' && view !== 'group_setup') {
        // Store previous view before entering chat
        const currentView = localStorage.getItem('last_view');
        if (view === 'chat' && currentView && currentView !== 'chat') {
            localStorage.setItem('view_before_chat', currentView);
        }
        localStorage.setItem('last_view', view);
    }

    // Update header title based on view
    const headerTitle = document.querySelector('.app-header h1');
    if (headerTitle) {
        const viewTitles = {
            dashboard: 'RoomOS',
            roster: 'Weekly Plan',
            transactions: 'Money',
            crew: 'Crew',
            rules: 'Attendance',
            profile: 'Profile',
            'expense-analytics': 'Analytics',
            chat: 'Chat',
            login: 'RoomOS',
            group_setup: 'Setup',
            'forgot-password': 'Reset Password'
        };
        
        // Define which views need a back button and where they go back to
        const backButtonViews = {
            'expense-analytics': 'transactions'
        };
        
        // Check if this view needs a back button
        if (backButtonViews[view]) {
            const backTarget = backButtonViews[view];
            headerTitle.innerHTML = `
                <span onclick="app.navigate('${backTarget}')" style="cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="ph ph-arrow-left" style="font-size: 1.1rem;"></i>
                    ${viewTitles[view] || 'RoomOS'}
                </span>
            `;
        } else {
            headerTitle.textContent = viewTitles[view] || 'RoomOS';
        }
    }

    // Hide/Show bottom nav and chat button based on view
    const chatBtn = document.getElementById('chat-btn');
    const shouldHideNav = ['chat', 'login', 'group_setup', 'forgot-password'].includes(view);
    const shouldHideChat = ['login', 'group_setup', 'forgot-password'].includes(view);

    if (bottomNav) {
        bottomNav.style.display = shouldHideNav ? 'none' : 'flex';
    }

    if (chatBtn) {
        chatBtn.style.display = shouldHideChat ? 'none' : 'flex';
    }

    // Update Nav Active State
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.target === view);
    });

    // Stop polling/intervals when leaving views
    if (view !== 'chat') {
        stopChatPolling();
    }
    if (view !== 'dashboard') {
        stopDashboardUpdates();
    }

    // Clear current view
    container.innerHTML = '';

    // Render the page content immediately
    switch (view) {
        case 'login':
            renderLogin();
            break;
        case 'forgot-password':
            // renderForgotPassword(); // Uncomment when implemented
            break;
        case 'group_setup':
            renderGroupSetup();
            break;
        case 'dashboard':
            renderDashboard();
            break;
        case 'roster':
            renderRoster();
            break;
        case 'crew':
            renderCrew();
            break;
        case 'rules':
            renderRules();
            break;
        case 'profile':
            renderProfile();
            break;
        case 'transactions':
            renderTransactions();
            break;
        case 'expense-analytics':
            renderExpenseAnalytics();
            break;
        case 'chat':
            renderChat();
            break;
        default:
            renderDashboard();
    }
}

// Theme Logic
function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme') || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update Icon
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'ph ph-sun' : 'ph ph-moon';
    }
}

// Listen for theme changes from parent (Landing Page)
window.addEventListener('message', (event) => {
    if (event.data.type === 'THEME_CHANGE') {
        setTheme(event.data.theme);
    }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Nav Click Handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            navigate(item.dataset.target);
        });
    });

    // Init Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    if (document.querySelector('#theme-toggle i')) {
        document.querySelector('#theme-toggle i').className = savedTheme === 'dark' ? 'ph ph-moon' : 'ph ph-sun';
    }

    const state = getState();

    // Initial Route
    if (state.token) {
        // Verify token is valid before proceeding. If not, force login.
        // A simple way is to try to fetch something that requires auth, like the user's schedule.
        // If it fails with a 401, we know the token is bad.
        apiCall('/schedule/get', 'GET', null, state.token)
            .then(() => {
                const lastView = localStorage.getItem('last_view');
                if (lastView && lastView !== 'login' && lastView !== 'group_setup') {
                    navigate(lastView);
                } else {
                    navigate('dashboard');
                }
            })
            .catch(() => navigate('login')); // If the check fails, go to login
    } else {
        navigate('login');
    }

    // Handle browser/mobile back button
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view) {
            // Navigate to the view from history without pushing new state
            isNavigatingBack = true;
            navigate(event.state.view, false);
            
            // Update navigation stack
            if (navigationStack.length > 1) {
                navigationStack.pop();
            }
        } else {
            // If no state, check URL hash or go to dashboard
            const hash = window.location.hash.replace('#', '');
            if (hash && hash !== 'login' && hash !== 'group_setup') {
                isNavigatingBack = true;
                navigate(hash, false);
            } else if (navigationStack.length > 1) {
                // Navigate to previous in our stack
                navigationStack.pop();
                const previousView = navigationStack[navigationStack.length - 1];
                if (previousView) {
                    isNavigatingBack = true;
                    navigate(previousView, false);
                }
            } else {
                // Prevent exit - push dashboard back to history
                const currentView = localStorage.getItem('last_view') || 'dashboard';
                if (currentView !== 'login' && currentView !== 'group_setup') {
                    history.pushState({ view: currentView }, '', `#${currentView}`);
                }
            }
        }
    });

    // Set initial history state
    const initialView = localStorage.getItem('last_view') || 'dashboard';
    if (initialView !== 'login' && initialView !== 'group_setup') {
        history.replaceState({ view: initialView }, '', `#${initialView}`);
        navigationStack.push(initialView);
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('SW Registered'))
            .catch(err => console.error('SW Fail', err));
    }

    // Network Status Handler
    function updateOnlineStatus() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            if (navigator.onLine) {
                banner.style.display = 'none';
            } else {
                banner.style.display = 'flex';
            }
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Initial check

    // Start Update Checker (only for logged-in users)
    if (state.token) {
        startUpdateChecker();
    }

    // Scroll-based header and dock hide/show
    let lastScrollY = 0;
    let ticking = false;
    const scrollThreshold = 5; // Minimum scroll amount to trigger hide/show
    
    const viewContainer = document.getElementById('view-container');
    const header = document.querySelector('.app-header');
    const bottomNav = document.querySelector('.bottom-nav');
    
    function getScrollTop() {
        // Try viewContainer first, then fall back to document/window scroll
        if (viewContainer && viewContainer.scrollTop > 0) {
            return viewContainer.scrollTop;
        }
        return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }
    
    function handleScroll() {
        const currentScrollY = getScrollTop();
        const scrollDelta = currentScrollY - lastScrollY;
        
        // Only trigger if scroll amount exceeds threshold
        if (Math.abs(scrollDelta) > scrollThreshold) {
            if (scrollDelta > 0 && currentScrollY > 50) {
                // Scrolling down (content moving up) - HIDE dock only (header stays fixed)
                if (bottomNav && bottomNav.style.display !== 'none') {
                    bottomNav.classList.add('dock-hidden');
                }
            } else if (scrollDelta < 0) {
                // Scrolling up (content moving down) - SHOW dock
                if (bottomNav) bottomNav.classList.remove('dock-hidden');
            }
            lastScrollY = currentScrollY;
        }
        
        // Always show dock when at top
        if (currentScrollY <= 10) {
            if (bottomNav) bottomNav.classList.remove('dock-hidden');
            lastScrollY = 0;
        }
        
        ticking = false;
    }
    
    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }
    
    // Listen on both viewContainer and window for maximum compatibility
    if (viewContainer) {
        viewContainer.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
});
