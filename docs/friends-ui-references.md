# Vriendengroepen: compacte interface

Onderzocht op 27 september 2026. Dit is een vergelijking van gepubliceerde productpatronen en platformrichtlijnen, geen eigen gebruikersonderzoek of bewijs dat één indeling voor iedereen de beste is.

## Bronnen en toegepaste keuzes

- [Apple HIG: Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables?changes=_5) adviseert beknopte rijtekst en detailweergaven voor uitgebreide inhoud. Daarom bestaat het groepenoverzicht uit de naam, het aantal leden en het aantal challenges. De chevron opent de groep. Hulp legt alleen de werking uit en is geen tweede navigatieroute.
- [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons?changes=l_8) onderscheidt primaire, secundaire en destructieve acties en adviseert duidelijke actielabels. Daarom staat dezelfde knop voor aanmaken niet tegelijk in een sectiekop en lege toestand. Verwijderen blijft een secundaire actie met bevestiging.
- [Hevy: Social Feed](https://www.hevyapp.com/features/content-feed/) presenteert de trainingstitel en enkele statistieken bij de inhoud. De [officiële afbeelding](https://www.hevyapp.com/wp-content/uploads/content-feed-featured-image.png) is in de browser visueel bekeken: een compacte titel-/statistiekenzone, waarna de echte inhoud volgt. De eigen groepsrijen krijgen daarom korte, concrete metadata in plaats van wervende tekst. Hevy's online feed, foto-upload en publieke ontdekking worden niet overgenomen.
- [Strong: performing a workout](https://help.strongapp.io/article/229-my-first-workout) beschrijft invoer van gewicht en herhalingen per set. De [officiële afbeelding](https://d33v4339jhl8k0.cloudfront.net/docs/assets/57baea42c697917de37cf9d3/images/600e91acc64fe14d0e1fe20e/file-Maa4sQU37J.jpg) is visueel bekeken: compacte gegevensrijen, directe voltooiing en minder opvallende aanvullende acties. Voor de eigen app blijft snelle invoer in de context. Deze documentatie is van 2022 en bewijst niet hoe elke huidige Strong-versie eruitziet.
- [Strava: Group Challenges](https://support.strava.com/en-us/articles/15401736-how-do-group-challenges-work-on-strava) beschrijft besloten challenges, doelen, perioden en deelnemerbeheer binnen de challengecontext. Dat ondersteunt een duidelijke hiërarchie: vriendengroepen → groep → challenges → score. De gebruiker bepaalt de betaalgrens: aanmaken is Premium en deelnemen blijft gratis. De huidige Strava-abonnementsvoorwaarden worden niet overgenomen.

## Concrete aanpassingen

De hoofdpagina toont een korte lokale-statusregel, de eigen groepen en één aanmaakactie. Extra uitleg over lokale opslag, Premium-testmodus en codes staat achter uitleg of in de betreffende invoer. Het ontbreken van hosting blijft zichtbaar; de interface suggereert geen online uitnodigingen of gezamenlijke synchronisatie.

Binnen een groep staan challenges als leesbare rijen. De details tonen een kleine score-/doelsamenvatting met een dunne voortgangsbalk; het doel krijgt geen grote campagnekaart. Beheer, groepscode en leden gebruiken aanvullende uitklapbare delen. Bestaande losse imports blijven herkenbaar als bewaarde oude doelen, zonder ze als een echte vriendengroep te presenteren.

`app/friends-ui.css` deelt de neutrale kleuren met `app/clean.css`. Tekstkleuren worden niet opnieuw uitgevonden. Knoppen en samenvattingen houden minimaal 44 pixels aanraakhoogte. Lange namen kunnen afbreken, invoer gebruikt minimaal 16 pixels tekst, en de compacte variant ondersteunt schermen van 320 pixels breed. Geen nieuwe animaties of gradients.

Visuele vergelijking en ontwerpkeuzes zijn uitgevoerd. Functionele en responsieve browsercontrole van de geïntegreerde app worden afzonderlijk uitgevoerd; uit deze bronnen volgt geen gemeten snelheidswinst.
