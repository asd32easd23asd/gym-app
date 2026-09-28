# Gym Planner — context for an AI assistant

Paste this whole file into ChatGPT (or any other assistant) before asking it to change
anything. It describes what the app is, how it is built, what the state looks like, and
what changed in the rewrite. Everything here is current as of 28 September 2026.

---

## 1. What this is

A personal training and supplement log, shipped as an iOS app. The whole app is one
file, `app/index.html`, loaded from `file://` inside a `WKWebView`. There is no build
step, no framework, no npm. Vanilla ES5-style JavaScript, one `<style>` block, one
`<script>` block.

```
app/index.html                  the entire app
ios/Sources/ViewController.swift  WKWebView wrapper + local notification bridge
ios/Sources/AppDelegate.swift
ios/project.yml                 XcodeGen project definition
.github/workflows/build.yml     builds an unsigned .ipa on push to main
preview/index.html              a design preview, not shipped in the app
backup/                         copies of earlier versions
```

The `.ipa` is unsigned and installed with Sideloadly using a personal Apple ID, so it
has to be re-signed every 7 days. The owner also has a paid Apple Developer account and
intends to release it on the App Store.

**Do not add a framework, a bundler, or a package.json.** The one-file constraint is
deliberate: the build workflow copies `app/index.html` into the app bundle verbatim.

---

## 2. Hard constraints

| Constraint | Why |
|---|---|
| One file, no imports, no CDN | It runs from `file://`; there is no network at runtime |
| No web fonts | Same reason — the system font stack is used on purpose |
| No inline `onclick` with interpolated data | It caused a real bug; see §6 |
| No zooming | Pinch and double-tap are refused in CSS, JS and on the native side |
| No dosage arithmetic | See §7 — this is an App Store requirement, not a preference |
| ES5-ish JS | `var`, `function`, no optional chaining. Keep it that way for old WebKit |

---

## 3. Screens

Four tabs, rendered by replacing `#main.innerHTML` on every change.

- **Today** — a week strip, a summary card, the workout with one button per set, the
  stack grouped by moment, a Coach placeholder, notes and reminders.
- **Plan** — one week that repeats. Editing a plan day opens a nested editor
  (`editPlanId` + `editWd`). Also holds the AI prompt.
- **Stats** — body weight line, volume bars, sessions bars, personal records, per-item
  amounts per week, and the log.
- **Supply** — one card per stack item: a ring for what is left, days remaining, the
  titration steps, and Log / New container / Edit.

Modal UI is a single bottom sheet driven by one variable, `sheet`. `viewSheet()`
switches on `sheet.kind` and returns HTML; `saveSheet(what)` reads the fields back.

---

## 4. State

One object, saved to `localStorage` under the key `gympep-state-v1` (the key is
unchanged from v1 on purpose, so old installs upgrade in place). When the page runs
inside Claude, `claude.use("db")` also keeps a cloud copy; in the iPhone build that
call does not exist and is skipped.

```js
{
  v: 2,
  stack: [{
    id, nm,                       // name
    kind,                         // "inject" | "powder" | "capsule" | "liquid"
    moment,                       // default moment of day
    cont: { n, u },               // container size + unit
    dose: { n, u },               // amount per time
    left,                         // how much is left in the container
    perWeek,                      // times per week — drives days-left
    hint,                         // free text, e.g. "2 scoops"
    steps: [{ id, from, n }]      // scheduled changes to the amount
  }],
  plans: [{
    id, name, status,             // "active" | "draft" | "archived"
    days: { "0".."6": {           // 0 = Monday
      workoutName,
      exercises: [{ name, sets, reps, kg, note }],
      take: [{ id, itemId, moment, time }],
      notes,
      reminders: [{ text, time }]
    }}
  }],
  activePlanId,
  planLog: [{ planId, from }],
  days: { "YYYY-MM-DD": {
    workoutName,
    exercises: [{ id, name, sets, reps, kg, note, done: [bool] }],   // one bool per set
    take: [{ id, itemId, amount, unit, moment, time, done, at, histId }],
    notes,
    reminders: [{ id, text, time, done }],
    userEdited,                   // true once you touch the day
    tplV                          // which schedVer built this day
  }},
  history: [{ id, date, at, name, amount, unit }],
  prs: { "<lowercased exercise name>": { name, kg, reps, date } },
  weights: [{ date, kg }],
  schedVer, notifyOn, restSec, theme
}
```

