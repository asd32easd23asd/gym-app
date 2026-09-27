# Gym Planner — lokale iPhone-app

Functionele app voor dagelijks gebruik met een rustig zwart-grijs ontwerp en compacte invoervensters. Versie **2.3.0** werkt zonder hosting, account of internet. De iOS-app bundelt alle HTML, JavaScript, CSS en iconen; netwerkverkeer vanuit de webweergave is geblokkeerd.

## Navigatie

De vaste navigatie heeft vijf gelabelde bestemmingen: **Vandaag**, **Trainen**, **Producten**, **Progressie** en **Groepen**. Binnen een taak blijft de bijbehorende hoofdsectie herkenbaar.

- **Vandaag:** snel beginnen met de dagelijkse handelingen.
- **Trainen → Training / Weekplan:** een training per datum vastleggen of het herhalende weekschema aanpassen.
- **Producten → Voorraad / Gebruik:** controleren wat je hebt en terugzien wat je hebt geregistreerd.
- **Progressie → Kracht / Gewicht / Foto’s:** records, metingen en lokale voortgangsfoto’s bekijken.
- **Groepen:** lokale groepen, challenges en scores.

De keuzes zijn onderbouwd met [navigatieonderzoek en fitnessapp-onderzoek](docs/ux-navigation-research.md). Dit document bevat literatuur, een inspectie van de app en een plan voor toekomstige gebruikerstests; er is geen eigen klantonderzoek uitgevoerd.

## Snelle invoer en vormgeving

Gebruik, gewicht en korte bewerkingen openen een compact venster boven de huidige pagina. Opslaan keert terug naar het beginpunt; instellingen staan op Vandaag. Kg en herhalingen blijven direct in de setrij. Vriendengroepen tonen compacte challengeregels met voortgang; extra uitleg en beheer staan achter uitklapbare opties.

De ontwerpkeuzes zijn vastgelegd in [snelle-invoerreferenties](docs/quick-entry-references.md) en [vriendengroepenonderzoek](docs/friends-ui-references.md). Dit zijn documentatievergelijkingen en visuele controles, geen gemeten klantonderzoek of bewezen tijdwinst.

## Eerste gebruik

Een nieuwe installatie begint zonder voorbeeldtrainingen, producten, foto’s, vrienden of scores. De introductie legt in drie stappen de belangrijkste taken en lokale opslag uit. Je voornaam invullen is optioneel; de introductie overslaan kan ook.

Op Vandaag staat een optionele, standaard ingeklapte eerste-stappenkaart met ingangen voor een training, product of gewichtsmeting. Via Instellingen kun je de uitleg openen en de introductie opnieuw bekijken, zonder opgeslagen gegevens te verwijderen. Bij een update blijven bestaande gegevens behouden; de introductie verschijnt als je die nog niet hebt afgerond.

## Wat werkt

- Een herhalend weekplan met oefeningen, sets, herhalingen, gewicht en herinneringen.
- Training per datum aanpassen en sets bewaren; PR’s en geschiedenis volgen uit afgeronde sets. Een bewaarde set nogmaals bewaren maakt deze niet ongedaan en maakt geen dubbele set. Terugzetten is een expliciete handeling onder **Meer**.
- Producten met g, mg, ml, liters, scoops, stuks, capsules, druppels en eigen eenheden. Eigen omrekeningen, voorraad aanvullen, gebruik loggen en ongedaan maken.
- Gewicht invoeren, wijzigen, verwijderen en bekijken in een grafiek.
- Foto’s via fotobibliotheek/camera toevoegen, lokaal verkleinen, dateren en vergelijken. Geen upload of cloudback-up vanuit de app.
- Lokale iPhone-meldingen na expliciet inschakelen. Maximaal 60 komende meldingen; open de app geregeld om de planning te vernieuwen.
- Gegevens exporteren/importeren. **De JSON-back-up bevat geen foto’s.** Bestaande foto’s blijven behouden bij het terugzetten van gegevens.
- Oudere plannergegevens worden bij de eerste start overgenomen; het oorspronkelijke archief blijft bewaard.
- Gratis een prompt voor je eigen AI maken, het antwoord controleren en een weekplan toepassen.
- Echte lokale groepen, challenges en handmatig ingevoerde scores bewaren; vriendengroepcodes kopiëren of importeren.

**Barcode scannen** opent de iPhone-camera (AVFoundation) of een lokale camerascanner in de browser (meegeleverd ZXing). De browser kan ook een barcode uit een gekozen afbeelding lezen. Camerabeelden worden niet opgeslagen of verstuurd. Een bekende code opent je eigen opgeslagen product; bij een nieuwe code vul je naam en verpakking één keer zelf in. Er wordt geen online productdatabase geraadpleegd. Handmatige invoer blijft beschikbaar als scannen niet lukt. Apple Health is nog niet gekoppeld.

## Gratis plannen met je eigen AI

Open de AI-planner via **Trainen → Weekplan**. Kies je trainingsdoel, beschikbare dagen, tijd en materiaal. De app maakt een prompt die je zelf kopieert naar een AI-app naar keuze, bijvoorbeeld een lokaal model op je telefoon of computer. Gym Planner bevat geen ingebouwd AI-model en verstuurt geen aanvragen naar een AI-dienst. Of de gekozen AI-app lokaal of online werkt, bepaalt die andere app.

