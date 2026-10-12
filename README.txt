RITREGISTRATIE — MOBIELE VERSIE 2

Inhoud:
- index.html: schermen en invoervelden
- style.css: vernieuwde mobiele vormgeving in de stijl van het voorbeeld
- app.js: registratie, lokale opslag, GPS, CSV-export en synchronisatie
- Code.gs: Google Apps Script-backend voor Google Sheets
- manifest.json: PWA-manifest

INSTELLEN
1. Maak een Google Spreadsheet.
2. Open Extensies > Apps Script en plaats de inhoud van Code.gs.
3. Vul in Code.gs SPREADSHEET_ID en ACCESS_TOKEN in.
4. Implementeer als webapp (uitvoeren als eigenaar) en kopieer de URL die eindigt op /exec.
5. Vul die URL bij API_URL in app.js in. Vul bij ACCESS_TOKEN exact dezelfde code in als in Code.gs.
6. Upload de bestanden naar de GitHub-repository die GitHub Pages gebruikt. Vervang de bestaande bestanden.
7. Open de site en test eerst met proefgegevens.

GEGEVENS
- Diensten: één rij per dienst.
- Stops: één rij per stop, palletsoorten samengevoegd per handeling met puntkomma's.
- Tankbeurten: één rij per tankbeurt.
- SyncLog: voorkomt dat hetzelfde event opnieuw wordt verwerkt.

LET OP
- Gegevens worden eerst lokaal op het apparaat bewaard. Druk op 'Nu synchroniseren' om ze naar Sheets te sturen.
- GPS is geen kilometerstand; kilometerstanden worden handmatig ingevoerd.
- Postcode en plaats komen via reverse geocoding en kunnen ontbreken.
- De ACCESS_TOKEN in app.js is zichtbaar voor gebruikers van de website. Behandel dit niet als een sterke beveiligingsgrens.
- Test eerst in een aparte spreadsheet. Deze versie is niet automatisch op jouw GitHub-site geplaatst.
