# Orisus BFS Monitor - Projektkontext

Stand: 27.06.2026, Supabase-Produktivschema angewendet; Vercel-Env und Auth-User noch final setzen

## Prompt fuer den naechsten Chat

Kopiere diesen Prompt in den anderen Chat:

```text
Bitte lies zuerst die Datei `/Users/svendneumann/Documents/BFS_Mandantenportal/PROJECT_CONTEXT.md` vollstaendig ein und arbeite danach im Projekt `/Users/svendneumann/Documents/BFS_Mandantenportal` weiter.

Wichtig:
- Antworte auf Deutsch.
- Aktualisiere bei jedem erledigten Auftrag diese Datei `PROJECT_CONTEXT.md`, damit der Projektstand fuer andere Chats immer aktuell bleibt.
- Nutze die bestehende App-Struktur und aendere Fachlogik nur gezielt, wenn ich es konkret verlange.
- Vor Codeaenderungen immer kurz die betroffenen Dateien pruefen, insbesondere `components/monitor-app.tsx`, `lib/bfs-parser.ts`, `lib/demo-import.ts`, `lib/demo-data.ts`, `lib/types.ts` und `app/globals.css`.
- Die App heisst Orisus BFS Monitor.
- Ziel ist eine CFO-/Standortleiter-App fuer BFS-Abrechnungen: Umsatz eingereicht, BFS-Gebuehr, MwSt, EWMA/Meldeamtabfragen, Auszahlungsbetrag, Stornos, Rueckgaben, offene Faelle, Matching, Wieder-Einreichungen, Patientenklassifizierung und Reports.
- Aktueller Stand: Datenupload ist zurueckgesetzt; ohne Upload sollen Cockpit/Auswertungen leere Werte bzw. eine Keine-Daten-Meldung zeigen.
- Wenn du Dateien ausserhalb des Repos lesen musst, frage gezielt nach Berechtigung.
- Wenn du etwas aenderst: danach Typecheck/Build ausfuehren, committen und pushen.
```

## Projekt

Web-App: **Orisus BFS Monitor**

Ziel:
- BFS-Abrechnungen je Standort auswerten.
- Offene Klärfälle, Rückbelastungen und Stornos erkennen.
- Patienten ohne Ausfallschutz klassifizieren.
- Neueinreichungen nach Rückgabe/Storno matchen.
- CFO- und Standortleiter-Auswertungen ermöglichen.
- Reports für Standortleiter vorbereiten/exportieren.

Repository:
- Lokal: `/Users/svendneumann/Documents/BFS_Mandantenportal`
- GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`
- Hauptbranch: `main`

Deployment:
- Vercel-Projekt ist angebunden.
- App ist live erreichbar unter `https://bfs-mandatenuebersicht.vercel.app`.
- Livegang am 27.06.2026 nach grünem `pnpm run typecheck`, grünem `pnpm run build` und erfolgreichem HTTP-Smoke-Test der Produktions-URL.
- Supabase-Projekt: `dozcaktodvogbkiomcqo`.
- Die Supabase-Migrationen 001-005 wurden am 27.06.2026 erfolgreich auf das Projekt angewendet.
- Vercel-Production-Environment wurde am 27.06.2026 gesetzt:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Nach dem Setzen der Environment-Variablen wurde ein neuer Production-Deploy gestartet und erfolgreich auf `https://bfs-mandatenuebersicht.vercel.app` aliasiert.
- Supabase Auth-User `svend.neumann@orisus.de` wurde am 27.06.2026 angelegt, E-Mail ist bestaetigt, Identity-Provider ist `email`, Profil ist `super_admin` und `active=true`.
- Noch offen fuer vollstaendigen Livebetrieb: auf der Live-Loginseite `Passwort vergessen` ausloesen, eigenes Passwort setzen und Login/Upload mit echtem User testen.

## Technischer Stand

