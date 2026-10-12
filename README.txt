# Ritregistratie – nieuwe zelfstandige versie

Bestanden:
- `index.html`: invoerschermen
- `style.css`: mobiele vormgeving
- `app.js`: browserlogica en lokale opslag
- `Code.gs`: Google Apps Script backend voor Google Sheets
- `manifest.json`: basis PWA-manifest

## Eerst instellen
1. Maak een nieuwe Google Spreadsheet.
2. Open Extensies → Apps Script en vervang de inhoud door `Code.gs`.
3. Vul in `Code.gs` `SPREADSHEET_ID` en `ACCESS_TOKEN` in. Gebruik een lange, unieke code.
4. Voer `doGet` niet handmatig uit; publiceer het script als webapp (uitvoeren als eigenaar). Kopieer de webapp-URL.
5. Vul in `app.js` `API_URL` en dezelfde `ACCESS_TOKEN` in.
6. Zet de bestanden op GitHub Pages of een andere HTTPS-hosting.
7. Open de app en test eerst met proefgegevens.

## Sheets
- `Diensten`: één rij per dienst, met begin/eindstand en verplicht `RusttijdNaDienst`.
- `Stops`: één rij per stop; palletsoorten en aantallen worden in cellen samengevoegd met `;`.
- `Tankbeurten`: één rij per tankbeurt.
- `SyncLog`: voorkomt dat hetzelfde event nogmaals wordt verwerkt.

## Belangrijke aandachtspunten
- De browser bewaart gegevens lokaal en maakt een wachtrij voor synchronisatie. Synchroniseer zodra er verbinding is.
- Een token dat in client-side JavaScript staat, is zichtbaar voor gebruikers die de app kunnen openen. Gebruik dit daarom niet als enige beveiligingsmaatregel voor gevoelige gegevens; beperk toegang en roteer de token indien nodig.
- Locatie/adres wordt via GPS en een reverse-geocodingdienst opgehaald. Postcode/plaats kunnen ontbreken als GPS of de dienst niet beschikbaar is.
- Dit is een nieuwe basisversie; test alle scenario's in een aparte spreadsheet voordat je hem voor echte ritten gebruikt.