### How a day is built

`day(dateISO)` materialises a day from the active plan, but **only** while the day is
untouched and not in the past. "Touched" means `userEdited`, or any set, take or
reminder ticked. `schedVer` is bumped whenever the plan or the stack changes; a day
whose `tplV` differs gets rebuilt. That is how a plan edit reaches tomorrow without
rewriting yesterday.

`day()` sets `dayDirty`, and `render()` saves when it is set — otherwise a freshly
built day would live only in memory.

### Pruning

Days older than `KEEP_DAYS` (550) are deleted on every save, and history is capped at
2000 entries. Without this the store grows forever; that was a real defect in v1.

---

## 5. Migration from v1

`upgrade(old)` runs on load and is idempotent (`old.v === 2` short-circuits). It:

- turns `peptides[]` into `stack[]` items with `kind: "inject"`;
- parses v1's free-text `detail` (`"4 × 8 · 80 kg"`, `"3 x 12 - 15 kg"`) into
  `sets`, `reps`, `kg` via `parseDetail()`; anything unparseable becomes `note`;
- converts `plans[].days[].doses` into `take`, and `days[].doses` likewise;
- derives `perWeek` for each item by counting how often it appears in the active plan;
- handles the even older `tpl` + `rules` model if a plan was never made from it;
- rewrites `history` entries from `{ mg }` to `{ amount, unit }`.

The upgraded state is written straight back to `localStorage`, so the conversion
happens once rather than on every open.

**If you change the state shape, extend `upgrade()` and bump `v`.** Do not change
`LS_KEY`.

---

## 6. Bugs that were fixed — do not reintroduce them

1. **Apostrophe in a plan name broke its buttons.** v1 built
   `onclick="delPlan('${esc(name)}')"`. `esc()` turns `'` into `&#39;`, HTML decodes it
   back to `'` before JS parses the attribute, and the string closes early. Now every
   handler is delegated from `document` and reads `data-*` attributes holding ids only.
   **Never put user text inside an attribute that is later parsed as JavaScript.**
2. **Undoing a dose removed the wrong log row.** v1 matched on date + amount + name.
   Each `take` now carries `histId` and the undo removes exactly that entry.
3. **No `<!doctype html>`**, so Safari rendered in quirks mode.
4. **The font was fetched from Google Fonts** while the app runs offline from `file://`.
   System stack now.
5. **`state.days` grew without limit.** See pruning above.
6. **Notifications were only rescheduled when the app opened**, 7 days ahead. Now also
   on `visibilitychange` and `pagehide`, 14 days ahead.
7. **A CSS class collision.** `.rest` styled both the rest-timer bar and the "Rest day"
   label on plan rows, making those rows invisible. The label is `.restday` now. Watch
   for this: the stylesheet is one flat namespace.
8. **Native number spinners.** Every numeric field is `type="text"` with
   `inputmode="decimal"` or `"numeric"`, plus a CSS rule that hides spinners on any
   `type="number"` that sneaks back in.

---

## 7. What the app deliberately does NOT do

The app records **an amount and a frequency**. It does not work out how to administer
anything: no unit conversions, no concentrations, no injection guidance, no body maps.

This is an App Store requirement. Apple's App Review Guidelines section 1.4 (Physical
Harm) targets apps that calculate drug dosages; those have to come from a recognised
institution. Removing the arithmetic takes the app out of that category and leaves a
log and a stock cupboard.

Two more rules that follow from it, for whoever ships this:

- **The app contains no list of substances.** It starts empty and the user types their
  own names. That is what makes it a general logging tool rather than a peptide app.
  Do not add a preset catalogue, autocomplete list, or seeded examples with real
  compound names.
- **No health claims** anywhere in the UI or the store listing.

The form is called **Vial**, not Injection: it names the container, not the route.

---

## 8. Notifications

`ios/Sources/ViewController.swift` registers a `WKScriptMessageHandler` named `notify`.
The web side calls:

```js
window.webkit.messageHandlers.notify.postMessage(JSON.stringify([
  { date: "2026-09-29", time: "09:00", title: "…", body: "…" }
]))
```

