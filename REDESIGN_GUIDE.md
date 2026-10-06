# Conduit frontend redesign

This bundle is a visual redesign of the provided React + Vite frontend. The existing API, authentication, room, file-upload, and STOMP/WebSocket service layers were intentionally left in place.

## Main UI changes
- Unified product chrome with a reusable `AppNav` and `BrandMark`.
- Rebuilt authentication screens into a premium split layout.
- Rebuilt Home as a real workspace dashboard for joining/creating rooms.
- Rebuilt Discover with a directory-style room browser.
- Rebuilt Profile with people, room history, stats, and photo interaction.
- Rebuilt Chat with a dedicated workspace shell, room header, connection status, cleaner message hierarchy, media treatment, and composer.
- Reworked member and user profile overlays into responsive panels/modals.
- Added skeleton loading states and stronger empty/error states.
- Added responsive behavior for mobile widths and touch targets.
- Added restrained motion and reduced-motion support.
- Changed the visual system to Manrope + JetBrains Mono with one restrained amber accent.

## Files added
- `src/components/AppNav.jsx`
- `src/components/BrandMark.jsx`

## Files substantially redesigned
- `src/App.css`
- `src/App.jsx`
- `src/index.css`
- `index.html`
- `src/components/AuthShell.jsx`
- `src/components/LoginPage.jsx`
- `src/components/RegisterPage.jsx`
- `src/components/VerifyEmailPage.jsx`
- `src/components/CompleteProfilePage.jsx`
- `src/components/ForgotPasswordPage.jsx`
- `src/components/ResetPasswordPage.jsx`
- `src/components/JoinCreateChat.jsx`
- `src/components/MyRooms.jsx`
- `src/components/DiscoverRooms.jsx`
- `src/components/Profile.jsx`
- `src/components/ChatPage.jsx`
- `src/components/Avatar.jsx`
- `src/components/MediaMessage.jsx`
- `src/components/MembersModal.jsx`
- `src/components/MembersPanel.jsx`
- `src/components/UserProfileModal.jsx`

## Validation
All 33 JavaScript/JSX source files parse successfully with the TypeScript parser used for source validation.

A full Vite build was not executed because dependency installation in the sandbox timed out; the redesign therefore has source-level validation but not a completed dependency-backed browser build in this environment.
