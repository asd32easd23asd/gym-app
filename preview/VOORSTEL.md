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
| Wat je inneemt | alleen peptides (vial + mg) | vier vormen: Vial, Powder, Pills, Liquid |
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
| **Vial** | vial | mg |
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

0. **Log-scherm: voorgevuld, maar aanpasbaar.** Het bedrag uit je plan staat al
   ingevuld, dus één tik is klaar. Wil je vandaag minder of meer: − en + , of de
   knoppen Half en Double. Wat je daar verandert geldt **alleen voor die ene keer**;
   je weekplan blijft staan.
1. **Per set aftikken, met gewicht.** Nu vink je een hele oefening af. Daardoor weet
   de app niet wat je getild hebt en kan hij niet laten zien of je sterker wordt.
   Voorstel: vier vakjes voor vier sets, en eronder wat je vorige keer deed.
2. **Rusttimer.** Start vanzelf als je een set aftikt. 90 seconden, met +30s.
3. **Lichaamsgewicht in een grafiek**, met een streepje waar je dosis omhoog ging.
   Bij retatrutide is dat precies wat je wil zien, en het staat nu nergens in de app.
4. **Totaal getild per week** (gewicht × reps × sets).
5. **AI-plan met elke AI, gratis.** De app maakt een prompt met jouw stack en
   trainingsdagen erin. Die plak je in ChatGPT, Claude, Gemini, Grok — wat je gebruikt.
   Antwoord terugplakken en klaar. Kost niks, dus gratis.
6. **AI-coach — `Soon`, nog niet bruikbaar.** Leest straks je week en stelt dingen voor
   die hij ook kan uitvoeren: een reminder zetten, een gewicht ophogen, waarschuwen dat
   je whey op raakt. Jij tikt op de knop, hij doet het. Nooit uit zichzelf.
   In de preview staat hij **uitgeschakeld** met een Soon-label en voorbeelden erbij —
   er valt niks te tikken. Een knop die niks doet is verwarrender voor testers dan geen
   knop. Hij staat daarom ook niet in de Plus-lijst van wat je vandaag koopt.
7. **Waarschuwing als iets bijna op is** — onder 14 dagen wordt de kaart amber, met
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

## 4. Door de App Store komen

Je hebt een dev-account en je gaat hem uitbrengen. Dan is de vraag niet *of*, maar
*hoe je erdoor komt*. De vorm heet nu **Vial** in plaats van Injection — dat gaat over
de verpakking, niet over hoe je iets toedient. Dat helpt.

Op volgorde van belang:

1. **Lever de app leeg op, zonder lijst met middelen.** Verreweg het belangrijkste.
   Geen enkele naam van een middel in de app zelf, geen keuzelijst, geen voorbeelden
   met retatrutide. Lege stack bij de eerste start; de gebruiker typt zelf wat hij wil.
   Dan is het een logboek waar alles in kan, net als een notitie-app.
2. **De reviewer ziet je screenshots vóór je app.** Naam, ondertitel, keywords,
   omschrijving en screenshots — daar begint de review. Staat daar een peptide-naam in,
   dan is het klaar voordat hij de app opent. Noem het een training- en
   supplementen-logboek. Screenshots met creatine en whey, niet met je eigen data.
3. **Geen rekenwerk over toedienen.** Is er al uit. Een getal invullen en bewaren is
   loggen; een getal *uitrekenen* is doseren, en daar gaat sectie 1.4 over.
4. **Geen beloftes.** Niks over afvallen of spiergroei. De app zegt alleen wat je
   gedaan hebt.
5. **17+ en een korte disclaimer bij de eerste start.** "Dit is een logboek, geen
   medisch advies. Overleg met een arts." Eén scherm, één keer.
6. **Een afwijzing is niet het einde.** Je krijgt een reden en mag reageren in App
   Review. Leg dan uit dat het een algemeen logboek is zonder eigen lijst en zonder
   rekenwerk. Veel apps komen er in de tweede ronde door.

