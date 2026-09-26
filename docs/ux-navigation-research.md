# Navigatieonderzoek Gym Planner

Datum: 27 september 2026. Doel: mensen zonder uitleg hun training, productgebruik, voorraad en voortgang laten vinden en vastleggen.

## Wat dit onderzoek wel en niet aantoont

Dit is gericht literatuuronderzoek, aangevuld met een inspectie van de bestaande appcode. Er zijn **geen eigen klanten geïnterviewd**, geen gebruiksstatistieken verzameld en geen gebruikerstests uitgevoerd voor dit document. De klacht van de eigenaar is direct productfeedback, geen representatieve steekproef. De onderstaande klantgroepen en ontwerpkeuzes zijn hypotheses die we gericht kunnen testen.

Er bestaat geen universeel bewezen beste appindeling. De bronnen ondersteunen herkenbare navigatie, eenvoudige invoer en minder onnodige belasting. Ze bewijzen niet dat precies deze vijf tabnamen, kleurstelling of schermindeling voor onze klanten optimaal zijn.

## Primaire onderzoeken en richtlijnen

### 1. Vindbaarheid van navigatie — Pernice & Budiu, NN/G, 2016

**Methode:** remote taakonderzoek met 179 deelnemers uit het VK, op zes bestaande websites; 80 gebruikten een telefoon en 99 een desktop. Op telefoons werden verborgen en gedeeltelijk zichtbare navigatie vergeleken. Volledig zichtbare mobiele navigatie was geen testconditie.

**Bevinding:** op mobiel werd gedeeltelijk zichtbare navigatie vaker gebruikt dan volledig verborgen navigatie: 86% tegenover 57%. Taakduur was 15% langer met verborgen navigatie. Dit ondersteunt het zichtbaar houden van frequente bestemmingen.

**Beperking:** onderzoek uit 2015 op nieuws- en winkelsites, geen experiment met onze fitnessapp; verschillen tussen de sites kunnen meespelen. Deze percentages zijn geen voorspelling van onze verbetering.

**Toepassing als ontwerpkeuze:** vaste, gelabelde bestemmingen voor dagelijkse taken. Minder gebruikte opties mogen achter een duidelijk gelabelde bestemming staan. Alleen een pictogram of generieke plus vertelt onvoldoende welke handeling volgt.

