Problem Statement
The current roomOS web app has aggressive caching (service worker + IndexedDB) that prevents real-time data updates. Users need to manually clear cache to see fresh data. The goal is to create a Tauri desktop/mobile app that embeds the web frontend with proper cache management for real-time updates.
Current State
Web app located in /home/purrs/roomOS/web/ with HTML/CSS/JS
Service worker (sw.js) caches all static assets and uses stale-while-revalidate strategy
API calls via api.js cache GET responses in IndexedDB indefinitely
No cache invalidation or real-time update mechanism
API base: https://prospine.in/roomOS/server/public
Proposed Solution
1. Initialize Tauri Project
Create new Tauri project in /home/purrs/roomOS/tauri-app/
Configure Tauri to use the web frontend as embedded assets
Set up proper build configuration
2. Fix Web App Caching Issues
Before embedding, modify the web app to work properly without aggressive caching:
Remove/disable service worker: Delete or modify sw.js to not cache API responses
Remove IndexedDB caching: Modify api.js to remove GET response caching
Add cache-busting headers: Update API calls to include Cache-Control: no-cache headers
Implement proper data refresh: Add polling or WebSocket support for real-time updates
Keep offline queue: Retain the offline action queue for POST/PUT operations if needed
3. Configure Tauri App
Copy web files to Tauri's src or dist directory
Configure tauri.conf.json for proper window settings and permissions
Set up API permissions (HTTP requests to the server)
Configure CSP (Content Security Policy) to allow API calls
4. Testing Strategy
Test data refresh after updates on server
Verify no stale data issues
Test offline behavior (optional)
Build for target platforms (Linux, Windows, macOS, Android, iOS)
