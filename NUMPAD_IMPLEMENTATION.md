# Numpad and Admin Lock Implementation

## Summary of Changes

This implementation addresses the requirements for numpad improvements, mobile fullscreen support, and admin lock functionality.

## Changes Made

### 1. Mobile Fullscreen CSS (`app/src/ui/numpad.css`)
- Added `@media (max-width: 768px)` query for mobile devices
- Numpad now displays in true fullscreen on mobile (position: fixed; inset: 0)
- Uses `100dvh` (dynamic viewport height) for better mobile support
- Responsive layout with flex-grow for numpad grid
- Sticky Enter button at bottom
- Larger close button (44x44px) for better touch targets

### 2. Admin Lock State Management (`app/src/state/admin.js`)
- Created state management for admin authentication
- Manages `lockNonInputs` flag to control UI element locking
- Provides `isLocked()` and `isAdminAuthenticated()` getters
- Implements pub/sub pattern with `subscribe()` for state changes
- Automatically unlocks when admin authenticates

### 3. Click Guard (`app/src/ui/Guards/ClickGuard.js`)
- Prevents clicks on non-input elements when lock is active
- Uses capture phase event listeners for `pointerdown` and `click`
- Allows clicks on:
  - Input elements (input, select, textarea)
  - Elements with `[data-allow-click]` attribute
  - Numpad elements
- Integrated into main application initialization

### 4. Admin Helper (`app/src/hooks/useAdmin.js`)
- Provides `useAdmin()` function to get current admin state
- Helper function `toggleLock()` for toggling lock state
- Integrates with existing SHA-256 based authentication system
- No plain text password comparison (uses main.js verifyAdminCodeInput)

### 5. Integration (`app/main.js`)
- Imported and initialized ClickGuard on app startup
- Updated admin login function to sync with admin state
- Admin authentication now unlocks the UI automatically

### 6. HTML Updates (`app/index.html`)
- Added `data-allow-click` to header navigation
- Added `data-allow-click` to admin section
- Added `data-allow-click` to numpad overlay

## Testing

### Unit Tests (`tests/admin.state.test.js`)
- 7 new tests for admin state management
- Tests cover:
  - Initial state (locked)
  - Lock toggling
  - Admin authentication
  - Auto-unlock on authentication
  - Listener notifications
  - Unsubscribe functionality
  - Multiple listeners

### E2E Tests (`tests/e2e/numpad-improvements.spec.ts`)
- Tests for red cross button behavior (no focus jump)
- Tests for Enter key commit and close
- Tests for mobile fullscreen layout
- Tests for mobile button responsiveness
- Tests for admin lock functionality
- Tests for admin code unlock

## Build & Test Results
- ✅ All 98 unit tests passing (including 7 new admin tests)
- ✅ Build successful
- ✅ Linting passed
- ✅ CSS properly compiled

## Existing Functionality Preserved
- All existing numpad tests continue to pass
- Tab/Shift+Tab navigation works
- Escape key cancels without commit
- Backdrop click closes without commit
- Enter key commits and closes (already working, verified)
- Close button functionality (already working, verified)

## Mobile Improvements
- Fullscreen mode on viewports ≤768px
- Better touch targets (44px minimum)
- Dynamic viewport height support (100dvh)
- GPU-accelerated rendering (transform: translateZ(0))
- Touch-optimized interactions

## Admin Lock Features
- Lock is active by default on page load
- Only input fields are interactive when locked
- Navigation and admin section remain accessible (data-allow-click)
- Uses existing SHA-256 hashed admin authentication (from tenant config)
- Lock state can be toggled programmatically
- Click guard prevents all non-whitelisted interactions
- Event listeners use passive: false (required for preventDefault())

## Browser Compatibility
- Modern browsers with ES6+ support
- Mobile Safari (iOS)
- Chrome/Edge (Android & Desktop)
- Firefox (Desktop & Mobile)
- Dynamic viewport units (100dvh) with fallback to 100vh

## Notes
- The existing numpad code already handled Enter and close button correctly
- Focus management was already robust (prevents unwanted jumps)
- This implementation adds the mobile fullscreen and admin lock features
- Admin authentication integrates with existing auth system
