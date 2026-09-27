# Snelle invoer: referenties en ontwerpkeuzes

Geraadpleegd op 27 september 2026. Aanleiding: gebruik en gewicht registreren kostte te veel schermwissels; de interface voelde te druk en te veel als een website. Dit is een vergelijking van officiële productdocumentatie en platformrichtlijnen. Er zijn voor deze wijziging geen klantinterviews of vergelijkende gebruikerstests uitgevoerd.

## Wat vergelijkbare apps documenteren

| Bron | Gecontroleerd patroon | Toepassing in Gym Planner |
| --- | --- | --- |
| [Strong: eerste workout](https://help.strongapp.io/article/229-my-first-workout) | Het logscherm bevat oefeningen met sets. Per set vul je gewicht en herhalingen in en markeer je voltooiing. Een template vermijdt opnieuw opbouwen. | Kg, herhalingen en Bewaar blijven samen in de setrij. Geen popup of aparte pagina voor iedere set. |
| [FitNotes: workout tracking](https://www.fitnotesapp.com/workout_tracking/) | Bij een eerdere oefening worden setwaarden vooraf ingevuld. In hetzelfde trainingsscherm kun je velden typen of met plus/min aanpassen, bewaren en een bestaande set bijwerken. Selecteren van een set vult de invoervelden; de actie verandert dan naar Update. | Directe invoer, bruikbare standaardwaarden en zichtbare bewaartoestand. Een correctie is een update, niet per ongeluk een nieuwe registratie. |
| [Hevy: workout logging](https://help.hevyapp.com/hc/en-us/articles/35361530647959-How-to-Log-a-Workout-in-the-Hevy-App-Step-by-Step-Guide) en [setinvoer](https://www.hevyapp.com/features/track-workouts/) | Een vaste Workout-tab leidt naar een lege workout of herbruikbare routine. Tijdens een workout worden gewichten en herhalingen bij sets ingevuld. Eerder gebruikte waarden zijn beschikbaar; extra oefenopties hebben een apart menu. | De herhaalde handeling staat voorop. Configuratie en verwijderen concurreren niet met de knop om een set te bewaren. |
| [Apple Gezondheid: handmatig gegevens toevoegen](https://support.apple.com/en-au/108779) | Vanuit een gegevenstype open je Add Data, vul je waarde, datum en tijd in en rond je af met Done. De beschreven voorbeeldcategorie is Stappen, niet Gewicht. | Een losse meting is een korte taak met een duidelijke afronding. Profielinstellingen hoeven niet iedere keer zichtbaar te zijn. |

Dit zijn waargenomen interactiepatronen uit documentatie, geen bewezen ranglijst van de beste apps. Strong vermeldt 14 februari 2022 als laatste wijzigingsdatum. FitNotes is een Android-referentie. De publicaties tonen niet noodzakelijk exact de vandaag geïnstalleerde versie. De afbeeldinglinks zijn aangetroffen, maar de screenshots zijn niet visueel beoordeeld voor pixel- of kleurvergelijkingen. Er wordt daarom geen specifieke popupvorm aan deze apps toegeschreven.

## Waar een popup helpt

[Apple HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets?changes=_1) beschrijft een sheet voor een afgebakende taak die bij de huidige context hoort. Afronden of sluiten brengt de gebruiker terug naar het bovenliggende scherm. De richtlijn raadt één sheet tegelijk aan; Terug hoort bij een tussenstap, Sluiten bij het beëindigen van de taak. [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality?language=_1) benadrukt korte taken, herkenbare titels en een duidelijke manier om af te sluiten. Dit zijn ontwerpaanbevelingen, geen gecontroleerd experiment.

Onze toepassing:

- **Inline:** het herhaald invoeren van kg en herhalingen blijft direct in de training.
- **Compact venster:** productgebruik, één gewichtsmeting, een herinnering en het toevoegen of wijzigen van een oefening. De onderliggende pagina blijft herkenbaar. Opslaan werkt de gegevens bij en brengt je terug naar je beginpunt.
- **Productinstellingen als tussenstap:** aanpassingen van eenheden horen bij het product. Vanuit gebruiksinvoer moet je terug kunnen naar dezelfde invoer zonder de hoeveelheid kwijt te raken. Er is één zichtbare popup, met een duidelijk verschil tussen Terug en Sluiten.
- **Volledige pagina:** overzichten, geschiedenis, grafieken, fotovergelijking en lange configuratietaken mogen ruimte houden. De regel is niet dat elke functie in een popup moet.
- **Rustiger beeld:** kleinere gewone titels, minder omlijnde kaarten, minder promotietekst en een beperkt accent voor acties. Dit is onze visuele keuze op basis van de feedback; geen wetenschappelijke claim over een specifieke kleur.
- **Algemene instellingen:** alleen als vaste ingang op Vandaag, zoals gevraagd. Productinstellingen blijven apart bereikbaar wanneer de eenheden relevant zijn.

## Controleerbare uitkomsten

Deze punten zijn acceptatiecriteria, geen al gemeten resultaten:

1. Een set bewaren vereist geen schermwissel; een tweede set die je al had ingevuld raakt zijn invoer niet kwijt.
2. Gebruik registreren opent één compact venster. Een bestaand product met een passende standaardhoeveelheid vraagt alleen openen en bevestigen; de voorraad erachter wordt bijgewerkt.
3. Gewicht opslaan keert terug naar de pagina waar de gebruiker begon. Datum is standaard vandaag; aanvullende velden zijn optioneel.
4. Sluiten en Escape slaan niets op. Bewaren bij een opslagfout laat invoer intact; dubbel tikken maakt geen dubbele registratie.
5. Terug uit productinstellingen behoudt het gebruiksconcept. Er worden geen onzichtbare popupstapels opgebouwd.
6. Op een smal scherm blijven sluiten, invoer en bewaren bereikbaar met open toetsenbord. Minder beweging wordt gerespecteerd.
7. Foto's en appgegevens blijven in de bestaande lokale opslag; deze ontwerpwijziging voegt geen netwerkdienst toe.

Een korte gebruikerstest moet nog vaststellen of de verandering in de praktijk sneller en duidelijker is: laat nieuwe en terugkerende sporters zonder uitleg een set, productgebruik en gewicht vastleggen; meet voltooiing, fouten, terugklikken en tijd. Stel geen percentage tijdwinst voordat die test is uitgevoerd.
