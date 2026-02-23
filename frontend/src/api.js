
import axios from 'axios';

// Base API URL
export const API_BASE = 'https://prospine.in/roomOS/server/public';

// Setup Axio instance with base URL
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

import { toast } from 'sonner';

let hasShownDemoWarning = false;

// Request Interceptor: Attach Token & Demo Mode Protection
api.interceptors.request.use((config) => {
    // 1. Attach Token
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Read-Only Demo Protection
    const isDemoMode = sessionStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
        const method = config.method?.toUpperCase();
        const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        const isLoginEndpoint = config.url?.includes('/auth/login');
        
        // Block write operations EXCEPT for the initial auto-login
        if (isWriteOperation && !isLoginEndpoint) {
            if (!hasShownDemoWarning) {
                toast.warning('Demo Mode: Action disabled. This is a read-only preview.');
                hasShownDemoWarning = true;
            }
            // Cancel the request by throwing a custom cancellation error
            return Promise.reject({
                response: { data: { message: 'Demo Mode: Action disabled. This is a read-only preview.' } },
                isDemoCancel: true 
            });
        }
    }

    return config;
});

// Response Interceptor: Handle Auth Errors
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (error.response.data?.error !== 'Invalid credentials') {
                // If 401 and not a login failure, it's an expired token. Logout.
                localStorage.removeItem('token');
                localStorage.removeItem('group');
                window.location.href = '/login';
            }
        }
        // Return a clean error message
        const message = error.response?.data?.error || error.message || 'An error occurred';
        return Promise.reject(new Error(message));
    }
);

export default api;
