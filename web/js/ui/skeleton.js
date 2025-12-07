// Skeleton Loading Utilities
// Provides reusable skeleton components for loading states

// CSS for skeleton animation - add this once to the page
export const skeletonStyles = `
    <style id="skeleton-styles">
        @keyframes skeleton-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.7; }
        }
        .skeleton {
            background: var(--bg-tertiary);
            animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .skeleton-text {
            height: 14px;
            border-radius: 6px;
        }
        .skeleton-title {
            height: 24px;
            border-radius: 8px;
        }
        .skeleton-card {
            border-radius: var(--radius-xl);
            background: var(--bg-tertiary);
            animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .skeleton-avatar {
            border-radius: 50%;
        }
    </style>
`;

// Generic skeleton card
export function skeletonCard(height = '120px') {
    return `<div class="skeleton skeleton-card" style="height: ${height}; margin-bottom: 16px;"></div>`;
}

// Dashboard skeleton
export function dashboardSkeleton() {
    return `
        <div class="fade-in" style="padding-bottom: 80px;">
            ${skeletonStyles}
            
            <!-- Greeting Skeleton -->
            <div style="margin-bottom: 24px;">
                <div class="skeleton skeleton-text" style="width: 150px; height: 20px; margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-title" style="width: 220px;"></div>
            </div>
            
            <!-- Date/Time Card Skeleton -->
            <div class="skeleton skeleton-card" style="height: 140px; margin-bottom: 24px;"></div>
            
            <!-- Schedule Card Skeleton -->
            <div class="skeleton skeleton-card" style="height: 100px; margin-bottom: 24px;"></div>
            
            <!-- Tasks Card Skeleton -->
            <div class="skeleton skeleton-card" style="height: 180px;"></div>
        </div>
    `;
}

// Transactions skeleton
export function transactionsSkeleton() {
    return `
        <div class="fade-in" style="padding-bottom: 80px;">
            ${skeletonStyles}
            
            <!-- Header Skeleton -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div class="skeleton skeleton-title" style="width: 120px;"></div>
                <div class="skeleton" style="width: 44px; height: 44px; border-radius: 50%;"></div>
            </div>
            
            <!-- Balance Cards Skeleton -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <div class="skeleton skeleton-card" style="flex: 1; height: 100px; margin-bottom: 0;"></div>
                <div class="skeleton skeleton-card" style="flex: 1; height: 100px; margin-bottom: 0;"></div>
            </div>
            
            <!-- Settlements Skeleton -->
            <div class="skeleton skeleton-card" style="height: 80px; margin-bottom: 24px;"></div>
            
            <!-- Transactions List Skeleton -->
            <div class="skeleton skeleton-text" style="width: 140px; margin-bottom: 16px;"></div>
            ${[1,2,3,4].map(() => `
                <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                    <div class="skeleton skeleton-avatar" style="width: 44px; height: 44px;"></div>
                    <div style="flex: 1;">
                        <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: 6px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; height: 12px;"></div>
                    </div>
                    <div class="skeleton skeleton-text" style="width: 60px;"></div>
                </div>
            `).join('')}
        </div>
    `;
}

// Roster skeleton  
export function rosterSkeleton() {
    return `
        <div class="fade-in" style="padding-bottom: 80px;">
            ${skeletonStyles}
            
            <!-- Header Skeleton -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div class="skeleton skeleton-title" style="width: 150px;"></div>
                <div style="display: flex; gap: 8px;">
                    <div class="skeleton" style="width: 36px; height: 36px; border-radius: 8px;"></div>
                    <div class="skeleton" style="width: 36px; height: 36px; border-radius: 8px;"></div>
                </div>
            </div>
            
            <!-- Week Navigation Skeleton -->
            <div class="skeleton skeleton-card" style="height: 50px; margin-bottom: 24px;"></div>
            
            <!-- Days Skeleton -->
            ${[1,2,3,4,5].map(() => `
                <div class="skeleton skeleton-card" style="height: 100px; margin-bottom: 16px;"></div>
            `).join('')}
        </div>
    `;
}

// Crew skeleton
export function crewSkeleton() {
    return `
        <div class="fade-in" style="padding-bottom: 80px;">
            ${skeletonStyles}
            
            <!-- Header Skeleton -->
            <div class="skeleton skeleton-title" style="width: 100px; margin-bottom: 24px;"></div>
            
            <!-- Member Cards Skeleton -->
            ${[1,2,3,4].map(() => `
                <div style="display: flex; gap: 16px; align-items: center; padding: 20px; background: var(--bg-card); border-radius: 16px; margin-bottom: 12px;">
                    <div class="skeleton skeleton-avatar" style="width: 56px; height: 56px;"></div>
                    <div style="flex: 1;">
                        <div class="skeleton skeleton-text" style="width: 120px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80px; height: 12px;"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Rules skeleton
export function rulesSkeleton() {
    return `
        <div class="fade-in" style="padding-bottom: 80px;">
            ${skeletonStyles}
            
            <!-- Header Skeleton -->
            <div class="skeleton skeleton-title" style="width: 80px; margin-bottom: 24px;"></div>
            
            <!-- Rules List Skeleton -->
            ${[1,2,3,4,5].map(() => `
                <div style="padding: 16px; background: var(--bg-card); border-radius: 12px; margin-bottom: 12px;">
                    <div class="skeleton skeleton-text" style="width: 85%; margin-bottom: 8px;"></div>
                    <div class="skeleton skeleton-text" style="width: 65%; height: 12px;"></div>
                </div>
            `).join('')}
        </div>
    `;
}

// Profile skeleton
export function profileSkeleton() {
    return `
        <div class="fade-in" style="padding-bottom: 80px;">
            ${skeletonStyles}
            
            <!-- Profile Header Skeleton -->
            <div style="text-align: center; margin-bottom: 32px;">
                <div class="skeleton skeleton-avatar" style="width: 100px; height: 100px; margin: 0 auto 16px;"></div>
                <div class="skeleton skeleton-title" style="width: 150px; margin: 0 auto 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 100px; margin: 0 auto;"></div>
            </div>
            
            <!-- Stats Cards Skeleton -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <div class="skeleton skeleton-card" style="flex: 1; height: 80px; margin-bottom: 0;"></div>
                <div class="skeleton skeleton-card" style="flex: 1; height: 80px; margin-bottom: 0;"></div>
            </div>
            
            <!-- Settings Sections Skeleton -->
            ${[1,2,3].map(() => `
                <div class="skeleton skeleton-card" style="height: 60px; margin-bottom: 12px;"></div>
            `).join('')}
        </div>
    `;
}
