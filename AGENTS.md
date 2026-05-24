# FamiChat Design and Architecture Guidelines

This file outlines the critical architectural, routing, and user interface consistency rules established for FamiChat. Future agents MUST strictly adhere to these rules and avoid altering or removing these functionalities during updates.

---

## 1. Browser Navigation and History Sync (Back Button Support)
All modals, popups, and full-screen overlays must integrate seamlessly with the HTML5 History API (`window.history.pushState` and `window.history.replaceState`) to ensure browser/mobile swipe-back gestures close overlays progressively instead of exiting or crashing the application:

*   **Active Views:**
    *   Baseline state when the user is logged in: `view: 'list'` (Chat lists).
    *   Active Chat Room: `view: 'chat'`.
    *   Chat Info Detail Sidebar: `view: 'chat_info'`.
*   **Overlay Views (More Menu and Modals):**
    *   The 3-dots Menu container: `view: 'menu'`.
    *   Guide / FAQ Modal: `view: 'faq'`.
    *   App Credits Modal: `view: 'credits'`.
    *   PWA Installation Guide Modal: `view: 'pwa_modal'`.
    *   PIN Identity Modal: `view: 'pin_modal'`.

### Back-Closure Propagation Rule
When overlays are closed using their internal "Close" (`x`) or "Cancel" buttons, the action must trigger a history-back step (`window.history.back()`) if the overlay was accessed via a push action. This updates the state history cleanly and returns the user to the correct prior state (specifically keeping the parent dropdown/trigger visible when returning).

---

## 2. MoreMenu (Three-Dots Dropdown) Stateful Integrity
*   **Persist Menu Open-State:** The 3-dot dropdown menu should **not** automatically close immediately when an overlay triggers. Closing an overlay (such as Credits, FAQ, or physical PIN prompt) must restore focus back to the 3-dots dropdown.
*   **Outside Click Guards:** To prevent accidental closures, clicks occurring outside the `MoreMenu` when standard modals (FAQ, Pin, Credits, PWA modal) are active must **not** trigger the menu's outside-click close listener. This is guarded using elements like:
    *   `'credits-modal-overlay'`
    *   `'pwa-install-modal-overlay'`
    *   `'pin-verification-modal-overlay'`
    *   `'famichat-help-modal'`

---

## 3. Account Access & PIN Switching Logic
*   **Nomenclature Protection:** The switch button in the account section of the menu must strictly remain labeled **"Switcher de Perfil"**. Do NOT rename this back to generic alternatives like *"Cambiar de Perfil"*.
*   **Switching Redirect Target:** 
    *   If the user initiates profile switching, they are prompted for their security PIN.
    *   If the PIN verification is **canceled**, they must be cleanly returned to the `MoreMenu` dropdown (reloading the state).
    *   Upon **successful** PIN authorization, they must be redirected automatically back to the main Welcome selection dashboard: **"¿Quién está ingresando hoy?"** (unlogging the active session state), rather than remaining on the chat window elements.

---

## 4. Feature Restoration Safeguards
*   **App Credits:** Ensure the custom App Credits metadata info, developer mentions, and build state logs are properly linked and rendering properly when launched.
