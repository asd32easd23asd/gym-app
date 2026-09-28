# Gym Planner

A training and supplement log as an iOS app: a WKWebView wrapping `app/index.html`.

## What it does

- **Today** — your workout set by set, with the weight you are working at and what you
  lifted last time. Ticking a set starts a rest timer. Under it: everything you take
  that day, grouped by Morning / Pre-workout / Post-workout / Evening.
- **Plan** — one week that repeats itself. Per day: the workout, what you take, notes
  and reminders. There is also a prompt you can paste into any AI to have it write the
  week for you; paste the answer back and it imports.
- **Stats** — body weight, volume lifted per week, sessions per week, personal records
  and the log of everything you took.
- **Supply** — everything in your stack with how much is left and how many days that
  lasts. Four forms, which decide the unit and the container:

  | Form | Container | Amount in |
  |---|---|---|
  | Vial | vial | mg |
  | Powder | tub | g |
  | Pills | jar | caps |
  | Liquid | bottle | ml |

  Under 14 days left the card turns amber.

The app records amounts and frequency. It works nothing out about how to take
anything — no unit conversions, no concentrations.

## Your data

Everything lives in the app, in `localStorage` under `gympep-state-v1`. Opening the app
inside Claude also keeps a cloud copy. Data from the older version is upgraded the
first time you open this one; nothing is thrown away. Days older than about 18 months
are cleared so storage cannot grow forever.

Settings has **Export** and **Restore** — plain text you can keep anywhere.

## Build

Every push to `main` builds an unsigned `GymPlanner.ipa` through GitHub Actions; see
the *latest* release or the workflow artifact. You can also run the workflow by hand
from any branch: Actions → *Build unsigned IPA* → Run workflow.

## Install on iPhone (Sideloadly)

1. Download `GymPlanner.ipa` from the latest release.
2. Open Sideloadly, connect your iPhone, drag the ipa in, sign in with a (throwaway)
   Apple ID, click Start.
3. On the iPhone: Settings → General → VPN & Device Management → trust the profile.

### Keeping it alive over Wi-Fi

Free Apple IDs expire apps after 7 days. In Sideloadly turn on **Wi-Fi daemon**
(advanced options) and **Auto refresh**, and leave Sideloadly running on the PC. It
re-signs over Wi-Fi so the app never expires.

## Updating

Edit `app/index.html`, push to `main`, download the new ipa and sideload it again. Your
data is kept — it lives in the app's own storage, not in the ipa.

## Repository

- `app/index.html` — the whole app, one file
- `ios/` — the WKWebView wrapper and the notification bridge
- `preview/` — a design preview with the reasoning behind this version
- `backup/` — copies of earlier versions of the app
