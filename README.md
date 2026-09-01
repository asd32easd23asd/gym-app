# Gym Planner

Personal gym + peptide planner as an iOS app (WKWebView wrapper around `app/index.html`).

## Build

Every push to `main` builds an **unsigned** `GymPlanner.ipa` via GitHub Actions (see the *latest* release or the workflow artifact).

## Install on iPhone (Sideloadly)

1. Download `GymPlanner.ipa` from the latest release.
2. Open Sideloadly, connect your iPhone, drag the ipa in, sign in with a (throwaway) Apple ID, click Start.
3. On the iPhone: Settings → General → VPN & Device Management → trust the developer profile.

## Auto-refresh every day over Wi-Fi

Free Apple IDs expire apps after 7 days. In Sideloadly enable:

- **Wi-Fi daemon** (menu: advanced options) so the PC can reach the iPhone wirelessly, and
- **Auto refresh** for the installed app.

Leave Sideloadly running on the PC; it re-signs the app over Wi-Fi automatically so it never expires.

## Updating the app

Edit `app/index.html`, push to `main`, download the new ipa and sideload again (data is kept — it lives in the app's local storage).
