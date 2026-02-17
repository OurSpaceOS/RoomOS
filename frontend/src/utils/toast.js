import { toast as sonnerToast } from 'sonner';

/**
 * Safe toast wrapper that prevents stuck toasts
 * Adds delay between dismiss and show, uses unique IDs, and forces auto-dismiss
 */

let toastCounter = 0;

const createSafeToast = (type) => {
    return (message, options = {}) => {
        // Generate unique ID if not provided
        const id = options.id || `toast-${type}-${++toastCounter}-${Date.now()}`;
        const duration = options.duration || 2000;

        // Dismiss all toasts first
        sonnerToast.dismiss();

        // Add delay to prevent race condition
        setTimeout(() => {
            // Show the toast with unique ID
            sonnerToast[type](message, {
                ...options,
                id,
                duration,
            });

            // Force dismiss as backup after duration + 100ms
            setTimeout(() => {
                sonnerToast.dismiss(id);
            }, duration + 100);
        }, 50);
    };
};

// Create safe versions of all toast methods
export const toast = {
    success: createSafeToast('success'),
    error: createSafeToast('error'),
    info: createSafeToast('info'),
    warning: createSafeToast('warning'),
    loading: createSafeToast('loading'),

    // Pass through dismiss and promise methods
    dismiss: (id) => sonnerToast.dismiss(id),
    promise: sonnerToast.promise,
};

export default toast;