Wat ik niet kan beloven: met deze punten sta je sterker, maar reviewers kijken ook naar
wat een app in de praktijk doet. Ik ken de exacte regelnummers niet uit mijn hoofd en
Apple verandert ze — lees sectie 1.4 op developer.apple.com voordat je indient.

---

## 5. Social, challenges en het verdienmodel

Het tabblad heet **Social**. Je zit in meerdere groepen, wisselt bovenaan met knopjes,
en maakt er zelf een aan. Per groep een ranglijst op sets en een challenge met een doel
en een einddatum.

- **Ranglijst op sets, niet op kilo's.** Op gewicht wint altijd de zwaarste persoon.
- **Per groep bepaal je wat je deelt.** Workouts en streak aan; gewicht, supplementen en
  vials uit — aan te zetten als je wil.

### Gratis of betaald

| | Free | Plus |
|---|---|---|
| Prijs | €0 | €1,99/mnd · €19,99/jaar · €44,99 eenmalig |
| Alles voor jezelf bijhouden | ✓ | ✓ |
| AI-plan met elke AI | ✓ | ✓ |
| Export van al je data | ✓ | ✓ |
| Groepen joinen | onbeperkt | onbeperkt |
| Zelf groepen maken | 2 | onbeperkt |
| Zien wat je groep tilt | ✓ | ✓ |
| Meedoen aan challenges | ✓ | ✓ |
| Zelf challenges maken | 1 per maand, 7 dagen | onbeperkt, elke lengte |
| Eigen statistieken | 12 weken | tot 10 jaar |
| Vergelijken in Stats | — | ✓ |
| AI-coach | — | later (nu `Soon`) |

Meedoen aan andermans challenge is altijd gratis. Anders betaalt niemand, want dan
kunnen je vrienden niet meedoen.

### Misbruik tegenhouden

Deze regels moeten **op de server** staan, niet in de app — anders zet iemand gewoon de
datum van zijn telefoon terug.

1. **De teller zit op je account**, niet op de groep. Eén gratis challenge per account
   per kalendermaand. Honderd groepen maken helpt dus niks.
2. **Ook max één gratis challenge per groep per maand.** Dit dicht het echte gat: vier
   vrienden in één groep die om de beurt hun gratis challenge inzetten.
3. **Opgebruikt is opgebruikt.** Challenge of groep verwijderen geeft hem niet terug.
   De teller loopt op bij het aanmaken.
4. **Minimaal 3 leden die in 14 dagen echt gelogd hebben**, anders begint de challenge
   niet te tellen. Nepaccounts maken is dan geen truc meer maar werk.
5. **Gratis: zelf maximaal 2 groepen.** Joinen mag onbeperkt.
6. **Eén Apple ID = één account** (Sign in with Apple), plus een limiet op nieuwe
   accounts per apparaat.
7. **De gratis challenge is vast 7 dagen**, niet te verlengen of herstarten.

### Waarom dit eerlijk is

Groepen en challenges hebben een server nodig — de app draait nu volledig op je
telefoon, dus dat is een echte kostenpost die er nu nog niet is. De AI-prompt kost niks
en blijft gratis.

Eén ding om rekening mee te houden: omdat meedoen gratis is, betaalt er meestal één
iemand per groep. Je inkomsten schalen dus met het aantal groepen, niet met het aantal
gebruikers. 1000 betalers op €19,99 per jaar is na Apple's 15% ruwweg €17.000 netto.

---

## 6. Wat hetzelfde blijft

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
   elke bestaande peptide wordt gewoon vorm `Vial`)
3. Nieuwe kleuren + letters + grotere knoppen (design, data blijft gelijk)
4. Set-tracking + rusttimer (grootste stuk)
5. Gewichtsgrafiek en weekvolume
6. Claude-knop in de app
7. Social + challenges + Plus (dit heeft een server nodig, dus als laatste)
