
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

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
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
