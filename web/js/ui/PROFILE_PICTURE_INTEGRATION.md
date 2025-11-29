# Profile Picture Integration Instructions

## Step 1: Import the module in profile.js

Add this import at the top of `profile.js`:

```javascript
import { renderProfilePictureCard, initProfilePictureHandlers } from './profile-picture-handler.js';
```

## Step 2: Add the card to the HTML

In the `html` template string (around line 42), add this BEFORE the "User Info Card" comment:

```javascript
${renderProfilePictureCard(user)}
```

So it should look like:
```javascript
const html = `
  <div class="fade-in" style="padding-bottom: 100px;">

    ${renderProfilePictureCard(user)}

    <!-- User Info Card -->
    <div class="card">
```

## Step 3: Initialize handlers

After `container.innerHTML = html;` (around line 149), add this line with the other event listeners:

```javascript
initProfilePictureHandlers();
```

So it should look like:
```javascript
container.innerHTML = html;

// === EVENT LISTENERS ===

initProfilePictureHandlers();  // <-- ADD THIS LINE
document.getElementById('save-schedule-btn')?.addEventListener('click', saveSchedule);
```

## That's it!

The profile picture upload functionality will now work on the profile page.