Framework:
- Next.js App Router
- React
- TypeScript
- Supabase Auth ist im Code fuer Produktion verpflichtend; lokaler Demo-Fallback ist nur in `NODE_ENV !== "production"` erlaubt
- Geschuetzte Routen werden serverseitig ueber `proxy.ts` gegen Supabase-Session-Cookies und `profiles.role` geprueft
- Upload laeuft im Produktivpfad ueber `/api/imports/parse`: serverseitiges Parsing, privater Supabase-Storage `bfs-documents`, Postgres-Tabellen fuer Dokumente, Abrechnungen, Forderungen, Bewegungen und Faelle
- Browser-Speicher bleibt als lokale UI-Vorschau/Cache bestehen, ist aber nicht mehr die einzige Datenhaltung im Produktivpfad
- Supabase-Struktur ist im echten Projekt angewendet; Migration `005_production_import_hardening.sql` ist aktiv, damit Mandantentabelle, Import-Events, Retention-Felder und Auth-Profiltrigger vorhanden sind

Wichtige Dateien:
- `components/monitor-app.tsx`: Haupt-App, Navigation, Dashboards, KPIs, Upload, Tabellen, Reports, Matching-Views
- `lib/bfs-parser.ts`: PDF-/BFS-Textparser
- `lib/demo-import.ts`: Upload-Verarbeitung, Datei-/Ordnerimport, Vorschau, Matching-Hinweise
- `app/api/auth/session/route.ts`: setzt/loescht serverseitige Supabase-Session-Cookies nach Login/Logout
- `app/api/imports/parse/route.ts`: serverseitiger Importpfad fuer PDF-Parsing, privaten Storage und Postgres-Persistenz
- `proxy.ts`: serverseitige Zugriffskontrolle fuer Dashboard-/Standort-/Admin-Routen
- `lib/demo-data.ts`: Demo-Standorte, Perioden-/Standortdaten, Fallback-Daten
- `lib/types.ts`: zentrale Typen
- `app/globals.css`: komplettes Layout/Design/Responsive Styling
- `public/orisus-zahnmedizin-logo.svg`: aktuelles transparentes Orisus-Logo fuer App-Header/Sidebar, bewusst als SVG/Vektor damit es auf Mobile/Desktop nicht verpixelt

Wichtige Hinweise:
- `pnpm run typecheck` funktioniert.
- `pnpm run build` funktioniert.
- `pnpm run lint` ist aktuell im Projekt falsch verdrahtet und sucht einen nicht existierenden Ordner `lint`.
- Supabase-Projekt-Ref: `dozcaktodvogbkiomcqo`, URL: `https://dozcaktodvogbkiomcqo.supabase.co`.
- Migrationen in Supabase angewendet:
  - `orisus_bfs_monitor`
  - `user_passkeys`
  - `seed_required_locations`
  - `location_go_live_dates`
  - `production_import_hardening`
- Verifiziert: alle 15 Public-Tabellen existieren, Storage-Bucket `bfs-documents` ist privat (`public=false`), 15 Mandantennummern sind Standort/Go-live-Datum zugeordnet.
- Vercel Production Env ist gesetzt und redeployed. Smoke-Test: Landingpage erreichbar; `/dashboard` leitet ohne Session erwartungsgemaess auf `/login` um.
- Supabase Auth Admin-User ist angelegt: `svend.neumann@orisus.de`, `super_admin`, `active=true`.
- Das Initialpasswort wurde nicht im Projekt oder Chat offengelegt. Fuer den ersten echten Login auf `https://bfs-mandatenuebersicht.vercel.app/login` die Funktion `Passwort vergessen` nutzen und ein eigenes Passwort setzen.

## Aktueller App-Zustand

### Datenstand / Upload

Der Datenupload ist aktuell bewusst zurückgesetzt.

Ohne Upload gilt:
- Import-Center zeigt 0 Dateien.
- Standort-Tabs zeigen `0 offen`.
- Cockpit/Zusammenfassung, Auswertungen, Klärfälle, Risiko, Matching und Reports zeigen eine klare Meldung `Datenupload zurückgesetzt` bzw. keine Daten.
- Demo-Importdaten werden nicht mehr automatisch als Fallback angezeigt.

Reset-Logik:
- Button `Upload zurücksetzen` löscht sichtbaren Datenstand.
- Er löscht aktuelle und alte `localStorage`-Importkeys.
- Er löscht aktuelle und alte IndexedDB-Importdatenbanken.
- Statusmeldung: erst `Upload wird vollständig gelöscht`, danach `Kompletter Import gelöscht`.

