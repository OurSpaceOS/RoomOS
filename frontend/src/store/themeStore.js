
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
    persist(
        (set) => ({
            mode: 'light',
            toggleTheme: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
            setMode: (mode) => set({ mode }),
        }),
        {
            name: 'theme-storage',
        }
    )
);

export default useThemeStore;
