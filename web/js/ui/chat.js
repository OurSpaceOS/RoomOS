import { apiCall } from '../api.js';

let pollInterval = null;
let lastId = 0;

export async function renderChat() {
    const container = document.getElementById('view-container');

    // Cleanup previous poll if any
    if (pollInterval) clearInterval(pollInterval);
    lastId = 0;

    container.innerHTML = `
        <style>
            .msg-bubble {
                max-width: 75%;
                padding: 10px 14px;
                border-radius: 18px;
                margin-bottom: 8px;
                word-wrap: break-word;
                animation: slideIn 0.2s ease-out;
            }
            
            .msg-bubble.me {
                align-self: flex-end;
                background: linear-gradient(135deg, #007AFF, #0051D5);
                color: white;
                border-bottom-right-radius: 4px;
            }
            
            .msg-bubble.them {
                align-self: flex-start;
                border-bottom-left-radius: 4px;
                color: white;
            }
            
            /* User-specific colors for chat bubbles */
            .msg-bubble.user-0 { background: linear-gradient(135deg, #FF6B6B, #EE5A6F); color: white; }
            .msg-bubble.user-1 { background: linear-gradient(135deg, #4ECDC4, #44A08D); color: white; }
            .msg-bubble.user-2 { background: linear-gradient(135deg, #A8E6CF, #56AB91); color: #1a1a1a; }
            .msg-bubble.user-3 { background: linear-gradient(135deg, #FFD93D, #F6C23E); color: #1a1a1a; }
            .msg-bubble.user-4 { background: linear-gradient(135deg, #95E1D3, #38B2AC); color: #1a1a1a; }
            .msg-bubble.user-5 { background: linear-gradient(135deg, #F38181, #E74C3C); color: white; }
            .msg-bubble.user-6 { background: linear-gradient(135deg, #AA96DA, #9B59B6); color: white; }
            .msg-bubble.user-7 { background: linear-gradient(135deg, #FCBAD3, #E91E63); color: #1a1a1a; }
            .msg-bubble.user-8 { background: linear-gradient(135deg, #A8DADC, #457B9D); color: white; }
            .msg-bubble.user-9 { background: linear-gradient(135deg, #FFB6B9, #FF6B9D); color: white; }
            
            /* Sender name colors for light bubbles */
            .msg-bubble.user-2 .sender,
            .msg-bubble.user-3 .sender,
            .msg-bubble.user-4 .sender,
            .msg-bubble.user-7 .sender {
                color: rgba(0,0,0,0.8);
            }
            
            /* Time colors for light bubbles */
            .msg-bubble.user-2 .time,
            .msg-bubble.user-3 .time,
            .msg-bubble.user-4 .time,
            .msg-bubble.user-7 .time {
                color: rgba(0,0,0,0.6);
            }
            
            .msg-bubble .sender {
                font-size: 0.75rem;
                font-weight: 600;
                margin-bottom: 4px;
                color: rgba(255,255,255,0.95);
            }
            
            .msg-bubble.me .sender {
                color: rgba(255,255,255,0.9);
            }
            
            .msg-bubble .text {
                font-size: 0.95rem;
                line-height: 1.4;
                margin-bottom: 4px;
            }
            
            .msg-bubble .time {
                font-size: 0.7rem;
                opacity: 0.8;
                text-align: right;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            #chat-input-container {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 12px 16px;
                background: var(--bg-primary);
                border-top: 1px solid var(--bg-tertiary);
                z-index: 100;
            }
            
            .hamburger-menu {
                position: fixed;
                top: 0;
                right: -100%;
                width: 280px;
                height: 100vh;
                transition: right 0.3s ease;
                z-index: 1000;
                box-shadow: -2px 0 10px rgba(0,0,0,0.3);
            }
            
            /* Light theme menu */
            [data-theme="light"] .hamburger-menu {
                background: #FFFFFF;
                color: #000000;
            }
            
            /* Dark theme menu */
            [data-theme="dark"] .hamburger-menu {
                background: #1C1C1E;
                color: #FFFFFF;
            }
            
            .hamburger-menu.open {
                right: 0;
            }
            
            .menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
                display: none;
            }
            
            .menu-overlay.show {
                display: block;
            }
            
            .menu-divider {
                height: 1px;
                margin: 0;
            }
            
            [data-theme="light"] .menu-divider {
                background: #E5E5E7;
            }
            
            [data-theme="dark"] .menu-divider {
                background: #3A3A3C;
            }
        </style>
        <div class="fade-in" style="height: 100vh; display: flex; flex-direction: column;">
         
            
            <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 10px 16px 80px 16px; display: flex; flex-direction: column; gap: 4px;">
                <div class="loader flex-center w-full"></div>
            </div>
        </div>
        
        <div id="chat-input-container">
            <div style="display: flex; gap: 10px; max-width: 800px; margin: 0 auto;">
                <input type="text" id="chat-input" class="input-field" placeholder="Type a message..." style="margin-bottom: 0; flex: 1;">
                <button id="send-btn" class="btn btn-primary" style="border-radius: 50%; width: 48px; height: 48px; padding: 0; display: flex; align-items: center; justify-content: center;">➤</button>
            </div>
        </div>
        
        <div class="menu-overlay" id="menu-overlay"></div>
        <div class="hamburger-menu" id="hamburger-menu">
            <div style="padding: 20px;">
                <h2 style="margin: 0;">Menu</h2>
            </div>
            <hr class="menu-divider">
            <div style="padding: 10px;">
                <button onclick="app.navigate('dashboard')" class="btn" style="width: 100%; text-align: left; margin-bottom: 8px; background: var(--bg-input); color: var(--text-primary);">
                    <i class="ph ph-house" style="margin-right: 8px;"></i> Home
                </button>
                <button onclick="app.navigate('roster')" class="btn" style="width: 100%; text-align: left; margin-bottom: 8px; background: var(--bg-input); color: var(--text-primary);">
                    <i class="ph ph-calendar" style="margin-right: 8px;"></i> Plan
                </button>
                <button onclick="app.navigate('crew')" class="btn" style="width: 100%; text-align: left; margin-bottom: 8px; background: var(--bg-input); color: var(--text-primary);">
                    <i class="ph ph-users" style="margin-right: 8px;"></i> Crew
                </button>
                <button onclick="app.navigate('rules')" class="btn" style="width: 100%; text-align: left; margin-bottom: 8px; background: var(--bg-input); color: var(--text-primary);">
                    <i class="ph ph-scroll" style="margin-right: 8px;"></i> Rules
                </button>
                <button onclick="app.navigate('transactions')" class="btn" style="width: 100%; text-align: left; margin-bottom: 8px; background: var(--bg-input); color: var(--text-primary);">
                    <i class="ph ph-currency-dollar" style="margin-right: 8px;"></i> Money
                </button>
            </div>
        </div>
    `;

    const msgContainer = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const user = JSON.parse(localStorage.getItem('user'));

    // Initial Load
    await loadMessages(msgContainer, user.id);

    // Remove auto-polling - now manual refresh only
    // pollInterval = setInterval(() => loadMessages(msgContainer, user.id), 3000);

    // Send Handler
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        input.value = ''; // Optimistic clear

        // Offline Handling
        if (!navigator.onLine) {
            try {
                const { queueAction } = await import('../store.js');
                await queueAction('/chat/send', 'POST', { message: text });

                // Optimistic UI Update
                const div = document.createElement('div');
                div.className = 'msg-bubble me';
                div.style.opacity = '0.7'; // Visual indicator for pending
                div.innerHTML = `
                    <div class="sender">You (Pending)</div>
                    <div class="text">${text}</div>
                    <div class="time"><i class="ph ph-clock"></i> Waiting for connection</div>
                `;
                msgContainer.appendChild(div);
                msgContainer.scrollTop = msgContainer.scrollHeight;

            } catch (e) {
                alert('Failed to queue message');
            }
            return;
        }

        try {
            await apiCall('/chat/send', 'POST', { message: text }, localStorage.getItem('token'));
            loadMessages(msgContainer, user.id); // Immediate fetch
        } catch (e) {
            alert('Failed to send');
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

async function loadMessages(container, myId) {
    try {
        const token = localStorage.getItem('token');
        const res = await apiCall(`/chat/since?last_id=${lastId}`, 'GET', null, token);

        if (res.messages.length > 0) {
            // Remove loader if present
            const loader = container.querySelector('.loader');
            if (loader) loader.remove();

            res.messages.forEach(msg => {
                lastId = Math.max(lastId, msg.id);
                const isMe = msg.sender_id == myId;

                // Assign color based on user ID (modulo 10 for color rotation)
                const userColorClass = !isMe ? `user-${msg.sender_id % 10}` : '';

                const div = document.createElement('div');
                div.className = `msg-bubble ${isMe ? 'me' : `them ${userColorClass}`}`;
                
                const date = new Date(msg.created_at + ' UTC');
                date.setHours(date.getHours() - 1);

                div.innerHTML = `
                    ${!isMe ? `<div class="sender">${msg.name}</div>` : ''}
                    <div class="text">${msg.message}</div>
                    <div class="time">${date.toLocaleTimeString([], {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })}</div>
                `;
                container.appendChild(div);
            });

            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else if (lastId === 0) {
            const loader = container.querySelector('.loader');
            if (loader) loader.innerHTML = '<p style="color: var(--text-secondary)">No messages yet</p>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="card" style="margin:16px; border-left: 4px solid var(--danger); animation: fadeIn 0.3s ease-out;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="ph ph-warning-circle" style="font-size: 2rem; color: var(--danger);"></i>
                    <div style="flex: 1;">
                        <h3 style="margin: 0; font-weight: 600; color: var(--text-primary);">An Error Occurred</h3>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">${e.message}</p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Stop polling when navigating away
export function stopChatPolling() {
    if (pollInterval) clearInterval(pollInterval);
}