Speicher:
- aktueller IndexedDB-Name: `orisus-bfs-monitor-imports-v2-reset`
- alter IndexedDB-Name wird beim Reset ebenfalls gelöscht: `orisus-bfs-monitor-imports`
- aktueller localStorage-Key: `orisus_bfs_monitor_import_preview_v2_reset`
- alter localStorage-Key wird beim Reset ebenfalls gelöscht: `orisus_bfs_monitor_import_preview`

Navigation lädt Daten frisch:
- Beim Tabwechsel wird lokaler Datenstand erneut aus IndexedDB gelesen.
- Standortwechsel lädt ebenfalls neu.
- Interne App-Buttons/Kacheln nutzen denselben Navigationsweg wie die Sidebar.
- Logo-Klick führt auf `Zusammenfassung` und lädt lokalen Datenstand frisch.

## Standorte

Aktive bzw. vorbereitete Standorte:
- Kirchberg, live seit 01.07.2024
- Essen, live seit 01.01.2025
- Kehl, live seit 01.04.2025
- Ulmet, live seit 01.07.2025
- Hüttenberg, live seit 01.01.2026
- Kassel, vorbereitet, live ab 01.07.2026

Bekannte Mandantennummern/Zuordnung:
- Essen: u.a. `18790`
- Ulmet: `19260`, `19668`, `19669`
- Kassel/Spohr: `20309`, `20902`
- Aligner-Konten sollen dem jeweiligen Standort zugeordnet werden, nicht separat behandelt werden.

Standortverwaltung:
- Es gibt im `Admin Bereich` eine Standortverwaltung.
- Standortname, Praxisname, Go-live und BFS-Mandantennummern können bearbeitet werden.
- Änderungen werden lokal im Browser gespeichert und für Demo-Zuordnung genutzt.

## Navigation / UI-Begriffe

App-Name: **Orisus BFS Monitor**

Hauptnavigation Super Admin:
- Überblick
  - Zusammenfassung
  - Schnellantworten
  - Forderungen & Geldfluss
  - Prioritäten heute
- Klärfälle
  - Offene BFS-Klärfälle
  - Rückbelastungen
  - Wiedervorlagen
- Risiko & Matching
  - Ohne Ausfallschutz
  - Wiederholer ohne Schutz
  - Patientenklassifizierung
  - Neueinreichungen
- Auswertung
  - Report-Center
  - Maßnahmenkontrolle
  - Gruppenreports
- Import & Prüfung
  - Import-Center
- Admin Bereich
  - Standorte
  - Nutzer & Rollen
  - Sicherheit & Regeln

Wichtig:
- Der frühere Tab `CFO-Cockpit` heißt jetzt **Zusammenfassung**.
- Der frühere Bereich `Verwaltung` heißt jetzt **Admin Bereich**.
- `Import-Vorschau` und `Import-Historie` wurden im **Import-Center** zusammengeführt.
- `Auswertung` steht oberhalb von `Import & Prüfung`.
- Upload-Buttons sollen nicht in normalen Auswertungs-/Standorttabs stehen; Upload nur im Import-Center.

Accordion-Verhalten:
- Sidebar-Gruppen sind sichtbare Accordion-Reiter.
- Beim Wechsel des aktiven Tabs klappen andere Bereiche ein.
- Mobile: Off-Canvas Drawer mit Overlay.
- Desktop: Sidebar dauerhaft sichtbar.

Logo:
- Oben links steht das reguläre transparente Orisus-Zahnmedizin-Logo aus `public/orisus-zahnmedizin-logo.svg`.
- Das Logo muss als SVG/Vektor eingebunden bleiben, weil die PNG-Version auf Mobile sichtbar verpixelt wirkte.
- Nicht das quadratische App-Logo.
- Klick auf das Logo führt immer zur **Zusammenfassung**.

## Design / UX

Designrichtung:
- Dunkles Navy/Teal Premium-Dashboard.
- Orisus-Zahnmedizin-Branding.
- Management-Dashboard-Optik.
- Keine grellen Gradients, keine Deko-Orbs.
- Karten/Container mit feinem Border und transluzenter dunkler Fläche.

