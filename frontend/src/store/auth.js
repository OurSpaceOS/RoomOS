
import { create } from 'zustand';

const safeParse = (key) => {
    try {
        const item = localStorage.getItem(key);
        if (!item || item === '[object Object]') return null;
        return JSON.parse(item);
    } catch (e) {
        // Only log if it's genuinely corrupted and not just a weird string
        localStorage.removeItem(key);
        return null;
    }
};

const useAuthStore = create((set) => ({
    token: localStorage.getItem('token') || null,
    user: safeParse('user'),
    group: safeParse('group'),

    setToken: (token) => {
        localStorage.setItem('token', token);
        set({ token });
    },

    setUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
    },

    setGroup: (group) => {
        localStorage.setItem('group', JSON.stringify(group));
        set({ group });
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('group');
        set({ token: null, user: null, group: null });
    }
}));

export default useAuthStore;
