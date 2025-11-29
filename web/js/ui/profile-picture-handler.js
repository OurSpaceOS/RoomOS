import { apiCall } from '../api.js';
import { showToast } from './toast.js';
import { getState, setState } from '../state.js';

/**
 * Renders the profile picture upload UI
 * @param {Object} user - Current user object with profile_picture field
 * @returns {string} HTML string for profile picture card
 */
export function renderProfilePictureCard(user) {
  return `
    <div class="card">
      <h2>Profile Picture</h2>
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg);">
        <!-- Current Picture Display -->
        <div id="current-profile-pic">
          ${user.profile_picture ? `
            <img src="${user.profile_picture}" alt="${user.name}" 
                 style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--accent-primary);">
          ` : `
            <div style="width: 120px; height: 120px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 800; color: white; border: 4px solid var(--accent-primary);">
              ${user.name.charAt(0).toUpperCase()}
            </div>
          `}
        </div>
        
        <!-- Hidden File Input -->
        <input type="file" id="profile-pic-input" accept="image/jpeg,image/jpg,image/png,image/webp" style="display: none;">
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; justify-content: center;">
          <button id="choose-pic-btn" class="btn btn-primary">
            <i class="ph ph-camera"></i> ${user.profile_picture ? 'Change Picture' : 'Upload Picture'}
          </button>
          ${user.profile_picture ? `
            <button id="remove-pic-btn" class="btn" style="background: var(--danger); color: white;">
              <i class="ph ph-trash"></i> Remove
            </button>
          ` : ''}
        </div>
        
        <!-- Preview Container (Hidden initially) -->
        <div id="pic-preview-container" style="display: none; width: 100%; text-align: center;">
          <img id="pic-preview" src="" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: var(--radius-md); margin-bottom: var(--space-md); border: 2px solid var(--accent-primary);">
          <div style="display: flex; gap: var(--space-sm); justify-content: center;">
            <button id="upload-pic-btn" class="btn btn-primary">
              <i class="ph ph-upload"></i> Upload
            </button>
            <button id="cancel-pic-btn" class="btn" style="background: var(--bg-elevated); color: var(--text-primary);">
              Cancel
            </button>
          </div>
        </div>
        
        <p style="font-size: 0.75rem; color: var(--text-tertiary); text-align: center; margin: 0;">
          Maximum 2MB • JPEG, PNG, WebP
        </p>
      </div>
    </div>
  `;
}

/**
 * Initializes event listeners for profile picture functionality
 */
export function initProfilePictureHandlers() {
  const choosePicBtn = document.getElementById('choose-pic-btn');
  const removePicBtn = document.getElementById('remove-pic-btn');
  const fileInput = document.getElementById('profile-pic-input');
  const uploadBtn = document.getElementById('upload-pic-btn');
  const cancelBtn = document.getElementById('cancel-pic-btn');

  if (choosePicBtn) {
    choosePicBtn.addEventListener('click', () => {
      fileInput?.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', handleUpload);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelPreview);
  }

  if (removePicBtn) {
    removePicBtn.addEventListener('click', handleRemove);
  }
}

let selectedImageData = null;

/**
 * Handles file selection and preview
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showToast('Invalid file type. Please select JPEG, PNG, or WebP image.', 'error');
    event.target.value = '';
    return;
  }

  // Validate file size (2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('Image size exceeds 2MB. Please choose a smaller image.', 'error');
    event.target.value = '';
    return;
  }

  try {
    // Read and compress image
    const compressedImage = await compressImage(file);
    selectedImageData = compressedImage;

    // Show preview
    const previewImg = document.getElementById('pic-preview');
    const previewContainer = document.getElementById('pic-preview-container');
    
    if (previewImg && previewContainer) {
      previewImg.src = compressedImage;
      previewContainer.style.display = 'block';
    }
  } catch (error) {
    showToast('Failed to process image: ' + error.message, 'error');
    event.target.value = '';
  }
}

/**
 * Compresses and converts image to base64
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 400x400)
        let width = img.width;
        let height = img.height;
        const maxDim = 400;
        
        if (width > height && width > maxDim) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width / height) * maxDim;
          height = maxDim;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 (JPEG with 0.85 quality)
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(base64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads the selected profile picture
 */
async function handleUpload() {
  if (!selectedImageData) {
    showToast('No image selected', 'error');
    return;
  }

  const uploadBtn = document.getElementById('upload-pic-btn');
  const originalText = uploadBtn.innerHTML;
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin"></i> Uploading...';

  try {
    const token = localStorage.getItem('token');
    const response = await apiCall('/auth/upload-profile-picture', 'POST', {
      image: selectedImageData
    }, token);

    // Update state
    const state = getState();
    state.user.profile_picture = response.profile_picture;
    setState(state);

    showToast('Profile picture uploaded successfully!', 'success');
    
    // Reload profile page to show new picture
    setTimeout(() => {
      if (window.app && window.app.navigate) {
        window.app.navigate('profile');
      }
    }, 500);
  } catch (error) {
    showToast(error.message || 'Failed to upload profile picture', 'error');
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = originalText;
  }
}

/**
 * Cancels the preview and resets selection
 */
function cancelPreview() {
  const fileInput = document.getElementById('profile-pic-input');
  const previewContainer = document.getElementById('pic-preview-container');
  
  if (fileInput) fileInput.value = '';
  if (previewContainer) previewContainer.style.display = 'none';
  
  selectedImageData = null;
}

/**
 * Removes the current profile picture
 */
async function handleRemove() {
  if (!confirm('Are you sure you want to remove your profile picture?')) {
    return;
  }

  const removeBtn = document.getElementById('remove-pic-btn');
  const originalText = removeBtn.innerHTML;
  removeBtn.disabled = true;
  removeBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin"></i> Removing...';

  try {
    const token = localStorage.getItem('token');
    await apiCall('/auth/remove-profile-picture', 'POST', null, token);

    // Update state
    const state = getState();
    state.user.profile_picture = null;
    setState(state);

    showToast('Profile picture removed successfully!', 'success');
    
    // Reload profile page
    setTimeout(() => {
      if (window.app && window.app.navigate) {
        window.app.navigate('profile');
      }
    }, 500);
  } catch (error) {
    showToast(error.message || 'Failed to remove profile picture', 'error');
    removeBtn.disabled = false;
    removeBtn.innerHTML = originalText;
  }
}