Responsive:
- Desktop und Mobile/Tablet müssen funktionieren.
- Mobile Header ist fixed.
- Mobile Navigation ist Drawer mit Overlay.
- Der Nutzer will nicht nach jeder Kleinigkeit einen kompletten Mobile-Check; lieber grundsätzlich mobilkompatibel bauen und später gesamthaft prüfen.

Diagramme:
- Balkendiagramme haben interaktive Tooltips.
- Desktop: Hover.
- Mobile/Tablet: Tap.

KPI-Kacheln:
- Jede Kachel hat ein Info-Icon mit Herleitung.
- Zeitraum-Badge ist sichtbar.
- Herleitung soll fachlich nachvollziehbar sein.

Aktuelle Ergänzung KPI-Herleitung:
- Bei `Umsatz eingereicht`, `Auszahlungsbetrag`, `Gesamtkosten BFS`, `BFS-Gebühr netto` und `MwSt auf Gebühren` wird zusätzlich ausgewiesen:
  - Umsatzverlust durch Stornos/Rückgaben
  - Zusatzkosten ohne Steuer
  - BFS-Gebühr netto
  - EWMA/Meldeamtabfragen netto
  - Steueranteil separat
  - Auswirkung auf Auszahlungsbetrag/Gesamtabfluss

## Fachlogik Geldfluss

Grundsatz:
- Umsatz eingereicht
- BFS-Gebühr netto
- MwSt auf BFS-Gebühr
- EWMA/Meldeamtabfragen netto
- MwSt auf EWMA/Zusatzkosten
- Auszahlungsbetrag
- Rückgaben/Rückbelastungen
- Stornierungen
- Storno-/Rückgabe-Abzug
- Wieder reingeholt durch spätere Neueinreichung
- Noch nicht reingeholt/offen

Definitionen:
- Gesamtkosten BFS = BFS-Gebühr netto + MwSt auf BFS-Gebühr
- Zusatzkosten ohne Steuer = BFS-Gebühr netto + EWMA/Meldeamtabfragen netto
- Steuer soll getrennt ausgewiesen werden
- Stornos/Rückgaben sind kein normaler Kostenblock, sondern Umsatz-/Liquiditätsverlust bzw. Rückbelastung

Quoten:
- Stornoquote = Stornobetrag / eingereichter Umsatz
- Abzugsquote = Rückläufer + Stornos / eingereichter Umsatz
- Nicht reingeholt Quote = noch nicht gematchter Abzug / eingereichter Umsatz
- Matchingquote = wieder reingeholter Betrag / gesamte Abzugssumme

## Upload

Upload soll unterstützen:
- einzelne PDF-Dateien
- mehrere PDF-Dateien
- ganze Ordner
- Ordner mit Unterordnern
- Beispielstruktur:

```text
BFS Uploads/
  4. BFS_Ulmet/
    2026/
      01/
        AbrechnungsNachweis_19260_56.pdf
```

Die App soll rekursiv durch Unterordner laufen und PDF-Dateien einlesen.

Wichtig:
- Upload bleibt aktuell lokal im Browser/Demo-Modus.
- Trotzdem soll er sich wie Live-Daten verhalten.
- Neue Rechnungen werden über Identität/Hash/Abrechnungsdaten zusammengeführt.
- Doppelte Dateien werden über Hash/Dateiinformationen geprüft.
- Import-Center enthält Upload, Monatsstatus/Historie und Detailprüfung.

## BFS-Parser / Fachliche Erkennung

Parser soll erkennen:
- Mandantennummer
- Standort/Praxis über Mandantennummer und Hinweise
- Abrechnungsnummer
- Abrechnungsdatum
- Anzahl Forderungen
- Forderungssumme
- Auszahlungsbetrag
- BFS-Gebühr netto
- MwSt auf Gebühren
- EWMA/Meldeamtabfragen
- MwSt auf EWMA
- Patientenpositionen
- Kennzeichen ohne Ausfallschutz
- Kontoauszug-/Bewegungszeilen
- Rückgaben/Stornos
- Gründe/Bemerkungen

