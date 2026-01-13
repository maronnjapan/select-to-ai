# Repository Guidelines

## Project Structure & Module Organization
The extension lives at the repo root: `manifest.json` wires entry points (`background.js`, `content.js`, `popup.js`, `claude-inject.js`) and loads shared styles in `styles.css` plus assets in `icons/`. Cross-surface helpers stay in `shared/` (`constants.js` bootstraps the `RS` namespace, `utils.js` covers storage and DOM helpers). Content-script behavior is split across `modules/` (settings, selection, floating UI, AI service) while popup logic is isolated to `popup-modules/`. Firefox-specific overrides mirror the same layout under `firefox/`. Keep `docs/architecture.md` handy for flow diagrams and storage contracts whenever you touch a new module or add a key.

## Build, Test, and Development Commands
- `zip -r dist/select-to-ai.zip manifest.json background.js content.js popup.js claude-inject.js shared modules popup-modules icons styles.css` bundles the Chromium build; Chrome’s `chrome://extensions` can then “Load unpacked” from this repo.
- `web-ext run --source-dir firefox` and `web-ext lint --source-dir firefox` (optional) exercise the Firefox flavor if you have Mozilla’s CLI.
- Manual load steps: Chrome → enable Developer Mode → “Load unpacked” → repo root. Firefox → `about:debugging#/runtime/this-firefox` → “Load Temporary Add-on” → pick `firefox/manifest.json`.

## Coding Style & Naming Conventions
Stick to plain ES5 modules wrapped in IIFEs, two-space indentation, and descriptive `RS.*` namespacing (e.g., `RS.FloatingButton`). Popup code mirrors this pattern with the `RSPopup` namespace; keep shared utilities stateless and documented. Use lowercase hyphenated file names (`ui-floating-button.js`), early returns, and the existing concise comment style.

## Testing Guidelines
There is no automated suite; rely on scenario testing: select text on a page and confirm the floating button shows, shortcuts trigger the right prompt, notifications appear, and `chrome.storage.sync` reflects updates from `popup.html`. For AI flows, watch `chrome.storage.local` to ensure transient keys like `pendingPrompt` arrive and expire within five minutes, and confirm `claude-inject.js` auto-fills the GenAI tab. When you modify prompts, layout, or permissions, gather before/after screenshots and list manual steps in the PR. Always re-validate both Chromium and Firefox loads after manifest or storage changes.

## Commit & Pull Request Guidelines
Use short, imperative commit subjects (e.g., `Add floating textarea shortcut guard`) and add wrapped body text when you need to explain context or reference an issue (`Refs #12`). Each PR should describe the change, call out the touched surfaces (content, popup, background), outline manual test steps, and attach screenshots or GIFs for UI tweaks. Link related issues, mention follow-ups (new AI endpoints, storage migrations), and flag manifest or permission updates so reviewers can double-check policies.
