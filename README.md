# Gym Planner — lokale iPhone-app

Functionele app met grafiet/oranje ontwerp. Werkt zonder hosting, account of internet. De iOS-app bundelt alle HTML, JavaScript, CSS en iconen; netwerkverkeer vanuit de webweergave is geblokkeerd.

## Wat werkt

- Een herhalend weekplan met oefeningen, sets, herhalingen, gewicht en herinneringen.
- Training per datum aanpassen en sets afvinken; PR’s en geschiedenis volgen uit afgeronde sets.
- Producten met g, mg, ml, liters, scoops, stuks, capsules, druppels en eigen eenheden. Eigen omrekeningen, voorraad aanvullen, gebruik loggen en ongedaan maken.
- Gewicht invoeren, wijzigen, verwijderen en bekijken in een grafiek.
- Foto’s via fotobibliotheek/camera toevoegen, lokaal verkleinen, dateren en vergelijken. Geen upload of cloudback-up vanuit de app.
- Lokale iPhone-meldingen na expliciet inschakelen. Maximaal 60 komende meldingen; open de app geregeld om de planning te vernieuwen.
- Gegevens exporteren/importeren. **De JSON-back-up bevat geen foto’s.** Bestaande foto’s blijven behouden bij het terugzetten van gegevens.
- Oudere plannergegevens worden bij de eerste start overgenomen; het oorspronkelijke archief blijft bewaard.

Social bevat alleen duidelijk gemarkeerde lokale voorbeeldprofielen. Geen online vrienden, echte challenges, betalingen, login of cloudsync. Een barcode kan handmatig bij een product worden opgeslagen; automatische productherkenning is nog niet aangesloten. AI-planning werkt via een lokale JSON-import uit een eigen AI-chat, zonder ingebouwde AI-service. Apple Health is nog niet gekoppeld.

## IPA bouwen

De bestaande GitHub Actions-workflow bouwt op macOS bij een push naar `main` of `codex/**`, of via handmatig starten. Hij test de logica, valideert de appbundel met Foundation, installeert en start een simulatorbuild en levert een **unsigned** `GymPlanner-2.0.1.ipa` met SHA-256 als workflow-artifact. Er wordt geen website, backend of publieke release gedeployd. Minimum: **iOS 15.4**.

Versie 2.0.1 heeft een nieuw oranje appicoon en corrigeert de installatieverpakking: webbestanden staan direct onder `GymPlanner.app/WebApp`. Een iOS-app mag geen eigen map `Resources` aan de bundelroot bevatten; die kan de melding **Missing bundle ID** veroorzaken ondanks een geldige `Info.plist`. De simulatorcontrole reproduceert de fout met de oude structuur en controleert daarna installatie van de nieuwe structuur.

## Installeren met Sideloadly op Windows

1. Pak de IPA uit het workflow-artifact uit.
2. Open [Sideloadly](https://sideloadly.io/), sluit je iPhone met USB aan en vertrouw de computer.
3. Selecteer je iPhone en sleep `GymPlanner-2.0.1.ipa` in Sideloadly.
4. Vul je Apple ID zelf in Sideloadly in en kies **Start**. Sideloadly ondertekent en installeert de app; de IPA is vooraf niet voor een toestel ondertekend.
5. Vertrouw zo nodig het ontwikkelaarsprofiel via **Instellingen → Algemeen → VPN en apparaatbeheer**. Schakel op iOS 16+ indien gevraagd **Ontwikkelaarsmodus** in via **Privacy en beveiliging**.

Met een gratis Apple ID moet je doorgaans elke zeven dagen opnieuw ondertekenen; Sideloadly kan dat vernieuwen zolang de vereiste verbinding en computer beschikbaar zijn. Het is geen App Store- of TestFlight-build. Installeer updates met dezelfde bundle-ID/signingidentiteit zonder de bestaande app eerst te verwijderen om lokale data te behouden.

## Opslag

Op iPhone: metadata als atomisch geschreven JSON en foto’s als JPEG-bestanden in de privémap `Application Support/GymData`. Zowel map als bestanden zijn uitgesloten van iCloud/iTunes-back-ups. Foto’s gaan via een lokale `gym-photo://`-handler naar de weergave. De fotobibliotheek kan een door de gebruiker gekozen bron bevatten; de app uploadt de eigen kopie niet. Bij verwijderen van de app of verlies van het toestel kan de app deze data niet vanuit een server herstellen.

Browserontwikkeling: metadata en foto’s gebruiken aparte IndexedDB-databases. Dit is browseropslag, geen belofte van native bestandsopslag. Websitegegevens wissen verwijdert deze gegevens.

## Lokaal ontwikkelen

```sh
npm install
npm test
npm run check
npm start
```

Open `http://127.0.0.1:8767`. Dit luistert uitsluitend lokaal. Lucide is meegeleverd in `app/vendor/`; runtime gebruikt geen CDN. `npm install` is alleen voor ontwikkelen nodig. iOS-build vereist Xcode op macOS of de bestaande GitHub Actions-build.