Letzte Parser-Verifikation:
- Datei: `AbrechnungsNachweis_19092_273.pdf`
- Mandant: `19092`, Standort Kehl / Zahnarztpraxis Zorn de Bulach
- Abrechnung: `273` vom `28.05.2026`
- Forderungen: `8`, Summe `1.621,10 EUR`, alle 8 Positionen erkannt
- Auszahlung/Umsatz Netto: `1.577,69 EUR`
- BFS-Gebühren: netto `36,48 EUR`, MwSt `6,93 EUR`, gesamt `43,41 EUR`
- Ohne Ausfallschutz: 1 Forderung, `218,12 EUR`, Patientin `Suominen-Picht, Irene`, Marker `*AA` / Auslandsadresse
- Kontoauszug erkannt: Abrechnungsumsatz und Regulierung/Überweisung je `1.577,69 EUR`
- Korrektur: `USt-ID-Nr.` darf nicht als MwSt-Zeile für Gebühren erkannt werden; Steuerzeile muss echte Beträge enthalten und Steuerbetrag positiv ausgewiesen werden.

Weitere Parser-Verifikation:
- Datei: `AbrechnungsNachweis_18504_249.pdf`
- Mandant: `18504`, Standort Kirchberg / Dres. Kallweit MVZ
- Abrechnung: `249` vom `22.05.2026`
- Forderungen: `69`, Summe `37.724,18 EUR`, alle 69 Positionen erkannt
- Auszahlung/Umsatz Netto: `36.714,12 EUR`
- BFS-Gebühren: netto `848,79 EUR`, MwSt `161,27 EUR`, gesamt `1.010,06 EUR`
- Ohne Ausfallschutz: 0 Forderungen, `0,00 EUR`
- Kontoauszug erkannt: Abrechnungsumsatz und Regulierung/Überweisung je `36.714,12 EUR`

Weitere Parser-Verifikation:
- Datei: `AbrechnungsNachweis_19260_106.pdf`
- Mandant: `19260`, Standort Ulmet / Praxis Dr. Hangx
- Abrechnung: `106` vom `29.05.2026`
- Forderungen: `91`, Summe `20.584,47 EUR`, alle 91 Positionen erkannt
- Umsatz Netto: `20.033,32 EUR`, Auszahlung `18.844,04 EUR`
- BFS-Gebühren: netto `463,15 EUR`, MwSt `88,00 EUR`, gesamt `551,15 EUR`
- EWMA/Meldeamtabfrage: netto `1,35 EUR`, MwSt `0,26 EUR`, gesamt `1,61 EUR`
- Ohne Ausfallschutz: 6 Forderungen, `1.145,92 EUR`, Marker `*KA`
- `RS/A` wird korrekt als Risikoschuldner mit Ausfallschutz erkannt, nicht als ohne Ausfallschutz
- Kontoauszug erkannt: 6 Storno-Liquidationen, 1 Rückgabe über `lt. iPortal-Rechnungsliste`, EWMA/MwSt, Abrechnungsumsatz und Regulierung
- Storno-/Rückgabe-Summe im Kontoauszug: `1.187,67 EUR`; Geldfluss geht auf: `20.033,32 - 1.187,67 - 1,61 = 18.844,04`
- Korrektur: generische `Rückgabe ...`-Zeilen ohne Ausfallschutz-Text werden als `sonstige_rueckbelastung` klassifiziert, damit sie in Rückgabe/Rückbelastungsauswertungen sichtbar sind.