Swift clears all pending requests and schedules a `UNCalendarNotificationTrigger` per
item. Identifiers are `date-time-hash(body)`. In a browser the code falls back to the
`Notification` API, checked every 30 seconds.

---

## 9. Not built yet

**Social** (groups, challenges) and the **AI coach** both need a server, which does not
exist. They are designed in `preview/index.html` and shown in the shipped app only as a
dashed *Soon* card with nothing tappable.

Intended model, if you are asked to build it:

- Free: track everything for yourself, join any group, create up to 2, see what the
  group lifts, join other people's challenges, and create **one challenge per month**
  lasting 7 days.
- Plus, €1,99/month (€19,99/year, €44,99 once): unlimited challenges of any length,
  unlimited groups, full history, compare your stats with the group.

Anti-abuse rules, all of which must live **on the server** — a client-side check is
defeated by changing the phone's clock:

1. The free-challenge counter is per **account** per calendar month, not per group.
2. Also at most one free challenge per **group** per month, so a group cannot rotate
   creators.
3. The counter is consumed at creation and never refunded — deleting the challenge,
   the group, or leaving, does not give it back.
4. A challenge only starts scoring once at least 3 members have logged a workout in the
   last 14 days. This is what makes throwaway accounts not worth the effort.
5. Free accounts can create at most 2 groups; joining is unlimited.
6. Sign in with Apple only, one Apple ID per account, plus a per-device rate limit on
   account creation.
7. The free challenge is fixed at 7 days and cannot be extended or restarted.

The AI **prompt** feature (Plan tab) is not the coach and costs nothing to run: it
builds a text prompt containing the user's stack and training days, the user pastes it
into any assistant, and pastes the JSON answer back into `importPlan()`. It stays free.

---

## 10. Conventions to follow

- UI copy is English; the owner writes Dutch, so explanations can be Dutch but strings
  in the app are not.
- Decimal separator is a dot, everywhere. v1 mixed a Dutch comma into an English UI.
- Semantic colour: teal = the app, green = done, amber = needs attention (low supply,
  Soon), red = destructive. Do not use the accent for state.
- Every tappable target is at least 44 × 44 px.
- Both themes are defined as tokens on `:root` and `:root[data-theme="light"]`. Never
  hardcode a colour outside the token set.
- Charts: one scale for marks and labels, a direct label on the highest or last value,
  no legend for a single series.

---

## 11. Testing

There is no test suite. The app is checked by driving it with Playwright and
Chromium — loading `app/index.html` from `file://`, seeding `localStorage` with a v1
state, and exercising the flows. Useful checks:

- a v1 state upgrades to `v: 2` with the stack, plans and parsed exercises intact;
- ticking a set starts the rest timer and persists;
- logging an item decreases `left` and adds one history row with a matching `histId`;
- the page never scrolls horizontally at 390 px wide;
- no `pageerror` fires on any tab.

---

## 12. What changed in the rewrite (September 2026)

The app was rebuilt from a 1084-line v1 into the current ~2000-line v2. Everything
below is already done and in `app/index.html` unless it says otherwise.

### Rewritten

- **Peptides became a stack.** v1 only understood vials measured in mg. Every item now
  has a `kind` that decides its unit and container — Vial / Powder / Pills / Liquid —
  so creatine, whey, magnesium and omega-3 fit in the same model. From `left`,
  `dose` and `perWeek` the app derives **days remaining** and warns under 14 days.
- **Sets are tracked one at a time.** v1 ticked a whole exercise, which meant the app
  could not tell whether you were getting stronger. Each exercise now stores
  `done: [bool]` per set, plus `sets`, `reps` and `kg`, and shows what you did last
  time. That also makes weekly volume computable.
- **Rest timer.** Ticking a set starts it; `restSec` defaults to 90.
- **Personal records** per exercise, stored under the lowercased name. Typed or
  stepped, and deliberately allowed to go *down* — a record entered wrong has to be
  fixable, so the save is never blocked.
- **The day is grouped by moment** — Morning, Pre-workout, Post-workout, Evening.
- **Logging pre-fills the planned amount** and lets you change it for that one entry
  without touching the plan; the sheet says so in words.