Bronnen, volledig geopend: [resultaten](https://www.nngroup.com/articles/hamburger-menus/) en [methode](https://www.nngroup.com/articles/hidden-navigation-methodology/).

### 2. Eerste gebruik en twee weken gebruik — Baretta, Perski & Steca, 2019

**Methode:** kwalitatief onderzoek bij 20 onvoldoende actieve volwassenen van 30–50 jaar in Lombardije; denken-hardop tijdens eerste gebruik van één van drie toegewezen beweegapps. Na twee weken volgden interviews met 17 deelnemers.

**Bevinding:** eenvoud, weinig mentale inspanning en betrouwbare zelfregistratie waren zowel bij eerste gebruik als later belangrijk. Deelnemers hadden moeite met omslachtige handmatige invoer. Een eenvoudig begin alleen is dus onvoldoende: de terugkerende registratie moet ook gemakkelijk zijn.

**Beperking:** kleine, geselecteerde groep en korte follow-up; de apps waren voornamelijk gericht op lopen/hardlopen. Dit bewijst geen effecten voor krachttraining, supplementregistratie of langdurige retentie.

**Toepassing als ontwerpkeuze:** direct een training kunnen openen en gebruik kunnen registreren. Vooraf ingevulde eigen waarden mogen typwerk beperken, maar het opslaan en de gekozen hoeveelheid moeten expliciet blijven. Geen verplichte uitgebreide setup vóór de eerste nuttige handeling.

Bron, volledige paper gelezen via auteursinstelling: [UCL-publicatie/PDF](https://discovery.ucl.ac.uk/10067815/1/Baretta%20et%20al.%202019.pdf). [Uitgeverspagina](https://mhealth.jmir.org/2019/2/e11636/).

### 3. Iteratief testen bij inactieve volwassenen — Hollman et al., 2025

**Methode:** drie workshops/focusgroepen met elk vijf volwassenen, gevolgd door een afzonderlijke pilot met 14 volwassenen die de aangepaste app twee weken gebruikten. Interviews en de Mobile App Usability Questionnaire ondersteunden de evaluatie.

**Bevinding:** onduidelijke termen, moeilijk vindbare hulp en problemen met gegevens invoeren/wijzigen kwamen naar voren. De eerste ronde leidde onder meer tot kortere tekst per kaart. In de pilot vonden 9 van de 13 deelnemers met relevante interviewdata navigeren gemakkelijk: tevredenheid betekende niet dat alle problemen opgelost waren.

**Beperking:** één prototype en kleine groepen; de eerste groep kreeg een rondleiding en was grotendeels hoogopgeleid. Geen bewijs dat beginners zelfstandig dezelfde prestaties halen.

**Toepassing als ontwerpkeuze:** gangbare woorden, één duidelijke vervolghandeling, bewerken vindbaar naast de gegevens. Test het product eerst zonder rondleiding; een tutorial mag onduidelijke navigatie niet maskeren.

Bron, volledige uitgeverspagina geopend: [JMIR Formative Research, e59477](https://formative.jmir.org/2025/1/e59477/).

### 4. Krachttraining en verschillende digitale vaardigheden — Berry et al., 2026

**Methode:** vier online focusgroepen met 18 volwassenen van 60–83 jaar, verdeeld naar ervaring met gezondheidsapps. Thematische analyse met het Technology Acceptance Model.

**Bevinding:** deelnemers wilden eenvoud, begrijpelijke instructie en aanpasbare functies. Reacties op gamification verschilden; sociale functies moesten optioneel zijn. Complexiteit en slechte bruikbaarheid waren terugkerende bezwaren.

**Beperking:** kwalitatieve verwachtingen van oudere volwassenen; geen vergelijking van concrete navigatievarianten, geen bewijs over jonge gymbezoekers. Voor deze bron is de abstract op de institutionele repository gelezen; de volledige uitgeverspagina/PDF was niet toegankelijk via de gebruikte webtool.

**Toepassing als ontwerpkeuze:** groepen en challenges mogen zelfstandig trainen en registreren niet verdringen. Gebruikers moeten zonder sociaal profiel, competitie of uitgebreid schema kunnen starten.

Bron, geopende institutionele publicatie en abstract: [Lancaster University](https://eprints.lancs.ac.uk/id/eprint/236030/).

### 5. Herkenbare iPhone-navigatie — Apple Human Interface Guidelines

**Richtlijn, geen effectstudie:** tabbladen vertegenwoordigen hoofdbestemmingen; acties horen in de inhoud/werkbalk. Geef tabs een tekstlabel en houd de tabnavigatie voorspelbaar bij het wisselen van secties.

**Toepassing als ontwerpkeuze:** iedere pagina krijgt één logische hoofdsectie. Productgebruik blijft bij Producten; een oefening bewerken blijft bij Training; foto’s blijven bij Progressie. Navigatieknoppen krijgen een bestemming, actieknoppen een werkwoord. Formulieren mogen tijdelijk hun eigen opslaan/annulerenbalk hebben.

Bron: [Apple — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars). De actuele richtlijntekst is via het officiële zoekresultaat gelezen; direct openen leverde een JavaScriptpagina zonder tekst op.

### 6. Aanraakdoelen — W3C WCAG 2.2

**Normatieve maatstaf met toelichting, geen klantonderzoek:** criterium 2.5.8 op niveau AA noemt 24 × 24 CSS-pixels, met uitzonderingen. Het strengere 2.5.5 op niveau AAA noemt 44 × 44 CSS-pixels. De toelichting adviseert grotere doelen voor veelgebruikte, opeenvolgende of lastig bereikbare handelingen.

**Toepassing als ontwerpkeuze:** mik voor knoppen in deze mobiele app op minimaal 44–48 CSS-pixels hoogte/breedte waar relevant; houd ook de tikzone van kleine pictogrammen ruim. Controleer dat de vaste navigatie geen inhoud of toetsenbordinteractie afdekt. Dit is geen claim dat de hele app WCAG-conform is.

Bronnen, volledig geopend: [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) en [Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).

## Klantgroepen als werkhypotheses

| Gebruikscontext | Wat iemand waarschijnlijk probeert te doen | Wat de app direct moet uitleggen |
| --- | --- | --- |
| Nieuwe of onregelmatige gymbezoeker | Een oefening en eerste set vastleggen | Waar begin ik, welke gegevens zijn nodig, wanneer is het opgeslagen? |
| Regelmatige sporter tussen sets | Snel gewicht en herhalingen noteren | Welke set is aan de beurt en welke sets zijn bewaard? |
| Gebruiker van creatine/pre-workout of eigen producten | Hoeveelheid registreren of in de winkel voorraad checken | Gebruik invoeren en voorraad bekijken zijn twee verschillende handelingen. |
| Gebruiker die gewicht/foto’s bijhoudt | Een meting of foto toevoegen en terugvinden | Foto’s zijn optioneel en blijven lokaal; toevoegen moet herkenbaar zijn. |
| Sporter met vrienden | Challenge bekijken, deelnemen of aanmaken | Wat werkt lokaal, wat vereist Premium-teststand en wat synchroniseert niet? |

Dit zijn taaksegmenten uit de productvraag, geen gemeten marktsegmenten. We kennen hun onderlinge omvang, betaalbereidheid of exacte leeftijdsverdeling nog niet.

## Gevonden frictie in de bestaande code

Inspectie van `app/app.js`, `app/products.js`, `app/body.js` en `app/onboarding.js` vóór de navigatiewijziging:

- Een oefening bewerken markeerde altijd Planning als actief, ook als de gebruiker vanuit de training van vandaag kwam. De navigatie weerspiegelde dus niet steeds de huidige taak.
- Voorraad en gebruik hadden geen vaste eigen hoofdroute. Producten stonden op Vandaag onder de Engelse kop `DAILY STACK`; de registratieknop was alleen een plus.
- Vandaag combineerde een weeknavigator, trainingbanner, oefeningenlijst, producten, herinneringen, notities en een uitgebreide optionele checklist. Veel inhoud concurreerde om aandacht vóór een eerste registratie.
- Gewicht en foto’s vereisten het herkennen van Progressie als ingang, waarna meerdere deelpagina’s volgden. Er was geen algemene, direct zichtbare ingang voor een nieuwe meting of foto.
- Planning en een losse training stonden naast elkaar zonder dat de consequentie van bewerken overal meteen zichtbaar was.

Dit zijn inspectiebevindingen, geen waargenomen gebruikersfouten. Ze geven concrete kandidaten voor verbetering en tests.

## Beslissingen voor deze iteratie

1. Geef veelgebruikte taken vaste gelabelde ingangen: Vandaag, Training, Producten, Progressie en een duidelijke plek voor overige functies. Definitieve labels moeten door een eerste-kliktest worden gevalideerd.
2. Maak Vandaag een korte startplek: huidige training, direct productgebruik en een duidelijke ingang voor gewicht/foto’s. Zet weekplanning, AI, instellingen en uitgebreide uitleg op hun eigen plek.
3. Laat knoppen zeggen wat gebeurt: `Training openen`, `Gebruik invoeren`, `Product toevoegen`, `Gewicht invoeren`, `Foto toevoegen`. Een plus mag het label ondersteunen.
4. Maak het verschil zichtbaar tussen een losse training loggen en het terugkerende weekschema aanpassen.
5. Houd dezelfde hoofdsectie actief gedurende een taak; maak teruggaan voorspelbaar. Behoud gegevens en bestaande routes tijdens deze verandering.
6. Toon een kleine relevante uitleg bij de eerste echte handeling. Houd hulp/rondleiding beschikbaar, maar maak lezen ervan niet noodzakelijk om te beginnen.
7. Behoud de bestaande privacy- en prijsafspraken: foto’s nooit uploaden, AI via eigen gekopieerde prompt, gratis deelname, Premium-test voor groepsaanmaak en geen echte betaling.

De rangschikking hierboven is productoordeel op basis van de klacht, de code en de bronnen. Er is geen onderzoek dat een specifieke tabtelling of een bepaalde donkere kleurstelling voor deze app bewijst.

## Volgende echte klanttest — nog niet uitgevoerd

**Ronde 1:** werf 6–8 Nederlandstalige iPhone-gebruikers buiten het ontwikkelteam, met variatie in digitale vaardigheid en gymervaring. Neem minstens drie mensen die recent zijn begonnen of niet regelmatig trainen; neem ook mensen die nooit een fitnessapp hebben gebruikt. Dit is een haalbare kwalitatieve ronde, geen representatieve survey.

**Opzet:** 30–40 minuten per persoon op hun iPhone, met een leeg lokaal profiel. Eerst taken zonder rondleiding en zonder aanwijzingen over tabnamen. Moderator observeert en laat de gebruiker waar passend hardop denken. Meet tijdens hardop denken geen tijden alsof het ongestoorde natuurlijke prestaties zijn. Gebruik onschuldige testfoto’s; laat privéfoto’s niet verzamelen of uploaden.

**Taken:**

1. Leg een eerste oefening met één afgeronde set vast, sluit de app en vind de set terug.
2. Voeg een eigen product toe met 300 g voorraad en een door de testopdracht gegeven omrekening van 10 g per scoop. Registreer 0,5 scoop en vertel hoeveel overblijft. Dit is een rekentaak, geen gebruiksadvies.
3. Je staat in een winkel: zoek alleen hoeveel voorraad er nog is, zonder gebruik te registreren.
4. Voeg een gewichtsmeting en een testfoto toe. Vind beide terug en leg uit waar de foto wordt opgeslagen.
5. Verander een weekplan en vertel of dat volgens jou een bestaande afgeronde training wijzigt.
6. Vind een gedeelde challenge, bepaal welke functies gratis zijn en of scores automatisch met vrienden synchroniseren.
7. Herstel een verkeerde invoer en ga terug naar de plaats waar je begon.

**Registratie:** eerste gekozen route, taak zonder hulp voltooid ja/nee, verkeerd geopende schermen, verkeerd opgeslagen gegevens, gebruikte terugknoppen en letterlijk uitgesproken onduidelijkheden. Vraag na iedere taak een gemakscore van 1–7 en waarom. Rapporteer aantallen zoals 6/8, geen schijnprecisie of statistische significantie.

**Voorlopige acceptatiecriteria:** minstens 7/8 kunnen de eerste set en productregistratie zonder moderatorhulp bewaren; iedereen vindt een opgeslagen foto terug; geen verwarring over uploads of echte Premiumbetaling; niemand slaat gebruik op terwijl die alleen voorraad zoekt. Dit zijn vooraf gekozen productdoelen, geen wetenschappelijke universele normen.

**Ronde 2:** pas de grootste terugkerende problemen aan en test met 5–8 nieuwe mensen. Controleer daarna met een kleine vrijwillige groep één week in de gym of de dagelijkse logging prettig blijft. Verzamel alleen expliciet toegestane feedback, geen automatische upload van trainingsgegevens of foto’s.