Erweiterter Parser-Batchtest:
- Datei: `AbrechnungsNachweis_18790_139.pdf`, Mandant `18790`, Essen / Praxis Krause, Abrechnung `139` vom `05.03.2026`: 25/25 Forderungen, Summe `7.010,50 EUR`, Auszahlung `6.822,79 EUR`, Gebühr netto `157,74 EUR`, MwSt `29,97 EUR`, 1 ohne Ausfallschutz `643,55 EUR`, Marker `*KA`.
- Korrektur aus dieser Datei: reine numerische Rechnungsnummern können auch 9-stellig sein, z.B. `211441102`; Parser-Regel wurde von 8-stellig auf 8- bis 10-stellig erweitert.
- Datei: `AbrechnungsNachweis_19260_65-1.pdf`, Mandant `19260`, Ulmet / Praxis Dr. Hangx, Abrechnung `65` vom `11.02.2026`: 92/92 Forderungen, Summe `24.120,00 EUR`, Auszahlung `23.154,02 EUR`, Gebühr netto `542,70 EUR`, MwSt `103,11 EUR`, EWMA `1,35 EUR` + MwSt `0,26 EUR`, 6 ohne Ausfallschutz `708,87 EUR`, 2 Storno-Liquidationen `318,56 EUR`, Geldfluss passt.
- Datei: `AbrechnungsNachweis_19092_240.pdf`, Mandant `19092`, Kehl / Zahnarztpraxis Zorn de Bulach, Abrechnung `240` vom `02.04.2026`: 30/30 Forderungen, Summe `4.705,18 EUR`, Auszahlung `4.579,19 EUR`, Gebühr netto `105,87 EUR`, MwSt `20,12 EUR`, 5 ohne Ausfallschutz `726,62 EUR`, Marker `*AA`.
- Datei: `AbrechnungsNachweis_19804_21.pdf`, Mandant `19804`, Hüttenberg / Praxis Dr. Krauthausen, Abrechnung `21` vom `17.04.2026`: 53/53 Forderungen, Summe `5.926,89 EUR`, Auszahlung `5.768,19 EUR`, Gebühr netto `133,36 EUR`, MwSt `25,34 EUR`, 2 ohne Ausfallschutz `60,35 EUR`, Marker `*AA` und `*FÜ`.
- Datei: `AbrechnungsNachweis_19260_32.pdf`, Mandant `19260`, Ulmet / Praxis Dr. Hangx, Abrechnung `32` vom `27.10.2025`: 27/27 Forderungen, Summe `4.199,12 EUR`, Auszahlung `4.086,69 EUR`, Gebühr netto `94,48 EUR`, MwSt `17,95 EUR`, 1 ohne Ausfallschutz `179,93 EUR`, Marker `*RS`.

Weiterer Parser-Batchtest:
- Datei: `AbrechnungsNachweis_18790_139.pdf`, Mandant `18790`, Essen / Praxis Krause, Abrechnung `139` vom `05.03.2026`: erneut 25/25 Forderungen, Summe `7.010,50 EUR`, Auszahlung `6.822,79 EUR`, Marker `*KA`.
- Datei: `AbrechnungsNachweis_18790_150.pdf`, Mandant `18790`, Essen / Praxis Krause, Abrechnung `150` vom `13.04.2026`: 24/24 Forderungen, Summe `10.707,60 EUR`, Auszahlung `10.420,91 EUR`, keine Forderung ohne Ausfallschutz.
- Datei: `AbrechnungsNachweis_18790_60.pdf`, Mandant `18790`, Essen / Praxis Krause, Abrechnung `60` vom `08.07.2025`: 6/6 Forderungen, Summe `1.323,08 EUR`, Auszahlung `1.287,65 EUR`, keine Forderung ohne Ausfallschutz.
- Datei: `AbrechnungsNachweis_18504_26.pdf`, Mandant `18504`, Kirchberg / Dres. Kallweit MVZ, Abrechnung `26` vom `20.09.2024`: 4/4 Forderungen, Summe `6.329,92 EUR`, Umsatz Netto `6.160,44 EUR`, Auszahlung `6.151,84 EUR`, 1 ohne Ausfallschutz `170,68 EUR`, Marker `*RS`. Besonderheit: Kontoauszug hat `Kontostand alt: 8,60 EUR`; dadurch ist die Auszahlung um `8,60 EUR` niedriger als der neue Abrechnungsumsatz. App nutzt den expliziten Auszahlungsbetrag aus der Abrechnung.
- Datei: `AbrechnungsNachweis_19092_176.pdf`, Mandant `19092`, Kehl / Zahnarztpraxis Zorn de Bulach, Abrechnung `176` vom `23.12.2025`: 3/3 Forderungen, Summe `2.494,24 EUR`, Auszahlung `2.427,46 EUR`, keine Forderung ohne Ausfallschutz.
- Datei: `AbrechnungsNachweis_19260_33.pdf`, Mandant `19260`, Ulmet / Praxis Dr. Hangx, Abrechnung `33` vom `27.10.2025`: 5/5 Forderungen, Summe `2.918,67 EUR`, Umsatz Netto `2.840,52 EUR`, Auszahlung `2.790,52 EUR`, 1 Storno-Liquidation `50,00 EUR`, Geldfluss passt.
- Datei: `AbrechnungsNachweis_18790_39.pdf`, Mandant `18790`, Essen / Praxis Krause, Abrechnung `39` vom `30.04.2025`: 1/1 Forderung, Summe `2.984,39 EUR`, Auszahlung `2.904,48 EUR`, keine Forderung ohne Ausfallschutz.