- **Body weight** with a chart, plus volume lifted and sessions per week.
- **History ranges** in Stats: 12 weeks / 1 year / everything.
- **Light mode**, as a second full token set rather than an inversion.
- **Export and restore** in Settings, as plain text.
- **AI prompt** that works with any assistant. It builds text; nothing leaves the app.
  `importPlan()` parses the JSON answer back into a draft plan.

### Fixed

The eight defects in §6, each with the reason not to reintroduce it.

### Zoom

Refused in three places, because the viewport meta alone is not reliable on iOS:
`touch-action: manipulation` in CSS, `gesturestart`/`gesturechange`/`gestureend` and
double-tap handlers in `lockZoom()`, and on the native side the scroll view's zoom
scale pinned to 1, its pinch recogniser disabled and `viewForZooming` returning nil.

### Designed but not built

Social (groups, challenges) and the AI coach — see §9. Both need a server. In the
shipped app the coach appears only as a dashed *Soon* card with nothing tappable, on
purpose: a button that does nothing confuses testers more than no button.

---

## 13. Shipping to TestFlight

The owner has a paid Apple Developer account and wants this on TestFlight. **The
current CI cannot do that.** `.github/workflows/build.yml` builds with
`CODE_SIGNING_ALLOWED=NO` and zips the `.app` by hand; that produces an ipa for
Sideloadly, not something App Store Connect will accept. What is missing:

1. **Register the bundle id** `com.s.gymplanner.app` in the developer account and
   create the app record in App Store Connect.
2. **Sign it.** Either build in Xcode on a Mac (Product → Archive → Distribute App →
   TestFlight, letting Xcode manage signing), or in CI with an App Store Connect API
   key (issuer id, key id, `.p8`) stored as repository secrets, `-allowProvisioningUpdates`
   on `xcodebuild archive`, then `-exportArchive` with an `exportOptions.plist` whose
   `method` is `app-store-connect`, then upload. Verify the current upload command
   against Apple's docs before wiring it — Apple has changed the tooling more than once
   and this file may be out of date.
3. **Remove the signing overrides** from `ios/project.yml` for that build
   (`CODE_SIGN_STYLE: Manual`, `CODE_SIGNING_ALLOWED: "NO"`,
   `CODE_SIGNING_REQUIRED: "NO"`). Keep the unsigned path if you still want
   sideloadable builds — make it a second workflow rather than changing this one.

Already handled so they do not bite later:

- `ITSAppUsesNonExemptEncryption: false` is declared, so App Store Connect stops asking
  about encryption on every upload. This is correct for this app: it uses no
  encryption of its own.
- `CFBundleVersion` comes from `CURRENT_PROJECT_VERSION`, which CI sets to the GitHub
  run number. Every upload therefore gets a build number no earlier upload used, which
  App Store Connect requires. `CFBundleShortVersionString` comes from
  `MARKETING_VERSION` and is bumped by hand.

### The part that actually decides whether this ships

**Internal TestFlight testers skip review. External testers do not.** Up to 100 people
on your own team can install an internal build immediately. Anyone beyond that needs
Beta App Review, which is lighter than full App Store review but is still a human
looking at the app — and that is where the content matters.

So for review, whether beta or full:

- **Ship the app empty.** It must contain no list of substances: no preset catalogue,
  no autocomplete, no seeded examples using real compound names. The user types their
  own. This is the single biggest factor and it costs nothing, because the app already
  starts empty.
- **The reviewer reads the store metadata before opening the app.** App name, subtitle,
  keywords, description and screenshots decide the first impression. Describe it as a
  training and supplement log. Use screenshots with creatine and whey, not with the
  owner's own data.
- **Keep the dosage arithmetic out** (§7). Recording a number is logging; calculating
  one is dosing.
- **No health claims** — nothing about losing weight or building muscle.
- **Age rating 17+** and a one-screen disclaimer on first run: a log, not medical
  advice, talk to a doctor. That screen does not exist yet; it is worth adding before
  submitting.
- A rejection is not final. You get a reason and can reply in App Review; explain that
  it is a general-purpose log with no catalogue of its own and no calculations.

None of this guarantees approval. Reviewers also weigh what an app is used for in
practice, and the guidelines move — read section 1.4 of the App Review Guidelines
yourself before submitting rather than trusting this file.
