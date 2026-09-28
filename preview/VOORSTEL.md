# Gym Planner — voorstel voor een nieuwe versie

Datum: 28 september 2026
Branch: `design-preview`
Preview: open `preview/index.html` in een browser

**De app zelf is niet aangepast.** `app/index.html` is precies zoals hij was.
Er staat een backup van de huidige versie in `backup/index-v1-2026-09-28.html`.

---

## Wat de app nu is

Eén bestand, `app/index.html`, ongeveer 1080 regels. Draait in een WKWebView op de
iPhone. Drie tabbladen: Today, Plan, History, plus Settings. Opslag in localStorage,
en als de app in Claude draait ook in de cloud via `claude.use("db")`.

Wat er goed aan is: het weekplan dat zichzelf elke week herhaalt, de dosisplanning met
stappen (1 mg → 2 mg → 4 mg) die automatisch de juiste dosis per dag pakt, en het
vial-ringetje met hoeveel mg er nog in zit. Dat is doordacht.

---

## 1. Design

| | Nu | Voorstel |
|---|---|---|
| Kleur | één groen voor alles | teal = de app, groen = gedaan, amber = let op, rood = gevaar |
| Letter | Nunito, overal 700–900 | Archivo (koppen/cijfers), Plex Sans (tekst), Plex Mono (mg, g, kg) |
| Overzicht | drie even zware kaarten | bovenaan één kaart met de stand van de dag |
| Knoppen | ✕ en tekstknopjes ± 20 px | alles minimaal 44 × 44 px (richtlijn van Apple) |
| Contrast | `--dim: #6a6a6a` haalt geen 4,5:1 | grijzen opnieuw gekozen |
| Thema | alleen donker | donker én licht |
| Wat je inneemt | alleen peptides (vial + mg) | vier vormen: Injection, Powder, Pills, Liquid |
| Weekstrip | alleen het dagnummer | bolletjes: training gepland, dosis gepland, gedaan |

---

## 2. Nieuwe functies

### 2a. Alles wat je inneemt, niet alleen peptides

Dit is het grootste gat. De app kent nu alleen vials met mg. Creatine, eiwitpoeder,
magnesium en omega-3 passen daar niet in.

Voorstel: elk item in je stack heeft een **vorm**, en die vorm bepaalt de eenheid en
de rekensom.

| Vorm | Verpakking | Hoeveelheid in |
|---|---|---|
| **Injection** | vial | mg |
| **Powder** | bus | g |
| **Pills** | pot | capsules |
| **Liquid** | flesje | ml |

Verder is alles hetzelfde: hoeveel per keer, hoe vaak per week, hoeveel er nog in zit.
Daaruit rekent de app **hoeveel dagen je nog hebt** — en waarschuwt onder de 14 dagen.

Meer rekent de app niet uit. Geen IU, geen ml water, geen mg/ml, geen prikplekken.
Dat is bewust, zie hoofdstuk 4.

Je dag wordt ook opgedeeld in momenten: Morning, Post-workout, Evening. Creatine 's
ochtends, whey na de training, magnesium 's avonds. Eén lange lijst werkt niet als je
zes dingen per dag neemt.

### 2b. De rest

1. **Per set aftikken, met gewicht.** Nu vink je een hele oefening af. Daardoor weet
   de app niet wat je getild hebt en kan hij niet laten zien of je sterker wordt.
   Voorstel: vier vakjes voor vier sets, en eronder wat je vorige keer deed.
2. **Rusttimer.** Start vanzelf als je een set aftikt. 90 seconden, met +30s.
3. **Lichaamsgewicht in een grafiek**, met een streepje waar je dosis omhoog ging.
   Bij retatrutide is dat precies wat je wil zien, en het staat nu nergens in de app.
4. **Totaal getild per week** (gewicht × reps × sets).
5. **Claude in de app.** Nu: prompt kopiëren, naar Claude, JSON terugplakken. De app
   praat al met Claude voor de opslag, dus dit kan één knop zijn.
6. **Waarschuwing als iets bijna op is** — onder 14 dagen wordt de kaart amber, met
   "bestel een nieuwe bus". Werkt voor vials, bussen en potten.

---

## 3. Bugs in de huidige code

Deze zitten er nu echt in, los van het design.

