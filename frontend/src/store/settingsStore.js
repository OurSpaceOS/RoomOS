
import { create } from 'zustand';
import api from '../api';

const useSettingsStore = create((set, get) => ({
    settings: {}, // Local cache of user settings
    isLoading: false,

    // Fetch all user settings
    fetchSettings: async () => {
        set({ isLoading: true });
        try {
            const data = await api.get('/settings/get');
            // Data is expected as { settings: { key: value, ... } }
            if (data?.settings) {
                set({ settings: data.settings });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    // Get a specific setting helper
    getSetting: (key, defaultValue = null) => {
        const value = get().settings[key];
        if (value === undefined) return defaultValue;

        // Parse numbers/booleans if they are stored as strings
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    },

    // Get JSON parsed setting
    getJsonSetting: (key, defaultValue = {}) => {
        const val = get().getSetting(key);
        if (!val) return defaultValue;
        try {
            return JSON.parse(val);
        } catch (e) {
            console.error(`Failed to parse JSON for setting ${key}:`, e);
            return defaultValue;
        }
    },

    // Set a setting (optimistic update + local sync)
    updateSetting: async (key, value) => {
        // Optimistic update
        const previousSettings = get().settings;
        set({
            settings: {
                ...previousSettings,
                [key]: String(value)
            }
        });

        try {
            await api.post('/settings/set', { key, value: String(value) });
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
            // Rollback on failure
            set({ settings: previousSettings });
        }
    },

    // Convenience computed property for has_maid
    hasMaid: () => {
        const val = get().settings['has_maid'];
        return val === 'true'; // Stored as string in DB
    }
}));

export default useSettingsStore;
