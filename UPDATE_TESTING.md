# Testing the Update Notification System

## Quick Test Steps:

### 1. **Clear Dismissed Updates** (if you tested before)
Open browser console (F12) and run:
```javascript
localStorage.removeItem('dismissed_update_version');
```

### 2. **Manually Trigger Update Check**
In the browser console, run:
```javascript
app.checkForUpdates();
```

### 3. **Check Console Logs**
You should see:
```
Update check response: {success: true, current_version: "1.0.0", latest_version: "1.1.0", has_update: true, ...}
New update available! {success: true, ...}
```

### 4. **Verify Popup Appears**
The update popup should appear with:
- 🎉 emoji
- "New Update Available!"
- Version 1.1.0
- Release notes
- "Later" and "Download Now" buttons

## Troubleshooting:

### If popup doesn't show:

1. **Check if you're logged in**
   - Update checker only runs for logged-in users
   - Check: `localStorage.getItem('token')`

2. **Check browser console for errors**
   - Press F12 → Console tab
   - Look for red error messages

3. **Verify API endpoint**
   - Open: `https://prospine.in/roomOS/server/public/updates/check`
   - Should return JSON with `has_update: true`

4. **Check if you dismissed it**
   - Run: `localStorage.getItem('dismissed_update_version')`
   - If it returns "1.1.0", clear it: `localStorage.removeItem('dismissed_update_version')`

5. **Hard refresh the page**
   - Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - This clears cached JavaScript files

## Current Settings:

The UpdateController is currently set to:
- **Current Version**: 1.0.0
- **Latest Version**: 1.1.0 ✅ (triggers update)
- **Download URL**: https://github.com/Sumit7739/roomOS/releases/latest

## How to Change:

Edit `/server/src/Controllers/UpdateController.php`:

```php
$currentVersion = '1.0.0';
$latestVersion = '1.2.0';  // ← Change this
$releaseDate = '2025-11-23';
$downloadUrl = 'YOUR_NEW_DOWNLOAD_LINK';
$releaseNotes = [
    'Your new feature 1',
    'Your new feature 2'
];
```

Save and the changes take effect immediately!