- **Een plan met een apostrof breekt de verwijderknop.** In `viewPlanEditor()` gaat de
  plannaam via `esc()` in een `onclick`-attribuut. `esc()` maakt van `'` een `&#39;`,
  en HTML decodeert dat terug naar `'` vóór JavaScript de regel leest. Een plan dat
  `Zeynal's plan` heet, sluit de string dus te vroeg af.
  → Oplossing: niet de naam in de `onclick` zetten, maar het id, en de naam opzoeken.
- **`undoDose()` kan de verkeerde historieregel weghalen.** Hij zoekt op
  datum + mg + naam. Twee dezelfde doses op één dag → verkeerde treffer.
  → Oplossing: het historie-id opslaan op de dosis zelf.
- **Geen `<!doctype html>`.** Regel 1 is `<meta charset>`. Safari rendert dan in
  quirks mode. → Eén regel toevoegen, plus `<html lang="en">`.
- **Het lettertype komt van internet.** Nunito wordt van Google Fonts geladen, maar
  de app draait vanaf `file://` in de ipa. Zonder wifi valt hij terug op het
  systeemlettertype. → Font meebouwen in de ipa, of een systeem-stack gebruiken.
- **Nederlands en Engels door elkaar.** De UI is Engels, maar in de planhistorie staat
  nog `actief`, en `fmtMg()` zet een komma in getallen terwijl de rest Engels is.
- **`state.days` groeit oneindig.** De historie stopt bij 500 regels, maar dagen gaan
  er nooit uit. → Dagen ouder dan een jaar opruimen.
- **Meldingen worden alleen bijgewerkt als je de app opent.** De iOS-kant plant 7
  dagen vooruit, maar alleen op dat moment. Open je de app 8 dagen niet, dan krijg je
  niets meer. → Ook opnieuw plannen bij het sluiten van de app.

---

## 4. Mag dit in de App Store?

Je wilde alleen mg en hoe vaak per week, geen spuit-dingen. Dat is nu zo.

**Eruit gehaald:** de omrekening mg → IU, het aantal ml water, de sterkte in mg/ml, en
het lichaamsplaatje met prikplekken. Dat zijn allemaal dingen die zeggen *hoe* je iets
toedient, en daar zit Apple's regel op (App Review Guidelines, sectie 1.4, Physical
Harm — apps die doseringen uitrekenen moeten van een erkende instelling komen).

**Wat blijft:** naam, hoeveelheid per keer, hoe vaak per week, hoeveel er nog in de
verpakking zit, en hoeveel dagen dat nog duurt. Dat is een logboek en een voorraadkast.
Je schrijft op wat je gedaan hebt; de app rekent niks uit over toedienen.

**Geen garantie.** De doseringskant is nu weg en dat scheelt het meest. Maar een app
die draait om middelen die nog in onderzoek zijn kan nog steeds tegengehouden worden.
Zeker weet je het pas als je hem indient. Ik ken de exacte regelnummers niet uit mijn
hoofd en Apple verandert ze — lees sectie 1.4 op developer.apple.com.

**De veiligste versie** is gym + supplementen, zonder de vorm `Injection`. Creatine,
eiwitpoeder, magnesium en omega-3 zijn gewone voedingssupplementen. Omdat alles één
model is, is dat een schakelaar en geen herbouw.

**Wat je nu doet is sowieso geen probleem.** Sideloadly met je eigen Apple ID op je
eigen telefoon is geen release, daar komt geen review aan te pas.

---

## 5. Wat hetzelfde blijft

- Je data. Zelfde `gympep-state-v1`, zelfde cloud-sync. Een nieuwe versie leest je
  oude data gewoon in.
- De manier van bouwen en installeren: één `app/index.html`, dezelfde GitHub Action,
  dezelfde Sideloadly-stappen.
- De backup staat in `backup/`.

---

## Hoe nu verder

De preview is een mockup met voorbeeldgetallen — geen echte code van de app. Als je
dit wil, bouw ik het in `app/index.html`, in stappen:

1. Bugs uit hoofdstuk 3 (klein, geen risico)
2. Peptides omzetten naar het bredere stack-model met vormen (je data blijft staan —
   elke bestaande peptide wordt gewoon vorm `Injection`)
3. Nieuwe kleuren + letters + grotere knoppen (design, data blijft gelijk)
4. Set-tracking + rusttimer (grootste stuk)
5. Gewichtsgrafiek en weekvolume
6. Claude-knop in de app