EWMA:
- EWMA sind Einwohnermeldeamt-Abfragen, damit BFS die korrekte Anschrift ermitteln und eine Rechnung zustellen kann.

Gründe für Rückgaben/Stornos können variieren:
- unzustellbar
- laut Nachricht
- laut Factoringsvereinbarung
- ohne Ausfallschutz
- laut iPortal-Rechnungsliste
- sonstiger/neuer Grund

Neue Gründe sollen nicht verloren gehen:
- bekannte Gründe gruppieren
- unbekannte/neue Gründe als `Sonstiger / neuer Grund` oder vergleichbar sichtbar halten
- Originalwortlaut behalten

## Matching

Wichtigste fachliche Logik:
Wenn ein Patient in einer Abrechnung eingereicht wurde und später in einer Kontoauszug-/Rückgabe-/Storno-Zeile auftaucht, muss erkannt werden:
- Patient
- BFS-Nummer
- Rechnungsnummer
- Betrag
- Grund/Bemerkung
- Datum
- Quelle/Datei

Wenn derselbe Patient später wieder in einer Forderungsliste auftaucht, soll das als Neueinreichung/Wiedereinholung erkannt werden.

Vorsicht:
- `Zahlung nach Stornierung` wird nicht explizit gelesen.
- Patienten werden ggf. einfach neu eingereicht.
- Das kann aber auch eine neue Behandlung sein.
- Matching muss konservativ bleiben und sollte nicht jede spätere Einreichung automatisch als Erledigung werten.

## Patientenklassifizierung

Ziel:
- Patienten je Standort klassifizieren.
- Wiederholer ohne Ausfallschutz erkennen.
- Red-Flag-Patienten sichtbar machen.
- A-D-Klassifizierung vorbereiten:
  - A = zahlt sauber / unauffällig
  - B/C = beobachtungswürdig
  - D = hohes Risiko / mehrfach nicht bezahlt / mehrfach ohne Ausfallschutz

Wichtig:
- Standortbezogen auswerten.
- Gruppenweit vergleichbar machen.
- Reports für Standortleiter möglich.

## Reports

Report-Center soll:
- standortbezogene Reports exportieren
- offene Klärfälle zeigen
- Rückbelastungen/Stornos zeigen
- ohne Ausfallschutz laufend zeigen
- Wiederholer/Risikopatienten zeigen
- Druck/PDF ermöglichen

PDF-/Druckmodus:
- weißer Druckhintergrund
- kompakter Kopfbereich
- keine dunklen App-Hintergrundflächen im PDF

## Admin / Nutzer

Super-User:
- User: `Svend.neumann@orisus.de`
- Rolle: Super Admin
- Passwort wurde im Chat genannt, aber sollte nicht erneut in Kontextdateien festgehalten werden.

Hinweis:
- Keine Klartext-Passwörter in weitere Context-Dateien oder Commits schreiben.

## Wichtige letzte Commits

