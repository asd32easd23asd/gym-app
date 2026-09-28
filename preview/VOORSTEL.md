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
| Letter | Nunito, overal 700–900 | Archivo (koppen/cijfers), Plex Sans (tekst), Plex Mono (mg, IU, kg) |
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

| Vorm | Verpakking | Dosis in | App rekent uit |
|---|---|---|---|
| **Injection** | vial | mg | IU op een U-100 spuit |
| **Powder** | bus | g | aantal scoops |
| **Pills** | pot | capsules | — |
| **Liquid** | flesje | ml | aantal druppels |

Verder is alles hetzelfde: hoeveel er nog in zit, hoeveel per keer, hoe vaak per week.
Daaruit rekent de app **hoeveel dagen je nog hebt** — en waarschuwt onder de 14 dagen.

Je dag wordt ook opgedeeld in momenten: Morning, Post-workout, Evening. Creatine 's
ochtends, whey na de training, magnesium 's avonds. Eén lange lijst werkt niet als je
zes dingen per dag neemt.

### 2b. De rest

1. **Per set aftikken, met gewicht.** Nu vink je een hele oefening af. Daardoor weet
   de app niet wat je getild hebt en kan hij niet laten zien of je sterker wordt.
   Voorstel: vier vakjes voor vier sets, en eronder wat je vorige keer deed.
2. **Rusttimer.** Start vanzelf als je een set aftikt. 90 seconden, met +30s.
3. **Spuit-rekenaar (mg → IU).** Vial 20 mg + 2 ml water = 10 mg/ml, dus 2 mg = 20 IU
   op een U-100 spuit. Dat reken je nu elke keer zelf uit.
4. **Prikplek-rotatie.** De app onthoudt waar je de vorige keer prikte en zegt welke
   plek nu aan de beurt is.
5. **Lichaamsgewicht in een grafiek**, met een streepje waar je dosis omhoog ging.
   Bij retatrutide is dat precies wat je wil zien, en het staat nu nergens in de app.
6. **Totaal getild per week** (gewicht × reps × sets).
7. **Claude in de app.** Nu: prompt kopiëren, naar Claude, JSON terugplakken. De app
   praat al met Claude voor de opslag, dus dit kan één knop zijn.
8. **Waarschuwing als iets bijna op is** — onder 14 dagen wordt de kaart amber, met
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

Kort antwoord: **zo niet.** Maar dat maakt weinig uit, want je zet hem er ook niet op.

- **App Store en TestFlight: vrijwel zeker afgewezen.** Apple heeft in de App Review
  Guidelines een stuk over Physical Harm (sectie 1.4). Apps die een medicijndosering
  uitrekenen moeten van een erkende instelling of fabrikant komen, met bron erbij.
  Retatrutide en BPC-157 zijn geen goedgekeurde medicijnen, die zitten nog in
  onderzoek. Een app die daar doses en spuit-eenheden voor uitrekent komt er niet door.
- **Wat je nu doet, mag gewoon.** Sideloadly met je eigen Apple ID, alleen op je eigen
  telefoon. Dat is geen release maar je eigen app op je eigen apparaat, daar komt geen
  review aan te pas. Daarom moet je hem ook elke 7 dagen opnieuw ondertekenen.
- **Wil je hem ooit wél in de store**, dan splits je hem: gym + supplementen erin,
  peptides eruit. Creatine, eiwit, magnesium en omega-3 zijn gewone voedingssupplementen.
  Omdat alles nu één model is met een `vorm`, is dat een schakelaar en geen herbouw.
- Ik ken de exacte regelnummers niet uit mijn hoofd en Apple verandert ze. Lees sectie
  1.4 van de App Review Guidelines op developer.apple.com voordat je iets indient.

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
5. Spuit-rekenaar, prikplek-rotatie, gewichtsgrafiek
6. Claude-knop in de app