Plak het JSON-antwoord terug, controleer de leesbare weekweergave en bevestig voordat het schema wordt toegepast. Het startgewicht wordt op 0 kg gezet; je vult je eigen gewicht in tijdens de training. Toepassen vervangt je herhalende weekplan en de wekelijkse herinneringen daarin. Opgeslagen trainingen en afzonderlijke dagherinneringen blijven behouden. Foto’s, metingen en trainingsgeschiedenis worden niet in de prompt opgenomen.

## Groepen en Premium uitproberen

Via **Instellingen → Premium** kun je Premium aan- en uitzetten voor deze testversie. De schakelaar ontgrendelt functies op dit toestel en bewaart die keuze. **Dit is geen aankoop: er wordt niets afgeschreven en er start geen abonnement.**

- **Gratis:** trainingen, producten, progressie, foto’s, AI-prompts en deelnemen via een ontvangen groepscode.
- **Premium-test aan:** groepen en deelnemers aanmaken of aanpassen en eigen challenges maken.

Groepen begint leeg. Je maakt zelf een groep, voert namen in en stelt bijvoorbeeld een doel voor de zwaarste lift of het totale aantal herhalingen in. Scores worden handmatig opgeslagen en de lokale ranglijst wordt daaruit berekend. Deelnemers zijn namen op jouw toestel; de app maakt geen accounts aan en verstuurt geen uitnodigingen.

Challenges worden uitsluitend binnen een bestaande vriendengroep gemaakt. Je kunt een groepscode kopiëren en zelf delen: daarin staan de groepsnaam en challengedoelen, geen deelnemers, scores of foto’s. Iemand zonder Premium kan de vriendengroep importeren en eigen scores bijhouden. Oudere losse challenges worden met hun bestaande scores bewaard in een leesbaar archief en kunnen naar een gekozen vriendengroep worden verplaatst. **Scores blijven op ieder toestel afzonderlijk: er is geen online groepsverbinding, automatische synchronisatie of gedeelde live ranglijst.**

## IPA bouwen

De bestaande GitHub Actions-workflow bouwt op macOS bij een push naar `main` of `codex/**`, of via handmatig starten. Hij test de logica, valideert de appbundel met Foundation, installeert en start een simulatorbuild en levert een **unsigned** `GymPlanner-2.3.0.ipa` met SHA-256 als workflow-artifact. Er wordt geen website, backend of publieke release gedeployd. Minimum: **iOS 15.4**. Een geslaagde simulatorcontrole vervangt geen test op je eigen iPhone.

Het oranje appicoon en de installatiecorrectie uit versie 2.0.1 blijven behouden: webbestanden staan direct onder `GymPlanner.app/WebApp`. Een eigen map `Resources` aan de bundelroot veroorzaakte eerder **Missing bundle ID**, ondanks een geldige `Info.plist`. De simulatorcontrole reproduceert de fout met de oude structuur en controleert daarna installatie van de nieuwe structuur.

## Installeren met Sideloadly op Windows

1. Pak de IPA uit het workflow-artifact uit.
2. Open [Sideloadly](https://sideloadly.io/), sluit je iPhone met USB aan en vertrouw de computer.
3. Selecteer je iPhone en sleep `GymPlanner-2.3.0.ipa` in Sideloadly.
4. Vul je Apple ID zelf in Sideloadly in en kies **Start**. Sideloadly ondertekent en installeert de app; de IPA is vooraf niet voor een toestel ondertekend.
5. Vertrouw zo nodig het ontwikkelaarsprofiel via **Instellingen → Algemeen → VPN en apparaatbeheer**. Schakel op iOS 16+ indien gevraagd **Ontwikkelaarsmodus** in via **Privacy en beveiliging**.

Met een gratis Apple ID moet je doorgaans elke zeven dagen opnieuw ondertekenen; Sideloadly kan dat vernieuwen zolang de vereiste verbinding en computer beschikbaar zijn. Het is geen App Store- of TestFlight-build. Installeer updates met dezelfde bundle-ID/signingidentiteit zonder de bestaande app eerst te verwijderen om lokale data te behouden.

## Opslag

**Toegevoegde foto’s worden wel opgeslagen, uitsluitend lokaal op je iPhone. De app uploadt ze nooit naar een server.** Op iPhone staan metadata als atomisch geschreven JSON en foto’s als JPEG-bestanden in de privémap `Application Support/GymData`. Zowel map als bestanden zijn uitgesloten van iCloud/iTunes-back-ups. Foto’s gaan via een lokale `gym-photo://`-handler naar de weergave. Een oorspronkelijke foto in je eigen fotobibliotheek staat los van de lokale appkopie en de back-upinstellingen van deze app.

Een handmatig geëxporteerde JSON-back-up bevat de appgegevens, **zonder foto’s**. Bij verwijderen van de app verdwijnen ook de lokale appgegevens en fotokopieën. Bij verlies van het toestel kan de app die niet vanuit een server herstellen. Het importeren van een gegevensback-up behoudt de foto’s die al op het toestel in de app staan.

Browserontwikkeling: metadata en foto’s gebruiken aparte IndexedDB-databases. Dit is browseropslag, geen belofte van native bestandsopslag. Websitegegevens wissen verwijdert deze gegevens.

## Lokaal ontwikkelen

```sh
npm install
npm test
npm run check
npm start
```

Open `http://127.0.0.1:8767`. Dit luistert uitsluitend lokaal. Lucide en ZXing zijn inclusief licenties meegeleverd in `app/vendor/`; runtime gebruikt geen CDN. `npm install` is alleen voor ontwikkelen nodig. iOS-build vereist Xcode op macOS of de bestaande GitHub Actions-build.