Aktuelle letzte Commits:
- naechster Commit: Supabase Auth und serverseitigen Import haerten
- `141f40f3` - Document Vercel live launch
- `1252c1f4` - Document additional BFS parser batch
- `f5e05726` - Support longer numeric BFS invoice numbers
- `f3aa3f7d` - Classify generic BFS returns
- `d9c9e011` - Document Kirchberg parser verification
- `a3902584` - Fix BFS fee VAT parsing
- Logo von PNG auf SVG/Vektor umgestellt, um Pixelung auf Mobile/Desktop zu vermeiden
- `2261686e` - Use clickable Orisus logo and refresh navigation data
- `aad283db` - Collapse sidebar sections on view change
- `21979e27` - Expand KPI derivation details
- `597b3e4a` - Rename CFO cockpit to summary
- `bf6f0602` - Use Orisus wordmark in app chrome
- `0ed0a554` - Fully clear import storage on reset
- `1c892722` - Reset uploaded data state
- `118900d7` - Rename admin nav section
- `fb986031` - Improve sidebar section separation
- `f20cabb3` - Move reports section above import
- `5bf95710` - Consolidate import center views
- `0680fe7e` - Fix recurring risk card layout

## Offene/naechste Themen

Mögliche nächste Punkte:
- Erneuter kompletter Live-Testupload mit echten BFS-PDFs.
- Prüfen, ob nach Reset wirklich alle Werte leer sind.
- Upload mit sehr vielen Dateien weiter stabilisieren, falls 829 Dateien wieder Fehlerseite erzeugen.
- Große Ordner unabhängig auswerten und App-Anzeige dagegen challengen.
- Vollständiger Mobile-/Tablet-/Desktop-Check am Ende eines größeren Blocks.

Bekannter Ordner für Ulmet-Auswertung:

```text
/Users/svendneumann/Desktop/BFS Uploads/4. BFS_Ulmet/
```

In einem neuen Chat sind ggf. neue Leserechte für diesen Ordner nötig.

Empfohlene Analyse für große PDF-Ordner:
1. PDFs rekursiv zählen.
2. Mit bestehendem Parser oder separatem Analyse-Script alle PDFs extrahieren.
3. Bewegungen/Rückgaben/Stornos sammeln.
4. Forderungslisten sammeln.
5. Matching nach Patient, BFS-Nr., Rechnungsnummer, Datum und Betrag durchführen.
6. Offene, wieder eingereichte und erledigte Fälle tabellarisch ausgeben.
7. Ergebnis mit App-Anzeige vergleichen.

Ergebnis immer mit Summen liefern:
- Anzahl Rückgaben/Stornos
- Betrag Rückgaben/Stornos
- Anzahl eindeutig Patienten zugeordnet
- wieder eingereicht/gematcht
- noch offen
- offene Summe
- wichtigste Patienten/Fälle

## Arbeitsweise/Wünsche des Users

Der User möchte:
- deutschsprachige Antworten
- praktisch und direkt
- diese Datei `PROJECT_CONTEXT.md` bei jedem Auftrag/Command aktualisiert haben
- keine unnötigen langen Mobile-Checks nach jeder kleinen Änderung
- am Ende größerer Blöcke einmal sauber gesamt testen
- keine fachliche Logik unnötig ändern, nur gezielt verbessern
- App soll CFO-tauglich sein: schnell offene Beträge, Rückläufer, Stornos, Gebühren, MwSt, Auszahlungsbetrag, Quoten und Standortvergleiche sehen
- Nach Änderungen: Typecheck/Build, committen und pushen

## Wichtig fuer neuen Chat

Wenn ein neuer Chat diesen Kontext liest:
1. Zuerst diese Datei lesen.
2. Dann relevante Dateien prüfen:
   - `components/monitor-app.tsx`
   - `lib/bfs-parser.ts`
   - `lib/demo-import.ts`
   - `lib/demo-data.ts`
   - `lib/types.ts`
   - `app/globals.css`
3. Bei Uploadordnern außerhalb des Repo-Lesezugriff explizit anfragen.
4. Bei großen PDF-Auswertungen nicht nur App-Anzeige glauben, sondern unabhängig alle PDF-Dateien auswerten.
5. Keine Klartext-Passwörter in Code, Kontextdateien oder Commits schreiben.
6. Nach jedem abgeschlossenen Auftrag die Datei `PROJECT_CONTEXT.md` mit dem neuen Stand, relevanten Commits und offenen Punkten aktualisieren.
