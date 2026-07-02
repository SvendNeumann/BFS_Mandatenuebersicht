# Orisus BFS Monitor - Projektkontext

Stand: 02.07.2026, ca. 19:30 Uhr
Repo: `/Users/svendneumann/Documents/BFS_Mandantenportal`  
Live: `https://bfs-mandatenuebersicht.vercel.app`  
GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`  
Aktueller Fokus: Orisus BFS Monitor mit drei Hauptbereichen: BFS-Abrechnungen/operative Fallarbeit, BFS-Rechnungsanalyse und Abrechnungsqualitaet. BFS-Abrechnungen laufen ueber Geldfluss, Saldo-/Prueflistenlogik und manuelle Klaerung. BFS-Rechnungsanalyse ist fachlich getrennt und arbeitet mit Einzelrechnungen, Leistungspositionen, Faktoren, Katalogabgleich, Benchmarking, Potenzial, Trends und Patientenprofil. Abrechnungsqualitaet nutzt Einzelrechnungen fuer Leistungsketten, Plausibilitaets-/Vollstaendigkeitspruefung und Praxis-Feedback.

## Aktuelle Wahrheit kurz

- Live-Stand ist produktiv deployed auf `https://bfs-mandatenuebersicht.vercel.app`; letzter Deploy am 02.07.2026 nach der neuen Benchmark-Mindestregel.
- Letzte Pruefung nach Codeaenderung: `pnpm lint` gruen und `pnpm test` gruen, 15 Tests bestanden. Ein Next/Vercel-Build wurde erfolgreich abgeschlossen und als Production aliasiert.
- `BFS-Abrechnungen` nutzt die zentrale Geldflusslogik: `Eingereichter Umsatz - BFS-Gebuehr netto - MwSt - EWMA/Adresspruefung = Auszahlung laut BFS`.
- Separat gilt die operative Abzugslogik: `Offene Pruefsumme = Brutto Storno/Rueckgabe - Bereits geklaert - Endgueltig verloren`.
- `Bereits geklaert` umfasst echte Neueinreichung/Ersatzrechnung, manuell bezahlt/geklaert und Ratenplan laut BFS.
- `Saldo 0` ohne Ratenplan ist kein Zahlungsnachweis. Bei Storno/Rueckgabe bleibt der Fall pruefpflichtig, bis er manuell geklaert, endgueltig storniert oder durch echte Neueinreichung/Ersatzrechnung erklaert ist.
- Die sichtbare operative Fallarbeit ist eine gemeinsame `Pruefliste`. Alte sichtbare Mehrkorb-Listen wie `Praxis nachfassen`, `Zahlung/Grund pruefen` und `Noch nicht zugeordnet` sind keine fuehrenden Haupttabs mehr.
- Gegencheck mit echtem Upload `/Users/svendneumann/Desktop/BFS Uploads`: 839 Abrechnungs-PDFs + 5 Saldolisten, ca. 4.652.836,91 EUR eingereicht, 4.470.324,62 EUR Auszahlung, 74.806,85 EUR Brutto Storno/Rueckgabe, 15.079,31 EUR automatisch geklaert und 59.727,54 EUR offene Pruefsumme vor manuellen Entscheidungen.
- `BFS-Rechnungsanalyse` ist fachlich getrennt von der Storno-/Saldo-Logik. Aktuelle Tabs: `Leistungsuebersicht`, `Katalogpruefung`, `Benchmarking`, `Faktor-Trend`, `Patientenprofil`, `Potenzialanalyse`, `Standortvergleich`, `Import-Center Rechnungen`.
- Neuer dritter Hauptbereich `Abrechnungsqualitaet`: Starttabs `Qualitaetscockpit`, `Leistungsketten`, `Praxis-Feedback`. Die erste Version erkennt datengetriebene Wenn-dann-Muster aus Rechnungspositionen, erzeugt Pruefhinweise fuer auffaellig seltene Begleitleistungen je Standort und bietet PDF-/CSV-Export fuer Praxisgespraeche. Hinweise sind fachliche Pruefansaetze, keine automatische Fehler- oder Rechtsbewertung.
- Neue Benchmark-Regel ab 02.07.2026: Leistungspositionen, die nur von 1 oder 2 Standorten verwendet werden, fliessen nicht in `Benchmarking` und nicht in `Potenzialanalyse` ein. Benchmarkfaehig ist eine Leistungsnummer erst ab mindestens 3 verwendenden Standorten mit Faktor. Importdaten bleiben unveraendert; nur die Auswertung filtert.
- Einzelrechnungen: BEMA/Festzuschuss-Rechnungen ohne GOZ-Faktor werden als Beleg erkannt, aber nicht in die GOZ-Faktor-/Faktor-Potenzialanalyse eingerechnet.
- Katalogpruefung veraendert keine Original-Importdaten. Sie normalisiert/markiert Leistungsnummern fuer Auswertungen, z. B. `Ä0001 -> Ä1`, `13BO -> 13B0`, fuehrende Nullvarianten und offensichtliche OCR-/Schreibvarianten. Automatisch eindeutige Faelle sollen nicht als manuelle Prueffaelle erscheinen.
- Katalogpruefung zeigt Leistungszeilen-Prueffaelle, nicht Rechnungsdokumente ohne auswertbare Leistungszeile. Importstatus `Zu pruefen` bei Einzelrechnungen kann daher leer in der Katalogtabelle bleiben, wenn keine Leistung mit Faktor vorhanden ist.
- Material-/Auslagen-/Laborzeilen, Null-Codes und reine OCR-Reste duerfen nicht als benchmarkfaehige Leistung laufen.
- Der zuletzt direkt importierte Einzelrechnungs-Batch vom 02.07.2026 hat Batch-ID `e852528d-6f4b-434f-b636-f4deda56c951`: 2.203 PDFs gelesen, 2.185 eindeutige Rechnungen, 2.136 neu, 49 aktualisiert, 18 lokale Dubletten, 18 leer/nicht informativ, 0 Importfehler. Supabase-Nachkontrolle: 7.159 echte Leistungszeilen, 0 Null-Codes, 0 Zahnnummer-Fuellungen als falsche Leistungsnummer, 0 Materialzeilen als Leistung, 0 Faktoren > 15. Es bleiben 130 Rechnungen mit Status `Zu pruefen`, weil keine abrechenbaren Leistungspositionen mit Faktor erkannt wurden; diese verfälschen die Auswertung nicht.
- Am 02.07.2026 wurden 25 offene operative Prueffaelle mit Grund `Fehler BFS` direkt in Supabase als `neu_eingereicht`/`erledigt_manuell` markiert. Danach: 0 offene `Fehler BFS`-Faelle.
- Abrechnungsmanagement-Rolle existiert als reine Lese-/Auswertungsrolle fuer BFS-Rechnungsanalyse. Sie darf keine Adminbereiche sehen und keine Upload-/Schreibrechte fuer Einzelrechnungen erhalten.
- App-Daten laden inzwischen browserseitig gecacht und nur beim ersten Login/erstem Datenbedarf bzw. `Neu laden` hart vom Server. Ziel: App schneller machen, ohne Import- oder Auswertungslogik zu veraendern.
- PDF-/Druckfenster in der App sollen eine eigene Toolbar/Schliessen-Option haben und nicht als leeres Zwischenfenster stehen bleiben, wenn die Browser-Druckvorschau abgebrochen wird.
- Praxissoftware-Sammeldrucke koennen als alternative Quelle fuer die Rechnungsanalyse relevant werden. Beispiel Kallweit-Sammeldruck: 756 A4-Seiten, bildbasiert ohne eingebetteten PDF-Text; normale PDF-Textextraktion liefert 0 Zeichen. Inhaltlich sind Rechnungsnummer, Patient, Rechnungsdatum, Betrag und Leistungszeilen visuell klar vorhanden, technisch braucht dieser Import aber OCR oder besser einen echten strukturierten Praxissoftware-Export.
- Leistungsnummern: Zahn-/Regionangaben wie `36` werden nicht als Leistungsnummer gruppiert, wenn danach eine echte Leistungsnummer wie `2180` folgt. Die Tabelle zeigt `Leistungsnr.`.
- Prueflisten-Export: PDF/Druck und CSV enden mit den manuellen Spalten `Kommentar` und `Wenn storniert: in der Praxissoftware ausgebucht?`.

## Prompt fuer den naechsten Chat

```text
Bitte lies zuerst `/Users/svendneumann/Documents/BFS_Mandantenportal/PROJECT_CONTEXT.md` vollstaendig ein und arbeite danach im Projekt `/Users/svendneumann/Documents/BFS_Mandantenportal` weiter.

Antworte auf Deutsch. Nutze die bestehende App-Struktur. Wenn du Code aenderst: zuerst relevante Dateien lesen, dann gezielt patchen, danach mindestens `pnpm lint`, `pnpm test` und bei produktionsrelevanten Aenderungen einen Vercel-Production-Deploy bzw. lokalen Build ausfuehren. Nicht ungefragt fremde/unrelated Aenderungen zuruecksetzen. Bei fertigen Aenderungen Context aktualisieren und, wenn vom Nutzer gewuenscht, committen/pushen.

Wichtig: Diese Kontextdatei muss nach jedem abgeschlossenen Arbeitsauftrag/Befehl mitgeschrieben werden. Wenn fachliche Logik, UI-Struktur, Importlogik, offene Punkte, Commits oder Pruefergebnisse dazukommen, `PROJECT_CONTEXT.md` am Ende aktualisieren, damit ein neuer Chat nahtlos fortsetzen kann.

Wichtige Dateien:
- `components/monitor-app.tsx`
- `app/globals.css`
- `app/api/imports/parse/route.ts`
- `app/api/invoices/parse/route.ts`
- `app/api/invoices/catalog-mappings/route.ts`
- `app/api/invoice-status/parse/route.ts`
- `app/api/cases/resolutions/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[userId]/route.ts`
- `lib/bfs-parser.ts`
- `lib/demo-data.ts`
- `lib/demo-import.ts`
- `lib/invoice-parser.ts`
- `lib/invoice-status-parser.ts`
- `lib/server-auth.ts`
- `proxy.ts`
- `supabase/migrations/*`

App: Orisus BFS Monitor. Ziel: BFS-Abrechnungen und BFS-Patientenrechnungen fuer Orisus-Standorte produktiv importieren, auswerten, steuern und als Management-/Operativ-Cockpit sichtbar machen: Umsatz eingereicht, Auszahlung, BFS-Gebuehren, MwSt, EWMA/Meldeamtabfragen, Rueckgaben, Stornos, offene Klaerfaelle, Matching/Neueinreichungen, ohne Ausfallschutz, Patientenqualitaet, Standort-Benchmark, Rechnungspositionen/Faktoren/Laboranteile, BFS-Zahlungsstatus, Mahnstufen, Ratenplaene, Saldo-Pruefung und Reports.
```

## Permanente Arbeitsregel Kontextdatei

`PROJECT_CONTEXT.md` ist die zentrale Uebergabedatei fuer neue Chats und muss aktiv gepflegt werden.

Regel:
- Nach jedem abgeschlossenen Nutzerauftrag pruefen, ob neue fachliche Entscheidungen, technische Aenderungen, UI-Aenderungen, Import-/Datenlogik, offene Punkte, Pruefergebnisse oder Commits entstanden sind.
- Falls ja: `PROJECT_CONTEXT.md` im selben Arbeitsgang aktualisieren.
- Die Datei soll nicht mit Kleinigkeiten zugemuellt werden, aber alle entscheidungsrelevanten Projektstaende, naechsten Schritte und Warnhinweise enthalten.
- Neue Chats sollen zuerst diese Datei lesen und danach direkt weiterarbeiten koennen.

## BFS-Portal Downloadlauf Einzelrechnungen

Aktueller manueller Downloadlauf ueber Chrome/BFS-Portal:
- Ziel: BFS-Rechnungsduplikate einzeln aus dem BFS-Mandantenportal laden, Zeitraum rueckwaerts von 26.06.2026 bis 01.08.2025.
- Wichtigste Regel: Klicks zaehlen nicht als Erfolg. Eine Rechnung gilt nur als erledigt, wenn im Ordner `/Users/svendneumann/Downloads` eine Datei `Rechnung_5-...pdf` mit exakt dieser BFS-Nummer liegt.
- Nach ca. 100 Rechnungen bzw. mehreren Seiten immer den Downloadordner pruefen: `find /Users/svendneumann/Downloads -maxdepth 1 -name 'Rechnung_5-*.pdf' -print | wc -l` und die letzten Dateien mit `ls -lt /Users/svendneumann/Downloads | head`.
- Wenn Chrome/Codex haengt: Verbindung abbrechen/zuruecksetzen, 30 Sekunden warten, neu verbinden, aktive BFS-Seite unten ablesen, sichtbare BFS-Nummern mit dem Downloadordner abgleichen und bei der ersten fehlenden Nummer weiterarbeiten. Nicht blind annehmen, dass der letzte Klick gespeichert wurde.
- Wenn das PDF-Fenster nur gross/anders geoeffnet ist: Schliesskreuz suchen und schliessen, danach mit der naechsten Rechnung fortfahren.
- Wenn kein `Rechnungsduplikat`/PDF vorhanden ist, ist die Rechnung vermutlich zu frisch; Nummer als offen/fehlend notieren und weiter.
- Wenn die Maus/Seite haengt: Browser per Tastenkombi/Refresh neu laden, im BFS-Menue wieder `Rechnungen > Rechnungen` oeffnen, nach `Re-Datum` sortieren, zur letzten bekannten Seite gehen, sichtbare Nummern gegen Downloads pruefen, dann weiter.

Letzter verifizierter Stand am 01.07.2026:
- Downloadordner enthaelt 1.927 echte `Rechnung_5-*.pdf`.
- Seite 81 wurde nach Wiederverbindung vervollstaendigt; danach Seiten 82 bis 206 langsam und stabil bearbeitet.
- Letzter bestaetigter Punkt: Seite 206 komplett, letzte sichtbare Downloads am 01.07.2026 um 17:04 u. a. `Rechnung_5-18504-72797022.pdf`, `Rechnung_5-18504-72789276.pdf`, `Rechnung_5-18504-72797033.pdf`; Re-Datum auf Seite 206 liegt weiter im Mai 2026. Beim naechsten Fortsetzen mit Seite 207 beginnen bzw. zuerst aktive Seite und sichtbare BFS-Nummern gegen Downloads pruefen.
- Klicktempo wurde bewusst gedrosselt und lief nahezu absturzfrei; genau so beibehalten: in 3-Seiten-Bloecken arbeiten, nach Rechnungsnummer-Klick ca. 1,25 Sekunden warten, nach PDF-Klick ca. 1,8 Sekunden warten, Download bis zu ca. 18 Sekunden auf die konkrete Datei pruefen, danach ca. 0,65 Sekunden warten, PDF-Fenster schliessen und nochmals ca. 0,75 Sekunden warten. Seitenwechsel mit ca. 1,7 Sekunden Pause. Keine schnelleren Klicks.
- Nach dem Start ab Seite 207 kam es zu einem Verbindungsabbruch. Der Downloadordner enthielt danach 1.967 echte `Rechnung_5-*.pdf`; letzte sichtbare Dateien am 01.07.2026 um 17:09 u. a. `Rechnung_5-18504-72789264.pdf` und `Rechnung_5-18504-72789279.pdf`. Beim Fortsetzen nicht blind Seite 207 wiederholen, sondern aktive BFS-Seite und sichtbare BFS-Nummern zuerst gegen den Downloadordner pruefen; wahrscheinlich wurden ca. 40 weitere Rechnungen nach Seite 206 gespeichert.
- Nach erneuter Verbindung war Seite 210 komplett vorhanden. Seite 211 wurde einzeln abgeschlossen, danach Seiten 212 bis 214 im langsamen Modus verifiziert. Downloadordner enthaelt danach 2.007 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 214 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72846209.pdf`, Re-Datum 08.05.2026. Beim Fortsetzen mit Seite 215 beginnen.
- Danach Seiten 215 bis 217 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.037 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 217 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72756247.pdf`, Re-Datum 07.05.2026. Beim Fortsetzen mit Seite 218 beginnen.
- Danach Seiten 218 bis 220 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.067 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 220 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72766530.pdf`, Re-Datum 07.05.2026. Beim Fortsetzen mit Seite 221 beginnen.
- Danach Seiten 221 bis 223 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.097 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 223 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72766599.pdf`, Re-Datum 07.05.2026. Beim Fortsetzen mit Seite 224 beginnen.
- Danach Seiten 224 bis 226 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.127 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 226 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72766546.pdf`, Re-Datum 07.05.2026. Beim Fortsetzen mit Seite 227 beginnen.
- Danach Seiten 227 bis 229 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.157 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 229 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72979378.pdf`, Re-Datum 07.05.2026. Beim Fortsetzen mit Seite 230 beginnen.
- Danach Seiten 230 bis 232 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.187 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 232 komplett, letzte verifizierte Rechnung `Rechnung_5-18790-72738843.pdf`, Re-Datum 06.05.2026. Beim Fortsetzen mit Seite 233 beginnen.
- Danach Seiten 233 bis 235 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.217 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 235 komplett, letzte verifizierte Rechnung `Rechnung_5-18504-72714769.pdf`, Re-Datum 05.05.2026. Beim Fortsetzen mit Seite 236 beginnen.
- Danach Seiten 236 bis 238 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.247 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 238 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72725516.pdf`, Re-Datum 05.05.2026. Beim Fortsetzen mit Seite 239 beginnen.
- Danach Seiten 239 bis 241 im langsamen Modus abgeschlossen und per separatem Ordnercheck bestaetigt. Downloadordner enthaelt danach 2.277 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 241 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72766541.pdf`, Re-Datum 05.05.2026. Beim Fortsetzen mit Seite 242 beginnen.
- Danach Seiten 242 bis 244 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.307 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 244 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72755156.pdf`, Re-Datum 05.05.2026. Beim Fortsetzen mit Seite 245 beginnen.
- Danach Seiten 245 bis 247 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.337 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 247 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72712621.pdf`, Re-Datum 02.05.2026. Beim Fortsetzen mit Seite 248 beginnen.
- Danach Seiten 248 bis 250 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.367 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 250 komplett, letzte verifizierte Rechnung `Rechnung_5-18790-72618953.pdf`, Re-Datum 30.04.2026. Beim Fortsetzen mit Seite 251 beginnen.
- Danach Seiten 251 bis 253 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.397 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 253 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72719948.pdf`, Re-Datum 30.04.2026. Beim Fortsetzen mit Seite 254 beginnen.
- Danach Seiten 254 bis 256 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.427 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 256 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72712603.pdf`, Re-Datum 29.04.2026. Beim Fortsetzen mit Seite 257 beginnen.
- Danach Seiten 257 bis 259 im langsamen Modus abgeschlossen und per separatem Ordnercheck bestaetigt. Downloadordner enthaelt danach 2.457 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 259 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72712615.pdf`, Re-Datum 28.04.2026. Beim Fortsetzen mit Seite 260 beginnen.
- Danach Seiten 260 bis 262 im langsamen Modus bearbeitet. Downloadordner enthaelt danach 2.486 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 262 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72506365.pdf`, Re-Datum 27.04.2026. Seite 261 hatte eine neue Ausnahme: `5-18790-72506385` (27.04.2026, kein Duplikat). Beim Fortsetzen mit Seite 263 beginnen.
- Danach Seiten 263 bis 265 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.516 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 265 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72534479.pdf`, Re-Datum 27.04.2026. Beim Fortsetzen mit Seite 266 beginnen.
- Danach Seiten 266 bis 268 im langsamen Modus bearbeitet. Downloadordner enthaelt danach 2.545 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 268 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72534515.pdf`, Re-Datum 24.04.2026. Seite 267 hatte eine neue Ausnahme: `5-19260-72534508` (25.04.2026, PDF-Fenster nicht verfuegbar). Beim Fortsetzen mit Seite 269 beginnen.
- Danach Seiten 269 bis 271 im langsamen Modus abgeschlossen und per separatem Ordnercheck bestaetigt. Downloadordner enthaelt danach 2.575 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 271 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72465132.pdf`, Re-Datum 24.04.2026. Beim Fortsetzen mit Seite 272 beginnen.
- Danach Seiten 272 bis 274 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.605 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 274 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72465067.pdf`, Re-Datum 24.04.2026. Beim Fortsetzen mit Seite 275 beginnen.
- Danach Seiten 275 bis 277 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.635 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 277 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72454299.pdf`, Re-Datum 23.04.2026. Beim Fortsetzen mit Seite 278 beginnen.
- Danach Seiten 278 bis 280 im langsamen Modus abgeschlossen und per separatem Ordnercheck bestaetigt. Downloadordner enthaelt danach 2.665 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 280 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72465087.pdf`, Re-Datum 23.04.2026. Beim Fortsetzen mit Seite 281 beginnen.
- Danach Seiten 281 bis 283 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.695 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 283 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72374135.pdf`, Re-Datum 21.04.2026. Beim Fortsetzen mit Seite 284 beginnen.
- Danach Seiten 284 bis 286 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.725 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 286 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72354246.pdf`, Re-Datum 20.04.2026. Beim Fortsetzen mit Seite 287 beginnen.
- Danach Seiten 287 bis 289 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.755 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 289 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72360607.pdf`, Re-Datum 20.04.2026. Beim Fortsetzen mit Seite 290 beginnen.
- Danach Seiten 290 bis 292 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.785 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 292 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72365756.pdf`, Re-Datum 17.04.2026. Beim Fortsetzen mit Seite 293 beginnen.
- Danach Seiten 293 bis 295 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.815 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 295 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72332352.pdf`, Re-Datum 17.04.2026. Beim Fortsetzen mit Seite 296 beginnen.
- Danach Seiten 296 bis 298 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.845 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 298 komplett, letzte verifizierte Rechnung `Rechnung_5-18504-72291355.pdf`, Re-Datum 16.04.2026. Beim Fortsetzen mit Seite 299 beginnen.
- Danach Seiten 299 bis 301 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.875 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 301 komplett, letzte verifizierte Rechnung `Rechnung_5-18504-72291340.pdf`, Re-Datum 16.04.2026. Beim Fortsetzen mit Seite 302 beginnen.
- Danach Seiten 302 bis 304 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.905 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 304 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72365748.pdf`, Re-Datum 16.04.2026. Beim Fortsetzen mit Seite 305 beginnen.
- Danach Seiten 305 bis 307 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.935 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 307 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72260072.pdf`, Re-Datum 15.04.2026. Beim Fortsetzen mit Seite 308 beginnen.
- Danach Seiten 308 bis 310 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.965 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 310 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72231240.pdf`, Re-Datum 14.04.2026. Beim Fortsetzen mit Seite 311 beginnen.
- Danach Seiten 311 bis 313 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 2.995 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 313 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72260068.pdf`, Re-Datum 14.04.2026. Beim Fortsetzen mit Seite 314 beginnen.
- Danach Seiten 314 bis 316 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 3.025 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 316 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72218964.pdf`, Re-Datum 13.04.2026. Beim Fortsetzen mit Seite 317 beginnen.
- Danach Seiten 317 bis 319 im langsamen Modus abgeschlossen und per separatem Ordnercheck bestaetigt. Downloadordner enthaelt danach 3.055 echte `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 319 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72206028.pdf`, Re-Datum 12.04.2026. Auf Wunsch des Users hier gestoppt. Beim Fortsetzen mit Seite 320 beginnen; zuerst aktive BFS-Seite und sichtbare BFS-Nummern gegen den Downloadordner pruefen.
- User hat die bisherigen Downloads nach dem Stopp verschoben; neuer Downloadordner-Lauf startet daher wieder bei 0 Dateien ab Seite 320. Seiten 320 bis 322 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 30 neue `Rechnung_5-*.pdf`; letzter bestaetigter Punkt im neuen Lauf: Seite 322 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72172716.pdf`, Re-Datum 09.04.2026. Beim Fortsetzen mit Seite 323 beginnen.
- Neuer Lauf: Seiten 323 bis 325 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 60 neue `Rechnung_5-*.pdf`; letzter bestaetigter Punkt im neuen Lauf: Seite 325 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72180787.pdf`, Re-Datum 09.04.2026. Beim Fortsetzen mit Seite 326 beginnen.
- Neuer Lauf: Seiten 326 bis 328 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 90 neue `Rechnung_5-*.pdf`; letzter bestaetigter Punkt im neuen Lauf: Seite 328 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-72180801.pdf`, Re-Datum 09.04.2026. Beim Fortsetzen mit Seite 329 beginnen.
- Neuer Lauf: Seiten 329 bis 331 im langsamen Modus abgeschlossen und per separatem Ordnercheck bestaetigt. Downloadordner enthaelt danach 120 neue `Rechnung_5-*.pdf`; letzter bestaetigter Punkt im neuen Lauf: Seite 331 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72126751.pdf`, Re-Datum 07.04.2026. Beim Fortsetzen mit Seite 332 beginnen.
- Neuer Lauf: Seiten 332 bis 334 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 150 neue `Rechnung_5-*.pdf`; letzter bestaetigter Punkt im neuen Lauf: Seite 334 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-72130578.pdf`, Re-Datum 07.04.2026. Beim Fortsetzen mit Seite 335 beginnen.
- Neuer Lauf: Seiten 335 bis 337 im langsamen Modus abgeschlossen. Downloadordner enthaelt danach 180 neue `Rechnung_5-*.pdf`; letzter bestaetigter Punkt im neuen Lauf: Seite 337 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-72039319.pdf`, Re-Datum 02.04.2026. Beim Fortsetzen mit Seite 338 beginnen.
- Neuer Lauf am 02.07.2026 fortgesetzt: Nach Wiederherstellung/Pruefung stand Chrome auf Seite 396; Seite 396 war komplett vorhanden. Danach Seiten 397 bis 561 im stabilen 3-Seiten-Modus abgeschlossen und mehrfach gegen den Downloadordner geprueft. Downloadordner enthielt danach 2.416 neue `Rechnung_5-*.pdf`; letzter bestaetigter Punkt: Seite 561 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-70995031.pdf`, Re-Datum 16.02.2026. Beim Fortsetzen mit Seite 562 beginnen; zuerst aktive BFS-Seite und sichtbare BFS-Nummern gegen den Downloadordner pruefen. Hinweis: Seite 560 enthielt drei Rechnungen, die bereits im Ordner vorhanden waren; die Seite war am Ende trotzdem vollstaendig. Danach wurde versucht, neu zu verbinden und Seite 562 zu erreichen: Filter fiel auf `letzte4Wochen` zurueck, wurde wieder auf `seitBeginn` gesetzt und Re-Datum war absteigend sortiert. Der lange Seitensprung liess die Chrome-Erweiterungsverbindung mehrfach haengen; danach wurden keine weiteren Downloads bestaetigt. Naechster sicherer Start bleibt Seite 562 nach erneuter manueller/technischer Chrome-Stabilisierung.
- Neuer Lauf am 02.07.2026 nach erneutem User-Start: Downloads waren vorher wieder verschoben/leerer Downloadordner. Chrome stand auf Seite 435, Filter `seitBeginn`, Sortierung `Re-Datum` absteigend. Kontrolliert in kurzen Seitenspruengen zu Seite 562 gewechselt und dort weitergemacht. Seiten 562 bis 571 wurden im langsamen Modus vollstaendig geladen; externe Ordnerpruefung danach: exakt 100 neue `Rechnung_5-*.pdf` im Downloadordner. Letzter bestaetigter Punkt: Seite 571 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-70907653.pdf`, Re-Datum 13.02.2026. Beim Fortsetzen mit Seite 572 beginnen; Filter und Sortierung erneut pruefen. Neue Prozesskorrektur: Mahn-/RA-Detailzeilen koennen nach Klicks aufgeklappt bleiben und duerfen nicht als eigene Rechnungszeilen gezaehlt werden; nur echte Tabellenzeilen mit sichtbarer BFS-Nr.-Zelle und normaler Rechnungszeilenstruktur zaehlen.
- Danach im selben Lauf weitergemacht: Seiten 572 bis 583 abgeschlossen und extern geprueft. Downloadordner enthaelt danach 203 neue `Rechnung_5-*.pdf`. Seite 575 enthielt durch gleiche Datums-/Sortiergruppe nur bereits gespeicherte Rechnungen und erzeugte daher 0 neue Dateien; Seite 576 enthielt zunaechst ebenfalls mehrere bereits gespeicherte Zeilen, danach wurden die drei echten fehlenden Dateien nachgezogen. Eine Rechnung (`5-19260-70949035`) brauchte einen zweiten kontrollierten PDF-Klick, wurde danach aber verifiziert gespeichert. Letzter bestaetigter Punkt: Seite 583 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-70949030.pdf`, Re-Datum 11.02.2026. Beim Fortsetzen mit Seite 584 beginnen; vor dem Weiterarbeiten wieder aktive Seite, Filter `seitBeginn`, Sortierung `Re-Datum` absteigend und Downloadordner pruefen.
- Danach im selben Lauf weitergemacht: Seiten 584 bis 593 abgeschlossen und extern geprueft. Downloadordner enthaelt danach 303 neue `Rechnung_5-*.pdf`. Letzter bestaetigter Punkt: Seite 593 komplett, letzte verifizierte Rechnung `Rechnung_5-19092-70768553.pdf`, Re-Datum 06.02.2026. Beim Fortsetzen mit Seite 594 beginnen; vor dem Weiterarbeiten wieder aktive Seite, Filter `seitBeginn`, Sortierung `Re-Datum` absteigend und Downloadordner pruefen.
- Danach im selben Lauf weitergemacht: Seiten 594 bis 603 abgeschlossen und extern geprueft. Downloadordner enthaelt danach 403 neue `Rechnung_5-*.pdf`. Letzter bestaetigter Punkt: Seite 603 komplett, letzte verifizierte Rechnung `Rechnung_5-18504-70762130.pdf`, Re-Datum 05.02.2026. Beim Fortsetzen mit Seite 604 beginnen; vor dem Weiterarbeiten wieder aktive Seite, Filter `seitBeginn`, Sortierung `Re-Datum` absteigend und Downloadordner pruefen.
- Danach im selben Lauf weitergemacht: Seiten 604 bis 614 abgeschlossen und extern geprueft. Ein 5-Seiten-Werkzeugblock lief trotz Zeitfenster im Hintergrund weiter; danach wurde die aktive Seite geprueft und sauber ab Seite 609 fortgesetzt. Downloadordner enthaelt danach 513 neue `Rechnung_5-*.pdf`. Letzter bestaetigter Punkt: Seite 614 komplett, letzte verifizierte Rechnung `Rechnung_5-19260-70832143.pdf`, Re-Datum 02.02.2026. Beim Fortsetzen mit Seite 615 beginnen; vor dem Weiterarbeiten wieder aktive Seite, Filter `seitBeginn`, Sortierung `Re-Datum` absteigend und Downloadordner pruefen.
- Danach im selben Lauf weitergemacht: Seiten 615 bis 626 bearbeitet und extern geprueft. Seite 623 hatte eine kurz verzoegerte PDF-Anzeige bei `5-19092-70564834`; nach erneutem Kontrollklick wurde die Datei verifiziert gespeichert. Seite 626 enthielt nur bereits gespeicherte Zeilen aus der gleichen Datums-/Sortiergruppe und brachte 0 neue Dateien. Downloadordner enthaelt danach 623 neue `Rechnung_5-*.pdf`. Letzter bestaetigter Punkt: Seite 626 erledigt, letzte neu verifizierte Datei davor `Rechnung_5-19092-70542465.pdf`, Re-Datum 28.01.2026. Beim Fortsetzen mit Seite 627 beginnen; vor dem Weiterarbeiten wieder aktive Seite, Filter `seitBeginn`, Sortierung `Re-Datum` absteigend und Downloadordner pruefen.
- Danach im selben Lauf weitergemacht: Seiten 627 bis 640 bearbeitet und extern geprueft. Seiten 627 und 628 enthielten nur bereits gespeicherte Zeilen aus gleicher Datums-/Sortiergruppe. Auf Seite 634 hatte `5-19260-70519289` kein PDF-Symbol/kein Duplikat und wurde als offene Ausnahme uebersprungen; restliche Zeilen der Seite wurden geladen. Downloadordner enthaelt danach 740 neue `Rechnung_5-*.pdf`. Letzter bestaetigter Punkt: Seite 640 komplett, letzte verifizierte Rechnung `Rechnung_5-19804-70529427.pdf`, Re-Datum 27.01.2026. Beim Fortsetzen mit Seite 641 beginnen; vor dem Weiterarbeiten wieder aktive Seite, Filter `seitBeginn`, Sortierung `Re-Datum` absteigend und Downloadordner pruefen.
- Bekannte offene/nicht ladbare Ausnahmen aus diesem Lauf: `5-19092-73758775` (25.06.2026, kein Duplikat), `5-19260-73896640` (25.06.2026, PDF-Fenster nicht verfuegbar), `5-19092-73638154` (19.06.2026, kein Duplikat), `5-19092-73449292` (11.06.2026, PDF-Fenster nicht verfuegbar), `5-19804-73463376` (11.06.2026, PDF-Fenster nicht verfuegbar), `5-19804-73463411` und `5-19804-73463370` (11.06.2026, kein Duplikat), `5-19804-72962724` (18.05.2026, kein Duplikat), `5-18790-72506385` (27.04.2026, kein Duplikat), `5-19260-72534508` (25.04.2026, PDF-Fenster nicht verfuegbar).

## Sinn der App

Die App ist das zentrale Steuerungsboard fuer die Orisus-Gruppe rund um BFS-Factoring und Abrechnungsqualitaet.

Sie soll nicht nur Daten anzeigen, sondern fachlich beantworten:
- Was wurde je Standort und Gruppe eingereicht?
- Wie entwickeln sich Eingang, Auszahlung, BFS-Kosten, Gebuehrenquote, Rueckbelastungen und Stornos?
- Wo entstehen offene Klaerfaelle oder echte operative Risiken?
- Welche Patienten/Standorte sind auffaellig?
- Welche Stornos/Rueckgaben wurden spaeter wieder reingeholt oder manuell als bezahlt geklaert?
- Was muss eine Standortleitung konkret bearbeiten?
- Welche Reports koennen direkt als PDF/CSV an Standortleitungen gehen?

Das Zielbild ist: "Das ist die Lage. Das ist auffaellig. Hier musst du handeln." Nicht: "Hier sind alle Tabellen."

## Produktstruktur / Zielbild

Die App soll fachlich in drei Ebenen denken:

1. Management-Cockpit
   - Erste Sicht nach Login.
   - Fokus auf Lage, Entwicklung und Handlung.
   - KPI-Kacheln, Trends, Vorjahresvergleich, Standortvergleich, Ampeln und klare Hinweise.
   - Tabellen nur sehr nachgelagert.

2. Analyse & Benchmarking
   - Erklaert, warum etwas auffaellig ist.
   - Standortvergleich, Standortdetails, Forderungsqualitaet, Patientenqualitaet.
   - Mehr Charts, Rankings, Entwicklungslinien, Benchmark-Karten und Quoten.

3. Operative Fallarbeit
   - Hier gehoeren Detailtabellen hin.
   - Klaerfaelle, Matching/Neueinreichungen, Rueckbelastungen, Wiedervorlagen.
   - Tabellen muessen kompakt und intern scrollbar sein, damit Seiten nicht endlos lang werden.

Navigationslogik aktuell:
- Oberreiter `BFS-Abrechnungen`
  - Management
  - Analyse & Benchmarking
  - Operative Fallarbeit mit gemeinsamer `Pruefliste`
  - Reports
  - Import-Center Abrechnung
- Oberreiter `BFS-Rechnungsanalyse`
  - `Leistungsuebersicht`
  - `Katalogpruefung`
  - `Benchmarking`
  - `Faktor-Trend`
  - `Patientenprofil`
  - `Potenzialanalyse`
  - `Standortvergleich`
  - `Import-Center Rechnungen`
- Oberreiter `Abrechnungsqualitaet`
  - `Qualitaetscockpit`
  - `Leistungsketten`
  - `Praxis-Feedback`
- Admin Bereich

Wichtig: Der fruehere Reiter `Import & Pruefung` wurde fachlich geteilt:
- `Import-Center Abrechnung`: bestehender Monats-/Abrechnungsimport plus BFS-Rechnungsstatus-/Saldo-Listen.
- `Import-Center Rechnungen`: Import einzelner BFS-Patientenrechnungen bzw. Ordner mit Rechnungs-PDFs.

Wichtige aktuelle Sichten:
- `Zusammenfassung`
  - Frei gestalteter KPI-/Chart-/Benchmark-Bereich fuer zentrale Steuerungskennzahlen.
  - Eigene KPI-Zeitraum- und Standortauswahl.
  - Eigene Diagramm-Zeitraum- und Standortauswahl.
  - Diagramm-Zeitraum enthaelt `ab Standortstart`; bei `Alle Standorte` wird je Standort ab eigenem Start gerechnet.
  - Eigene Benchmark-Zeitauswahl fuer die Tabelle "Standorte nach Kennzahlen vergleichen".
  - PDF-Export des gesamten Tabs im Querformat, seitenbreit und mehrseitig paginiert. Nicht mehr auf eine einzige Seite zusammenquetschen.
  - Zusaetzlicher `Standort-Export`: Zielstandort mit Klarnamen/Klarzahlen, andere Standorte anonymisiert als Vergleichsstandorte und in der Benchmark-Tabelle nur relativ als Index zum Zielstandort.
- `Management Cockpit`
  - Managementsicht mit Zeitraum- und Standortfilter, KPI-Kacheln, Kombi-Charts, Standortbenchmark und Signalkarten.
  - Obere Standort-Tabreihen wurden entfernt; dafuer sind Filter zustaendig.
- `Schnellantworten`
  - Schnellantwort-Kacheln stehen nur noch hier, nicht doppelt im Cockpit.
- `Standorte`
  - Standort-Benchmark mit KPI-Dreierreihe, vier Erklaerkacheln, zwei Umsatzdiagrammen und Standortvergleich.
  - `Standorte im Vergleich` hat einen eigenen Zeitraumfilter.
- `Standortdetails`
  - Ehemals `Forderungen & Geldfluss`.
- `Forderungen und Geldfluss`
  - Neuer/ausgelagerter Tab fuer den frueheren Geldfluss-Teil aus Standortdetails.
  - Standortleiste oben wurde entfernt; Steuerung erfolgt ueber Filter.
- `Forderungsqualitaet`
  - Entschlackt: mehrere operative Tabellen/Charts entfernt.
  - KPI-Kacheln mit eigener Zeitraum-/Standortsteuerung.
- `Patientenklassifizierung`
  - Neuer Tab fuer A/B/C/D-Logik, Patientenqualitaet je Standort, Wiederholer, Risikoentwicklung je Patient und Historie pro Patient.
  - Standortleiste entfernt; klassische Zeitraum- und Standortfilter.
  - Charts `Patientenklassen` und `Ohne Ausfallschutz` als Saeulendiagramme im App-Layout.
  - Charts `Risikoentwicklung` und `Patientenqualitaet` wurden entfernt.
- `Operative Fallarbeit`
  - Fuehrende Sicht ist eine gemeinsame `Pruefliste offene Faelle`.
  - Die Praxis entscheidet je Zeile `Bezahlt / geklaert`, `Neu eingereicht` oder `Endgueltig storniert`.
  - Die offene Pruefsumme reduziert sich durch bezahlt/geklaert oder neu eingereicht; endgueltig stornierte Faelle laufen separat in `Endgueltig verloren`.
  - PDF-/Druckexport und CSV sind als Praxisausdruck gedacht und enthalten am Ende `Kommentar` sowie `Wenn storniert: in der Praxissoftware ausgebucht?`.
- `Prioritaeten heute`
  - Wurde komplett entfernt, inklusive Querverlinkungen.
- `BFS-Rechnungsanalyse > Leistungsuebersicht`
  - Klassische Tabelle fuer Leistungspositionen mit Faktor, Haeufigkeit, Gruppenschnitt, Delta, Min/Max und Standorten.
  - Hat Freitextsuche und Sortierung wie Excel fuer relevante Spalten.
  - Tablet-/Mobile-Kompatibilitaet ist wichtig: Kopftexte duerfen nicht rechts auslaufen; Tabellen intern horizontal scrollbar.
- `BFS-Rechnungsanalyse > Katalogpruefung`
  - Liegt im Bereich `Import & Pruefung`, nicht mehr unter den Auswertungen.
  - Zweck: Katalog-/Normalisierungscheck je Leistungszeile, ohne Originalimport zu veraendern.
  - Spaltenlogik: `Original aus Rechnung`, `Verwendet als`, `Katalogart`, `Katalogtext`, `Hinweis`, plus Standort/Rechnung/Faktor/Aktion.
  - Automatisch korrigierte und OK-Positionen brauchen keine Aktion; nur echte Review-Faelle.
  - Wenn Position fachlich plausibel und eindeutig ist, soll sie automatisch korrekt laufen, nicht in `Zu pruefen`.
- `BFS-Rechnungsanalyse > Benchmarking`
  - Klassisches Faktor-Benchmarking pro Standort und Gruppe.
  - Management-PDF/Report soll keine absoluten Mengen/Positionszahlen nennen, wenn daraus Rueckschluesse auf Praxisgroesse entstehen koennen.
  - Neue Regel: nur Leistungen, die mindestens 3 Standorte verwenden, duerfen in Benchmark/KPIs/Potenzial einlaufen.
- `BFS-Rechnungsanalyse > Faktor-Trend`
  - Zeigt Faktorentwicklung ueber Jahre/Monate je Leistung/Praxis.
  - Ziel: erkennen, ob Praxen bei Leistungen im Zeitverlauf hoeher/niedriger fakturieren.
- `BFS-Rechnungsanalyse > Patientenprofil`
  - Zeigt Patientenwert, Fallwert, niedriges Faktorprofil und Labor-/Aufwandsanteil aus echten Einzelrechnungen.
  - Kacheln und Tabellen sollen den Standort des Patienten sichtbar anzeigen.

## Wichtigste fachliche Weiterentwicklung

Der aktuelle Stand kann bereits importieren, auswerten, Klaerfaelle anzeigen und Standortdaten vergleichen. Der naechste grosse Produktschritt sollte aber klarer in Richtung Management-Cockpit gehen.

Was im ersten Blick staerker sichtbar werden soll:
- Eingereicht YTD 2026 vs. Vorjahr YTD
- Eingereicht aktuelles Quartal vs. Vorquartal und Vorjahresquartal
- Monatsentwicklung je Standort und Gruppe
- Gebuehrenquote im Zeitverlauf
- BFS-Kosten absolut und relativ
- Rueckbelastungs-/Stornoquote im Zeitverlauf
- Anteil ohne Ausfallschutz
- Anteil der Ohne-Ausfallschutz-Faelle, die tatsaechlich nicht zahlen oder operativ auffaellig werden
- offene Klaerfaelle nach Alter
- Top-Standorte nach Risiko, Kosten, Wachstum, Abweichung
- Patientenqualitaet und Wiederholer

Empfohlener Aufbau jeder Management-/Analyse-Seite:
1. Oben: Standort, Zeitraum, Datenstatus
2. Dann: wichtigste KPI-Kacheln mit Trend/Vorjahr
3. Dann: 1-2 aussagekraeftige Diagramme
4. Dann: "Was ist auffaellig?" und "Was muss geprueft werden?"
5. Erst unten: Detailtabelle oder Drilldown

## Aktueller Live-Stand

Die App ist live auf Vercel und mit Supabase verbunden.

Supabase:
- Project ref: `dozcaktodvogbkiomcqo`
- URL: `https://dozcaktodvogbkiomcqo.supabase.co`
- Auth laeuft ueber Supabase Auth.
- Super-Admin: `svend.neumann@orisus.de`
- Wichtige Tabellen: `bfs_import_batches`, `bfs_documents`, `bfs_abrechnungen`, `bfs_forderungen`, `bfs_bewegungen`, `bfs_cases`, `audit_log`, `bfs_invoice_import_batches`, `bfs_patient_invoices`, `bfs_patient_invoice_lines`, `profiles`, `standorte`
- Katalogmappings fuer Einzelrechnungen werden ueber `app/api/invoices/catalog-mappings/route.ts` im `audit_log` gespeichert/gelesen.
- Security-Stand 30.06.2026: Live-Projekt gegen externe Angriffsrisiken geprueft. Alle fachlichen Public-Tabellen haben RLS aktiv; Bucket `bfs-documents` ist privat. Migration `010_security_hardening.sql` setzt feste Function-Search-Paths, entzieht `handle_new_auth_user()` die direkte RPC-Ausfuehrbarkeit fuer `anon`/`authenticated` und korrigiert die `standorte`-Select-Policy. Next.js liefert zusaetzliche Security Header. Offen in Supabase Auth-Konsole: leaked-password protection aktivieren.

Vercel:
- Projekt: `bfs-mandatenuebersicht`
- Live-Alias: `https://bfs-mandatenuebersicht.vercel.app`
- Nicht verwechseln mit separatem Projekt `orisus-cfo-dashboard`.
- Deploys laufen aktuell auch direkt ueber `pnpm dlx vercel --prod --scope orisus`; Live-Alias nach erfolgreichem Deploy pruefen.

Git:
- Immer auf `origin/main` pushen, wenn Aenderungen abgeschlossen sind.
- GitHub-Verbindung wurde repariert und funktionierte zuletzt.
- Arbeitsbaum kann mehrere parallele, noch nicht committete Aenderungen enthalten. Nichts zuruecksetzen, was nicht eindeutig zur aktuellen Aufgabe gehoert.

## Daten- und Live-Grundsatz

Es duerfen nirgends Demo- oder Beispielwerte angezeigt werden.

Regel:
- Wenn keine Live-/Importdaten vorhanden sind: `0`, `-` oder leerer Zustand mit Hinweis.
- Standort-Stammdaten duerfen fuer Navigation, Mapping und Go-live-Logik existieren.
- Kennzahlen, Risiken, Reports und Falllisten duerfen nicht durch Demo-Fallbacks gefuellt werden.

Standorte werden immer chronologisch nach Vertragsstart angezeigt:
- Kirchberg: 01.07.2024
- Essen: 01.01.2025
- Kehl: 01.04.2025
- Ulmet: 01.07.2025
- Huettenberg: 01.01.2026
- Kassel: 01.07.2026

Standard-Zeitraum:
- Alle waehlbaren Zeitraumfilter sollen standardmaessig auf YTD 2026 stehen.
- In der UI heisst das aktuell `2026 gesamt`.

Zahlenformat:
- Zahlen ohne Nachkommastellen.
- Prozente mit einer Nachkommastelle.
- Ausnahme: Gebuehrenquote immer mit zwei Nachkommastellen.

## Performance / Cache / Ladeverhalten

Aktueller Grundsatz:
- Die App soll nicht bei jeder Navigation hart alle grossen Datenstaende neu laden.
- Importdaten, Einzelrechnungen, Saldo-/Statusdaten und manuelle Klaerungen werden browserseitig gecacht.
- Ein harter Server-Refresh passiert beim ersten notwendigen Laden, nach echten Datenveraenderungen oder wenn der Nutzer `Neu laden` klickt.
- Uploads/Import-Bestaetigungen muessen den Cache aktualisieren bzw. invalidieren, damit neue Daten direkt sichtbar sind.
- Wenn Login/Logout in einer Reload-Schleife haengt: Auth-/Session-Flow, Cache-Flags und Redirects pruefen. Nutzer beobachtete: Abmelden kann Startbildschirm in Dauerladezustand bringen, bis Browser-Laden manuell gestoppt wird.

## UI / Tablet / Export

Tablet-/Responsive-Regeln:
- Der gesamte Bereich `BFS-Rechnungsanalyse` muss tablet-kompatibel bleiben.
- Kopftexte, Filterzeilen und KPI-Karten duerfen nicht nach rechts aus dem Viewport laufen.
- Karten-/Grid-Layouts muessen auf Tablet umbrechen statt immer breiter zu werden.
- Tabellen duerfen horizontal scrollen, aber der Seitencontainer selbst soll nicht unkontrolliert nach rechts wachsen.
- Besonders kritisch/geprueft bzw. zu beobachten:
  - `Leistungsuebersicht`
  - `Katalogpruefung`
  - `Benchmarking`
  - `Management Cockpit`
  - Report-/Exportseiten

Export-Regeln:
- PDF-/Druckexport soll in der gesamten App nach Abbrechen der Browser-Druckvorschau nicht als leeres Zwischenfenster ohne Navigation stehen bleiben.
- Exportfenster brauchen eine eigene Toolbar/Schliessen-Moeglichkeit.
- In externen Praxis-/Managementreports fuer Benchmarking keine absoluten Mengen/Positionszahlen anzeigen, wenn daraus Rueckschluesse auf Praxisgroesse entstehen.
- Benchmark-Management-PDF: Fokus auf Potenzial, Relativindex, Faktorvergleich und Empfehlung; Kacheln wie `Lesart`, `Praxisbild`, `Zielbild`, `Management` wurden vom Nutzer als entbehrlich markiert.
- Potenzialanalyse-PDF soll die KPI-Kacheln mitdrucken.
- Wo der Nutzer nur PDF braucht, CSV-Export entfernen/ausblenden.

## Import / Verarbeitung

Architektur:
- Frontend: `components/monitor-app.tsx`
- Server-Endpoint: `app/api/imports/parse/route.ts`
- Parser: `lib/bfs-parser.ts`, `lib/demo-import.ts`
- Storage: privater Supabase Bucket `bfs-documents`

Import-Regeln:
- Nur PDFs werden verarbeitet.
- Nicht-PDFs werden ausgesortiert.
- Ordner inkl. Unterordner werden unterstuetzt.
- Grosse Ordner werden in Chunks verarbeitet.
- Dubletten werden ueber Hash und fachliche Identitaet erkannt.
- Fachliche Identitaet: Mandant-Nr. + Abrechnungs-Nr. + Standort.
- Alte fehlerhafte PDF-Imports duerfen erneuten Upload nicht blockieren.
- Upload-Reset muss serverseitige Importdaten und Zwischenstaende sauber entfernen bzw. archivieren.

Bekannte Altfehler wurden bereits behoben:
- PDF.js `DOMMatrix is not defined`
- PDF.js Fake-Worker-Fehler auf Vercel
- alte kaputte PDF-Importe als falsche Dubletten
- lokale Browserdaten als irrefuehrende Wahrheit nach Reset

Wenn grosse Uploads wieder haken:
- Network-Response von `/api/imports/parse` pruefen.
- Klaeren, ob einzelnes PDF, Vercel Timeout oder Datenbank-Limit.
- Langfristig waere fuer sehr grosse Ordner eine echte Job-/Queue-Architektur sauberer.

## BFS-Rechnungsanalyse / Rechnungs-PDFs

Zweiter Fachbereich: `BFS-Rechnungsanalyse`. Er bleibt fachlich getrennt von BFS-Abrechnungen, Storno-/Rueckgabe-Logik und Saldo-Statuslisten.

Ziel:
- BFS-Patientenrechnungen aus dem BFS-Portal einlesen.
- Je Standort auswerten, welche Leistungsnummern wie oft abgerechnet werden.
- Faktoren, Betraege, Laboranteile und Leistungsbeschreibungen je Standort vergleichen.
- Standorte challengen: z. B. "Ulmet rechnet Position X auffaellig niedrig/selten ab im Vergleich zu Standort Y".
- Eigenlabor und Fremdlabor erkennen und getrennt auswerten.
- Spaeter Matching/Neueinreichungen fachlich verbessern, weil Rechnungen Behandlungszeitraum, Positionen, Faktoren und Rechnungsnummern enthalten.

Aktuelle Tabs:
- `Leistungsuebersicht`: pro Leistung eigener Faktor bzw. Standortfaktor vs. Gruppenschnitt ohne eigenen Standort, sortier-/filterbare Tabelle, intern scrollbar.
- `Katalogpruefung`: Abgleich/Normalisierung von Leistungszeilen gegen lokalen GOZ/GOAe/BEMA-/Praxis-Katalog und gespeicherte Mappings. Liegt unter `Import & Pruefung`.
- `Benchmarking`: klassisches Faktor-Benchmarking je Standort/Praxis, anonymisierter Gruppenbenchmark, Management-PDF.
- `Faktor-Trend`: Faktorentwicklung je Leistung ueber Jahre/Monate.
- `Patientenprofil`: Patientenwert, Fallwert, Faktorprofil, Labor-/Aufwandsanteil je Patient inkl. Standort.
- `Potenzialanalyse`: Euro-Potenzial, Top-Hebel, Monats-/Jahreshochrechnung aus echten Positionsbetraegen gegen Gruppenschnitt ohne eigene Praxis.
- `Standortvergleich`: Fokus auf Durchschnittsfaktoren, Faktorprofil, Potenzial und Standortvergleich. Absolute Umsatz-/Mengenkennzahlen sind fuer echte Benchmarkaussagen nur eingeschraenkt geeignet, weil nicht dauerhaft jeder Monat vollstaendig hochgeladen wird.
- `Import-Center Rechnungen`: Daten rein, speichern, pruefen und bei Bedarf `Upload zuruecksetzen`.

Technik:
- `lib/invoice-parser.ts`
- `app/api/invoices/parse/route.ts`
- Import unter `BFS-Rechnungsanalyse > Import-Center Rechnungen`
- Upload unterstuetzt mehrere PDFs sowie Ordner inkl. Unterordner.
- Bestaetigte Rechnungen werden ueber `/api/invoices/parse` in `bfs_invoice_import_batches`, `bfs_patient_invoices` und `bfs_patient_invoice_lines` gespeichert und per `GET` wieder geladen.
- `Upload zuruecksetzen` ruft den serverseitigen DELETE auf und entfernt gespeicherte Rechnungen, Positionen und Import-Batches dauerhaft.
- Direkte manuelle Supabase-Imports laufen ueber `scripts/repair-invoice-import.ts`. Das Skript upsertet nach fachlicher Identitaet/Hash, erzeugt keine Doppelzaehlung und meldet `inserted`/`updated`.
- Parser liest u. a.:
  - BFS-Nr.
  - Mandant-Nr.
  - Standortzuordnung
  - Rechnungsnummer
  - Rechnungsdatum
  - Patient
  - Behandlungszeitraum / relevante Datumsfelder, soweit im PDF vorhanden
  - Gesamtbetrag/offener Betrag/Zuschuss
  - Honorar BEMA/GOZ
  - Eigenlabor
  - Fremdlabor netto/brutto
  - Material/Auslagen
  - Leistungszeilen mit Leistungsnummer/Code, Zahn-/Regionangabe, zusammengefasster Leistungsbeschreibung, Faktor, Menge, Betrag, Kategorie

Fachliche Regeln fuer Leistungszeilen:
- Die grundsaetzliche Importlogik ist aktuell produktiv getestet und darf nicht leichtfertig umgebaut werden. Neue Verbesserungen sollen nachgelagert in Katalog-/Auswertungslogik erfolgen, wenn das moeglich ist.
- Zahn-/Regionangaben wie `36`, `25`, `37`, `OK`, `UK` duerfen nicht als Leistungsnummer gruppiert werden, wenn danach eine echte GOZ-/GOAe-/Analog-Leistungsnummer folgt.
- Beispiel: `36 modv 2180 ...` wird als Region `36 modv` und Leistungsnr. `2180` gelesen.
- Die Tabelle zeigt deshalb `Leistungsnr.` statt nur `Nr.`.
- BEMA-/Festzuschuss-Rechnungen ohne GOZ-Faktor werden als Beleg erkannt, aber nicht in die GOZ-Faktor-Potenzialanalyse eingerechnet.
- Kassenleistungsfuellungen wie `13A0`, `13B0`, `13C0`, `13D0` bleiben drin, weil sie mehrere Standorte betreffen und vergleichbar sind; fehlerhafte Zahnnummern (`15`, `16`, `17`, `26`, `27`, `35`, `37` etc.) muessen auf die passende Kassenleistungsposition normalisiert werden, wenn Text und Kennzahl eindeutig passen.
- `Ä0001`, `A0001`, `Ä1` und vergleichbare Schreibweisen muessen zusammengefuehrt werden.
- Null-Codes (`000`, `00`, `0`) duerfen nicht als Leistung in Benchmark/Katalogpruefung laufen.
- Material, Auslagen, Medikamente, Implantatteile, Naehte, Labor-/Eigenlaborzeilen und reine Freitext-/OCR-Reste duerfen nicht als Leistung laufen.
- Katalogpruefung: `OK` und `automatisch korrigiert` brauchen keine Nutzeraktion. `Zu pruefen` nur fuer nicht eindeutige, nicht automatisch aufloesbare Faelle.
- Katalogpruefung ist kein Import-Blocker und veraendert Originaldaten nicht; sie definiert nur, wie Auswertungen eine Leistung fuehren/normalisieren/ignorieren.
- Benchmark/Potenzial ab 02.07.2026: Nur Leistungsnummern mit Faktor, die in mindestens 3 Standorten vorkommen, sind benchmarkfaehig. Leistungen mit nur 1 oder 2 Standorten werden fuer Benchmarking und Potenzialanalyse ausgeschlossen.
- Potenzialanalyse berechnet weiterhin nur dann Potenzial, wenn die ausgewaehlte Praxis bei derselben Leistung unter dem Gruppenschnitt ohne diese Praxis liegt.
- Beispiel `Rechnung_5-18504-73794150.pdf`: BEMA/Festzuschuss + Eigenlabor, keine GOZ-Faktorposition; Importstatus OK, Vorschau `BEMA + Labor`.
- Gegencheck mit 66 PDFs aus `/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS`: 0 Parser-Statusfehler und 0 auffaellige Faelle, in denen eine zweistellige Zahn-/Regionnummer vor einer echten Leistungsnummer als Leistungscode gruppiert wurde.

Aktuelle direkte Einzelrechnungsimporte:
- 02.07.2026 letzter grosser Batch aus `/Users/svendneumann/Downloads/1. Ulmet_01`, `/Users/svendneumann/Downloads/Essen_01`, `/Users/svendneumann/Downloads/Hüttenberg_01`, `/Users/svendneumann/Downloads/Kehl_01`, `/Users/svendneumann/Downloads/Kirchberg_01`.
- Batch-ID `e852528d-6f4b-434f-b636-f4deda56c951`.
- Ergebnis: 2.203 PDFs gelesen, 2.185 eindeutige Rechnungen in Supabase, 2.136 inserted, 49 updated, 18 lokale Dubletten, 18 leer/nicht informativ, 0 Fehler.
- Supabase-Nachkontrolle: 11.387 Positionszeilen, 7.159 Leistungszeilen, 0 bekannte harte Fehlerbilder (`000`, Text als NR, Zahnnummer-Fuellung als Leistung, Material als Leistung, Faktor > 15).
- 130 Rechnungen im Status `Zu pruefen`, weil keine abrechenbaren Leistungspositionen mit Faktor erkannt wurden; diese erscheinen nicht zwingend in der Katalogpruef-Tabelle und sollen die Auswertungen nicht beeinflussen.

Fachliche Zuordnung:
- Standorte werden ueber Mandant-Nr. zugeordnet.
- Bekannte Mandanten:
  - Kirchberg: `18504`, `21988`
  - Essen: `18790`, `19220`, `19221`, `22341`
  - Kehl: `19092`, `20411`
  - Ulmet: `19260`, `19668`, `19669`
  - Huettenberg: `19804`, `22674`
  - Kassel: `20309`, `20902`
- Die im Chat getesteten Rechnungen:
  - `5-19260-*` wurden Ulmet zugeordnet.
  - `5-18790-*` wurde Essen zugeordnet.
  - `5-18504-*` wurde Kirchberg zugeordnet.

## BFS-Portal-Rechnungsdownload per Chrome

Stand 01.07.2026:
- Der manuelle BFS-Portal-Download wurde ueber den angemeldeten Chrome-Browser automatisiert.
- Sortierung in der BFS-Rechnungsuebersicht: Spalte `Re-Datum` auf alt nach neu.
- Download-Ziel ist der normale macOS-Downloadordner `/Users/svendneumann/Downloads`.
- Abgeschlossen ist der Zeitraum bis einschliesslich `31.07.2025`.
- Letzte tatsaechlich gezogene Rechnung im abgeschlossenen Lauf:
  - Seite: `429`
  - BFS-Nr.: `5-19092-66852710`
  - Re-Datum: `31.07.2025`
- Danach wurde auf derselben Seite die erste Rechnung nach der Zielgrenze erkannt:
  - BFS-Nr.: `5-19260-66994788`
  - Re-Datum: `01.08.2025`
- Wenn spaeter weitergemacht wird, kann ab Seite `429` bzw. ab `01.08.2025` fortgesetzt werden. Vorhandene Downloads muessen ueber BFS-Nr. im Dateinamen uebersprungen werden.
- Naechster geplanter Lauf: Rechnungen bis einschliesslich `30.06.2026` ergaenzen.
- Dafuer ist voraussichtlich der bessere Weg: vorne/neuestens in der BFS-Rechnungsuebersicht starten und sich rueckwaerts vom `30.06.2026` bis `01.08.2025` durcharbeiten, statt von Seite `429` vorwaerts zu laufen.
- Stop fuer diesen naechsten Rueckwaertslauf: Sobald die Grenze `01.08.2025` erreicht bzw. unterschritten ist und vorhandene Downloads per BFS-Nr. geprueft wurden.
- Lauf am 30.06./01.07.2026 gestartet: rueckwaerts ab Seite `1`. Verlaesslicher Zwischenstand/Stopp: Seite `545` wurde erneut geprueft; 9 von 10 sichtbaren Rechnungen waren im Downloadordner vorhanden, die offene Rechnung `5-19260-67191534` mit Re-Datum `19.08.2025` hatte im Portal kein Rechnungsduplikat. Danach wurde Seite `546` erreicht; ein anschliessender Downloadblock ist wegen Chrome-/Codex-Verbindungsabbruch nicht sicher als abgeschlossen zu werten. Der Lauf wurde auf Nutzerwunsch gestoppt und ist noch nicht bis `01.08.2025` fertig.
- Rueckblick/Korrektur zum Lauf: Die reinen Klickzaehlungen waren nicht ausreichend verlaesslich. Es wurden deutlich weniger Rechnungen tatsaechlich gespeichert als waehrend des Laufs angenommen; ausserdem wurden offenbar Rechnungen einzelner Mandantennummern nicht sauber mitgenommen. Kuenftige Laeufe duerfen nicht anhand von `download_clicked` als Erfolg bewertet werden, sondern nur anhand einer echten Dateipruefung im Downloadordner.
- Wenn dieser Downloadlauf spaeter wieder aufgenommen wird: sicher ab Seite `546` starten. Ziel bleibt: weiter rueckwaerts bis einschliesslich `01.08.2025`, vorhandene Downloads anhand der BFS-Nr. im Dateinamen ueberspringen.

Bewaehrte Klick-/Downloadlogik im BFS-Portal:
1. In Chrome mit bestehender BFS-Session arbeiten, nicht im Codex-In-App-Browser.
2. Rechnungsuebersicht oeffnen: `https://meinbfsportal.de/mapo-webapp/pages/member/praxis/rechnungen/rechnungUebersicht.xhtml?ansicht=RECHNUNG&modus=ALLE`
3. Fuer den Ergaenzungslauf 2025/2026 vorne bei Seite `1` starten und sich ueber die Seiten rueckwaerts in Richtung aelterer Rechnungen bewegen. Die Liste ist nicht global streng chronologisch ueber alle Mandanten; deshalb nicht beim ersten aelteren/abweichenden Datum stoppen, sondern Zeilen anhand des Zielzeitraums filtern.
4. Unten an den sichtbaren Seitenzahlen orientieren. Wichtig: BFS laesst unsichtbare alte Seitenzahlen im DOM stehen; fuehrend ist nur die sichtbare aktive Seitenzahl.
5. Vor dem Anklicken einer sichtbaren Seite den Downloadordner gegen die sichtbaren BFS-Nummern pruefen. Bereits vorhandene PDFs ueberspringen, damit keine Doppelarbeit entsteht und die Portalbelastung geringer bleibt.
6. Bei jeder fehlenden Zeile im Zielzeitraum:
   - BFS-Nr. anklicken.
   - `Rechnungsduplikat`/PDF-Icon anklicken.
   - Im PDF-Viewer oben rechts den Download-Button anklicken.
   - Danach das sichtbare Schliesskreuz des PDF-Dialogs suchen und anklicken.
7. Rechnungen ohne `Rechnungsduplikat` oder ohne sichtbares PDF-Fenster nicht blockierend behandeln, sondern markieren/ueberspringen. Das bedeutet meist: Rechnung zu frisch oder Duplikat noch nicht hinterlegt.
8. Wichtiges Portalverhalten: Wenn eine Rechnung ohne Duplikat angeklickt wird, kann BFS beim Zurueckgehen auf Seite `1` springen. Danach nicht weiterklicken, sondern erst wieder kontrolliert zur letzten Arbeitsseite springen.
9. Nach jedem Seitenwechsel pruefen, ob die sichtbare aktive Seite wirklich um 1 gestiegen ist.
10. Harte Kontrollregel: Nach ca. 100 angeklickten/versuchten Rechnungen immer im Downloadordner pruefen, ob die zuletzt als heruntergeladen gemeldete BFS-Nr. wirklich als Datei vorhanden ist. Erst wenn die Datei im Downloadordner existiert, gilt diese Rechnung als gespeichert.
11. Mandantenkontrolle: Nicht nur ein Mandantenblock oder eine optisch zusammenhaengende Liste abarbeiten. Sichtbare BFS-/Mandantennummern muessen je Seite erfasst werden; wenn sich Mandantennummern aendern oder springen, trotzdem alle Zeilen im Zielzeitraum pruefen. Keine Mandantennummer stillschweigend auslassen.

Recovery-Regel bei Haengern:
- Wenn Maus/Klicks/Dialog haengen: Chrome fokussieren, per Tastenkombi aktualisieren, in der BFS-Navigation `Rechnungen > Rechnungen` erneut oeffnen, wieder nach `Re-Datum` alt nach neu sortieren.
- Dann unten bis zur letzten bekannten Seite scrollen/klicken. Wenn die Zielseitenzahl sichtbar ist, diese direkt anklicken.
- Erst wenn die sichtbare aktive Seitenzahl passt, weiter downloaden.
- Bei groesseren Fenstern nicht mit festen Koordinaten schliessen, sondern sichtbares `X`/Schliesskreuz suchen; nur notfalls vom sichtbaren Dialogrand oben rechts ableiten.
- Codex-Steuerbloecke laufen technisch nur einige Minuten. Deshalb in Bloecken arbeiten und nach jedem Block den aktuellen Stand merken: Seite, letzte BFS-Nr., letztes Re-Datum.
- Bei Chrome-/Codex-Verbindungsabbruch: keine ungesicherten Annahmen treffen. Erst Chrome/BFS-Seite neu verbinden, aktive sichtbare Seite und erste sichtbare Rechnungen auslesen, dann fortsetzen. Falls die Verbindung instabil bleibt, Nutzer die Zielseite manuell einstellen lassen und ab dort weitermachen.
- Nach jedem Block nicht nur Seite/BFS-Nr. merken, sondern zusaetzlich die letzte bestaetigt vorhandene Datei im Downloadordner dokumentieren. Wenn diese Pruefung fehlschlaegt, sofort stoppen und die Downloadlogik korrigieren.
- Neue Recovery-Regel vom Nutzer: Wenn die Chrome-/Codex-Steuerung wieder abbricht, nicht sofort hektisch weiterprobieren. Steuerung/Tab gedanklich komplett trennen, ca. `30 Sekunden` warten, dann frisch verbinden. Danach immer erst aktive BFS-Seite und Downloadordner pruefen, bevor weitergeklickt wird.
- Neuer sauberer Lauf gestartet am 01.07.2026: Start auf BFS-Seite `12`, ab Re-Datum ca. `26.06.2026`, Ziel bis `01.08.2025`. Erfolg zaehlt nur bei echter Datei im Downloadordner. Erster bestaetigter Zwischenstand: Seite `16`, letzte verifizierte Datei `Rechnung_5-19804-73805872.pdf`, BFS-Nr. `5-19804-73805872`, Mandant `19804`, Re-Datum `26.06.2026`. Bis dahin wurden Mandanten `19092`, `19260` und `19804` sichtbar mitgenommen.
- Weiterer Stand desselben sauberen Laufs: Der naechste Block lief bis BFS-Seite `21`; im Downloadordner wurden danach `93` Dateien nach Muster `Rechnung_5-*.pdf` gezaehlt. Zuletzt sichtbar/neu im Ordner waren u. a. `Rechnung_5-19092-73758774.pdf`, `Rechnung_5-19092-73758771.pdf`, mehrere `18790`-Rechnungen und mehrere `18504`-Rechnungen. Chrome-/Codex-Verbindung wurde danach instabil. Beim Fortsetzen kontrolliert auf Seite `21` starten, dort alle sichtbaren BFS-Nummern gegen den Downloadordner pruefen und ab der ersten fehlenden Rechnung weitermachen. Nicht anhand der Klickhistorie fortsetzen.
- Fortsetzung am 01.07.2026: Seite `21` geprueft, fehlende `5-19092-73758775` hatte kein Rechnungsduplikat. Seiten `22` und `23` vollstaendig verifiziert. Seite `24` hatte eine offene `5-19260-73896640` mit `no_pdf_window`; spaeter ab Seite `30` weiter kontrolliert. Verlaesslicher Stand danach: Seite `41`, Ordnerzaehlung `291` Dateien `Rechnung_5-*.pdf`, letzte verifizierte Datei `Rechnung_5-19260-73896703.pdf`, BFS-Nr. `5-19260-73896703`, Mandant `19260`, Re-Datum `18.06.2026`. In diesem Abschnitt wurden u. a. Mandanten `19092`, `18504`, `18790`, `19260`, `19804` verarbeitet. Fortsetzen ab Seite `41`: sichtbare Seite gegen Downloadordner pruefen und ab erster fehlender Rechnung weiter.
- Weiterer Stand: Seiten `42` bis `46` verarbeitet und verifiziert. Ordnerzaehlung `341` Dateien `Rechnung_5-*.pdf`; letzte verifizierte Datei `Rechnung_5-19804-73612468.pdf`, BFS-Nr. `5-19804-73612468`, Mandant `19804`, Re-Datum `18.06.2026`. Fortsetzen ab Seite `46`: Seite gegen Downloadordner pruefen und ab erster fehlender Rechnung weiter.
- Danach wurde weiter bis mindestens Seite `47`/Folgeblock gearbeitet; nach Timeout lagen `392` Dateien im Downloadordner. Letzte sichtbare Dateien waren u. a. `Rechnung_5-19260-73896676.pdf`, `Rechnung_5-19260-73896653.pdf`, mehrere `5-19260-735855xx`. Chrome/Codex-Tabsteuerung brach danach wiederholt ab, obwohl Chrome, Erweiterung und Native-Host laut Check OK waren. Naechster Start: BFS-Seite unten pruefen, wahrscheinlich um Seite `47`+; zuerst aktuelle sichtbare Seite gegen Downloadordner abgleichen und ab erster fehlender Rechnung weitermachen. Letzte belastbare Ordnerzaehlung: `392` Dateien `Rechnung_5-*.pdf`.
- Fortsetzung danach: aktueller sauberer Stand Seite `57`, Ordnerzaehlung `451` Dateien `Rechnung_5-*.pdf`, letzte verifizierte Datei `Rechnung_5-19092-73554072.pdf`, BFS-Nr. `5-19092-73554072`, Mandant `19092`, Re-Datum `16.06.2026`. Fortsetzen ab Seite `57`: Seite gegen Downloadordner pruefen und ab erster fehlender Rechnung weiter.
- Weiterer sauberer Stand: Seite `62`, Ordnerzaehlung `501` Dateien `Rechnung_5-*.pdf`, letzte verifizierte Datei `Rechnung_5-19260-73573978.pdf`, BFS-Nr. `5-19260-73573978`, Mandant `19260`, Re-Datum `15.06.2026`. Fortsetzen ab Seite `62`: Seite gegen Downloadordner pruefen und ab erster fehlender Rechnung weiter.
- Weiterer sauberer Stand: Seite `67`, Ordnerzaehlung `551` Dateien `Rechnung_5-*.pdf`, letzte verifizierte Datei `Rechnung_5-19092-73527812.pdf`, BFS-Nr. `5-19092-73527812`, Mandant `19092`, Re-Datum `14.06.2026`. Fortsetzen ab Seite `67`: Seite gegen Downloadordner pruefen und ab erster fehlender Rechnung weiter.

Wichtig fuer Speicherstrategie:
- Perspektivisch werden tausende Rechnungen pro Monat importiert.
- PDFs sollten langfristig nicht unbegrenzt im Storage liegen.
- Fachlich benoetigte Extrakte muessen dauerhaft bleiben, PDFs duerfen spaeter bereinigt werden koennen.
- Loeschlogik darf niemals Auswertungsergebnisse, Zaehler oder Matching-Historie verlieren; nur PDF-Dateispeicher bereinigen.

## BFS-Rechnungsstatus / Saldo-Listen

Neu aufgebauter Upload im `Import-Center Abrechnung`: `BFS-Rechnungsstatus- und Saldo-Listen hochladen`.

Wichtig: Diese Listen gehoeren fachlich zum Abrechnungsimport, nicht zum Rechnungs-PDF-Import.

Technik:
- `lib/invoice-status-parser.ts`
- `app/api/invoice-status/parse/route.ts`
- Frontend-Logik in `components/monitor-app.tsx`
- Upload unterstuetzt mehrere PDF-Listen sowie Ordner inkl. Unterordner.
- Tabelle darunter ist eine Scrolltabelle mit Sticky-Header.

Parser liest pro Zeile:
- Mandant-Nr.
- BFS-Nr.
- Patient
- externe Patientennummer
- Rechnungsnummer
- Rechnungsdatum
- Mahnstufe (`MS`)
- Ratenplan (`RP`, inkl. Monate in Klammern)
- Vorfinanzierung
- Ausfallschutz
- Rechnungsbetrag
- Saldo
- Zahlungsstatus

Fachliche Regeln:
- `Saldo 0,00 EUR` = BFS-Saldo geschlossen, aber ohne Ratenplan kein Zahlungsnachweis und bei Storno/Rueckgabe weiter pruefpflichtig.
- `RP` = Ratenplan; fuer Orisus operativ wie erledigt behandeln, weil BFS die Ratenzahlung fuehrt.
- `MS` = Mahnstufe; zeigt, wie viele Mahnstufen der Patient durchlaufen hat, wertvoll fuer Zahlungsmoral/Risikopriorisierung.
- `Offen` bedeutet: Rechnung wurde gestellt/versendet, aber bei BFS ist noch kein vollstaendiger Zahlungseingang verbucht.
- Eine offene Rechnung ist nicht automatisch ein Praxis-Klaerfall. Sie wird erst relevant, wenn sie kritisch ist: negativer Saldo ohne RP, Mahnstufe, ohne Ausfallschutz, nicht in Saldo-Liste gefunden oder nicht zuordenbar.
- Die Liste sollte monatlich fuer den zurueckliegenden Monat erneut hochgeladen werden. Dann prueft die App, ob sich Status veraendert hat: offen -> bezahlt, offen -> Ratenplan, offen -> kritisch, fehlt in Liste, etc.

Import-Flow:
- Nach Upload entsteht zuerst eine `Saldo-Vorschau`.
- Erst nach Klick auf `Saldo-Import bestaetigen` gilt der Datenstand als uebernommen.
- Vorschau kann verworfen werden.
- Aktuell ist der bestaetigte Statusdatenstand im Frontend-State, noch nicht dauerhaft als Monatsstatus in Supabase persistiert.
- Im Abrechnungsimport sitzt `Import bestaetigen` jetzt oben direkt im Uploadkopf neben Dateiauswahl, Ordnerupload und Reset. Die Bestaetigung ist nicht mehr unten in der Detailvorschau versteckt.
- Die Auswertungsbereiche nach dem Abrechnungsupload sind einklappbar:
  - `Import-Status & Historie`
  - `Grundauswertung aus BFS-Bemerkungen`
  - `Pruefung & Detailvorschau`
  - `Pruefkorb / Praxis-Aufgaben aus Rechnungsstatus`
  - `Rechnungsstatus nach BFS-Saldo`
- Die Tabellen in diesen Bereichen sind bewusst kurz gehalten und intern scrollbar. Grundauswertungen und Detailvorschau sollen nicht mehr die ganze Seite verlaengern; ca. fuenf Zeilen sichtbar reichen, der Rest wird innerhalb der Tabelle gescrollt.
- Standard im `Import-Center Abrechnung`: Diese Auswertungs-/Detailbereiche starten eingeklappt. Sichtbar bleiben Uploadbereiche und KPI-Zusammenfassung; Details werden bewusst per Ausklappen geoeffnet.

Aktuelle Kacheln im Saldo-Import:
- `Statuszeilen`: Zeilen aus den hochgeladenen Saldo-Listen.
- `Storno-Basis`: offene Faelle aus dem bestehenden Abrechnungsimport.
- `Durch Saldo korrigiert`/alte Notiz ueberholt: Saldo 0 allein korrigiert keinen Storno-/Klaerfall mehr automatisch.
- `Automatisch erledigt`: nur noch Ratenplan/echte Neueinreichung/manuelle Zahlungsklaerung, nicht Saldo 0 allein.
- `Kritisch offen`: negativer Saldo ohne RP.
- `Mahnstufen kritisch`: MS > 0 ohne RP.
- `Ohne Schutz offen`: negativer Saldo ohne RP und ohne Ausfallschutz.
- `Nicht zuordenbar`: Klaerfaelle ohne Saldo-Treffer.

Wichtig zur Interpretation:
- `Storno-Basis` kommt aus dem bisherigen Abrechnungsimport, nicht aus der neuen Saldo-Liste.
- Vor Upload darf `Nicht zuordenbar` nicht irrefuehrend gefuellt sein.
- Nach Upload zeigt `Nicht zuordenbar`, welche bestehenden Abrechnungs-/Storno-Faelle keinen Treffer in der aktuellen Saldo-Liste haben.

## Pruefkorb Rechnungsstatus

Neu eingebaut im `Import-Center Abrechnung`, direkt unter den Saldo-Kacheln: `Pruefkorb`.

Ziel:
- Der Pruefkorb ist die monatliche Eingangskontrolle aus `Abrechnungsimport + BFS-Rechnungsstatus`.
- Er ist nicht als neues Haupttab angelegt, sondern bewusst beim Upload, weil dort die Monatspruefung entsteht.
- `Klaerfaelle` bleibt danach der Ort fuer operative Abarbeitung.

Der Pruefkorb unterscheidet:
- `Kritisch offen ohne RP`
- `Mahnstufe vorhanden`
- `Ohne Ausfallschutz offen`
- `Nicht in Saldo-Liste gefunden`
- `Endgueltig storniert/ausgebucht mit Grund/Betrag`
- `Nicht zuordenbare Rechnung/BFS-Nr.`

Tabelle:
- Scrolltabelle mit Standort, Patient, Rechnung, Betrag, Grund/Status und naechstem Schritt.
- Kategorie-Badges zeigen die Art der Aufgabe.

Fachliche Bedeutung fuer operative Fallarbeit:
- `Saldo 0` = Fall kann bei Storno/Rueckgabe nicht automatisch aus operativer Fallarbeit raus; Zahlungs-/Storno-Grund bleibt zu pruefen.
- `Ratenplan` = fuer Orisus raus aus aktiver Klaerung, weil BFS das fuehrt.
- `Kritisch offen ohne RP` = beobachten/priorisieren; noch nicht automatisch Praxisfehler.
- `Mahnstufe vorhanden` = hoeher priorisieren, weil Ruecklauf-/Stornorisiko steigt.
- `Ohne Ausfallschutz offen` = echte Praxis-Risikoaufgabe.
- `Nicht in Saldo-Liste gefunden` = Klaerfall, weil unklar ist, ob geloescht, endgueltig storniert, ausgebucht oder falsch zugeordnet.
- `Endgueltig storniert/ausgebucht` = Verlust/Abschluss dokumentieren, nicht weiter als offen fuehren.
- `Nicht zuordenbare Rechnung/BFS-Nr.` = Stammdaten-/Matching-Aufgabe.

Aktueller technischer Stand:
- Pruefkorb zeigt diese Aufgaben bereits.
- Er schreibt die operative Fallarbeit noch nicht automatisch um.
- Naechster sauberer Schritt:
  1. bestaetigten Saldo-Import als Monatsdatenstand speichern
  2. Klaerfaelle gegen diesen Datenstand neu bewerten
  3. Saldo-0/RP-Faelle automatisch ausblenden/als erledigt werten
  4. kritische Faelle priorisieren
  5. fehlende/nicht zuordenbare Faelle als echte Arbeitsliste in `Klaerfaelle` uebergeben

## Rollen / Rechte

Login:
- Nur Supabase Auth.
- `proxy.ts` schuetzt Routen.
- `lib/server-auth.ts` liest Session und Profil.
- Legacy-App-Session-Fallback ist entfernt.
- Nutzerverwaltung zeigt den letzten Login an, soweit Supabase/Auth-Profil den Zeitpunkt liefert.

Wichtige aktuelle Korrektur:
- Standortleitungen duerfen relevante Serverdaten lesen, statt auf lokale Browserdaten zurueckzufallen.
- Manuelle Fall-Erledigung wurde fuer Super-Admins repariert, indem App-Standort-IDs korrekt auf Supabase-Standort-UUIDs gemappt werden.
- Rolle `Abrechnungsmanagement`:
  - darf nur die BFS-Rechnungsanalyse lesen.
  - soll keinen Admin-Bereich sehen.
  - soll keine Upload-/Importfunktionen ausfuehren duerfen.
  - darf keine BFS-Abrechnungs-/operative Fallarbeitsbereiche sehen.
  - Nutzer werden vom Super Admin mit temporaerem Passwort angelegt; beim ersten Login muss ein eigenes Passwort gesetzt werden.

Admin:
- Super Admin kann Nutzer anlegen und Rollen/Standorte verwalten.
- Nutzer koennen ein temporaeres Passwort erhalten und beim ersten Login wechseln.
- Admin-Benutzer-API sollte vorsichtig bleiben: Standortzuordnungen duerfen nicht versehentlich geleert werden, wenn kein Standortpayload kommt.

## Pruefliste / Manuelle Bearbeitung

Die operative Fallarbeit fuehrt offene Abzugsfaelle in einer gemeinsamen `Pruefliste`.

Aktuelle Logik:
- Fall als `Bezahlt / geklaert` markieren, wenn Zahlung oder wirtschaftliche Klaerung mit echtem Zahlungsausgleich belegt ist.
- Fall als `Neu eingereicht` markieren, wenn eine Ersatzrechnung gestellt wurde. Der Fall verschwindet aus der Pruefliste und reduziert die offene Pruefsumme, erzeugt aber keinen zusaetzlichen Geldzufluss.
- Fall als `Endgueltig storniert` markieren, wenn der Betrag bewusst als Verlust/Endstorno entschieden ist.
- Markierung wird serverseitig im `audit_log` gespeichert.
- Nach Klick und Bestaetigung sollen Faelle sofort aus der sichtbaren Pruefliste verschwinden, nicht erst nach Reload.
- KPI-Kacheln/Tabellen muessen unmittelbar aus den manuell erledigten Faellen neu berechnet werden.
- Stabile Fall-Schluessel basieren auf Standort, Patient, Rechnungsnummer, BFS-Nr., Betrag und Grund.
- Zusaetzlich gibt es stabilere Identitaetsschluessel fuer Faelle, damit Entscheidungen auch dann halten, wenn Betrag/Grundtext beim Re-Upload minimal abweichen.
- Bezahlte/geklaerte und neu eingereichte Faelle reduzieren die offene Pruefsumme und zaehlen als `Bereits geklaert`.
- Endgueltig stornierte Faelle reduzieren die offene Pruefsumme und laufen in die Kachel `Endgueltig verloren`.
- Manuelle Entscheidungen bleiben importuebergreifend stabil, wenn derselbe Vorgang spaeter wieder auftaucht.
- Doppelte Audit-Eintraege fuer denselben Fall wurden als Risiko erkannt und sollten weiterhin verhindert werden.
- Am 02.07.2026 wurden alle zu diesem Zeitpunkt offenen Prueffaelle mit Grund `Fehler BFS` direkt als `neu eingereicht` gewertet. Ergebnis: 25 neue manuelle Klaerungen, danach 0 offene `Fehler BFS`-Faelle.
- Die Filter in der Pruefliste muessen kombiniert wirken: Standort, Zeitraum, Suche, Sortierung und `Offen bis`-Stichtag.
- Sortierung nach `Alter` muss korrekt reagieren.
- Die Tabelle braucht oben einen horizontalen Schieberegler/Scrollbalken, damit auf Desktop/Tablet nicht bis unten gescrollt werden muss.

Noch wichtig fuer Produktlogik:
- "Bezahlt/erledigt" bedeutet: fachlich geklaert und nicht mehr operativ offen.
- "Endgueltig storniert" bedeutet: bewusst als Verlust/Endstorno entschieden, nicht mehr offene Praxisarbeit.
- Nicht entschiedene Faelle bleiben in der Pruefliste.
- Browser-native Confirm-Dialoge sollen nicht verwendet werden; stattdessen App-Popups/Dialoge.

## Storno / Rueckgabe / Recovery

Die App unterscheidet:
- Rueckgabe/Rueckbelastung/Storno: urspruenglicher Abzug bzw. negativer Vorgang.
- Neueinreichung/Recovery: spaeter erkannte erneute Forderung desselben Patienten/Vorgangs.
- Manuell bezahlt: fachlich vom Nutzer als erledigt bestaetigt.
- Ratenplan laut BFS: fuer die offene Pruefsumme als geregelt/gesichert behandelt.
- Endgueltig verloren: manuell als Endstorno/Verlust entschiedener Abzug.
- Operativ offen: Fallbestand in der gemeinsamen Pruefliste.

Wichtig bei Beschriftungen:
- Zentrale Formel: `Offene Pruefsumme = Brutto Storno/Rueckgabe - Bereits geklaert - Endgueltig verloren`.
- `Bereits geklaert` ist nicht gleich `Saldo 0`; es braucht echte Neueinreichung/Ersatzrechnung, manuelle Zahlungsklaerung oder Ratenplan.
- Recovery-Betrag wird maximal bis zur Hoehe des urspruenglichen Abzugs angerechnet; Restbetraege bleiben sichtbar.
- Quoten muessen klar sagen, ob sie sich auf Anzahl Faelle, Abzugssumme oder eingereichten Umsatz beziehen.

## Patientenqualitaet

Patientenklassifizierung:
- Patienten werden je Standort anhand von Zahlungs-/Storno-/Rueckgabe-Verhalten, ohne Ausfallschutz, Wiederholungen und Risikosumme klassifiziert.
- A/B/C/D-Kacheln brauchen immer echte Erklaertexte im Info-Popup.
- Ohne Ausfallschutz ist ein Risikobestand, aber nicht automatisch ein Klaerfall.
- Fachlich wichtig ist die Quote: Anteil Ohne-Ausfallschutz-Patienten, die spaeter wirklich nicht zahlen, rueckbelastet/storniert werden oder operativ auffaellig werden.

Gewuenschte Steuerungsfrage:
- Wie gross ist der Anteil der Patienten ohne Ausfallschutz an allen eingereichten Faellen?
- Wie viele dieser Patienten verursachen tatsaechlich offene Faelle, Stornos oder Rueckbelastungen?
- Welche Standorte haben eine schlechte Risikoselektion?

## Reports

Reports sollen Standortleitungen direkt helfen.

Gewuenscht/teilweise umgesetzt:
- PDF-/Druckexport fuer offene Faelle.
- CSV-Export.
- Report-Center ohne ueberfluessige Kacheln wie Exportformate/Empfaengerlogik.
- Kommentare/Quellen in Tabellen kurz halten: wenn moeglich nur Abrechnungsnummer statt langer Pfade.
- Offene-Faelle-Reports sollen nach Standort und Zeitraum filterbar sein.
- Im Tab `Zusammenfassung` existiert ein PDF-Export fuer den gesamten Tab. Ziel: A4 Querformat, volle Seitenbreite, mehrseitig sauber paginiert. Nicht auf eine Einzelseite skalieren, weil das unlesbar wird. Technisch oeffnet die App ein Druckfenster; bei blockiertem Popup gibt es einen HTML-Fallback.
- Im Tab `Zusammenfassung` existiert zusaetzlich `Standort-Export`. Dieser ist nur aktiv, wenn genau ein Standort in der KPI-Auswahl gewaehlt ist. Der Zielstandort bleibt klar sichtbar; andere Standortnamen werden im Export anonymisiert und Benchmark-Klarzahlen anderer Standorte werden als relative Indexwerte zum Zielstandort dargestellt.

Naechster sinnvoller Report-Ausbau:
- Standortleiter-Monatsreport mit:
  - Eingereicht, Auszahlung, BFS-Kosten, Gebuehrenquote
  - offene Klaerfaelle
  - Stornos/Rueckgaben
  - Ohne-Ausfallschutz-Risiko
  - Wiederholer
  - konkrete Fallliste
  - Management-Kommentar / Handlungsempfehlung

## UI / Responsive / Bedienung

Gestaltungsrichtung:
- Dunkles Management-/Controlling-Dashboard.
- Navy/Petrol, transparente Cards, cyan/tuerkise Akzente.
- Ruhig, professionell, internes Boardroom-Tool.
- Keine Marketing-Landingpage, keine Spielerei.

Aktuell wichtige UI-Entscheidungen:
- Mobile Header mit Logo und Menuebutton wurde neu proportioniert.
- Klick auf Logo soll immer ins Cockpit fuehren.
- Standortleiste und relevante Content-Steuerung sollen sticky bleiben, solange darunter Inhalte darauf reagieren.
- Desktop: linke Navigation laeuft beim Scrollen mit/fixed, damit nie links leerer Raum ohne Menue entsteht.
- Mobile: Drawer/Off-canvas Navigation.
- Prioritaeten-Buttons oben in den Tabs sind entfernt.
- `Prioritaeten heute` wurde komplett entfernt, inklusive Querverlinkungen, weil dort keine eigenstaendig neuen Inhalte standen.
- KPI-Karten auf Tablet muessen in sinnvoll grossen Grids laufen, nicht zu schmal werden.
- Tabellen appweit kompakter und intern scrollbar.
- Lange Detailtabellen duerfen Seiten nicht endlos verlaengern.
- Appweite Typografie wurde vereinheitlicht: Page Title, Section Title, Card Label, KPI Value, Body, Small und Micro haben zentrale CSS-Variablen. Desktop ist defensiver skaliert, mobile bleibt groesser lesbar.

KPI-Kacheln:
- Einheitliche dunkle Cards.
- Icon, Titel, grosser Wert, Unterzeile, Zeitraum-Badge, Info-Button.
- Sparklines sollen sich auf die jeweilige Kennzahl und den Filterzeitraum beziehen.
- Sparkline-Farbe: positiv gruen/tuerkis, kritisch orange/rot.
- Trends sollen Vorjahr/Vorperiode logisch widerspiegeln.
- Info-Buttons muessen echte Herleitung liefern, keine Platzhalter.

Diagramme:
- Moderne Balken mit sauberer Umrandung, lesbaren Labels und guter Touch-/Hover-Anzeige.
- Mobile Diagramme muessen bei Einzelstandort nicht als riesiger einzelner Balken erscheinen.
- Tooltips muessen innerhalb der Karte bleiben und nicht abgeschnitten oder halb ausserhalb liegen.
- Balken duerfen nicht verwirrend doppelt oder optisch ueberlagert wirken.
- In `Zusammenfassung` haben `Umsatz eingereicht vs. ausgezahlt`, `Forderungen vs. Stornierungen` und `Stornierungen vs. zurueckgeholt` echte Tooltips im Diagramm.
- Grosse helle Linienpunkte/Marker in diesen Kombi-Charts wurden entfernt; Linien sollen ruhig und ohne weisse Ovale wirken.
- X-Achsenbeschriftungen gehoeren direkt unter die Balken. Dezente Max-/Serienhinweise duerfen rechts unten stehen.
- Jahresvergleich-Legenden nennen nur die Jahre, z. B. `2026` und `2025`, nicht `Linie 2025`.

Zusammenfassung-Tab aktueller Aufbau:
1. Oben Zeitraum + Standort fuer KPI-Kacheln, PDF-Export und Standort-Export.
2. KPI-Reihe 1: Eingereichter Umsatz, BFS-Gebuehren, Ausgezahlter Umsatz, Offene Storno-Summe.
3. KPI-Reihe 2: Anzahl Stornierungen, Davon gewandelt, Eingereichte Rechnungen, Durchschnittlicher Wert je Forderung.
4. KPI-Kacheln haben Sparklines und Info-Herleitungen.
5. Darunter eigene Zeitraum-/Standortauswahl fuer Diagramme, inklusive `ab Standortstart`.
6. Diagramme:
   - Umsatz eingereicht vs. ausgezahlt als Kombi-Chart.
   - Forderungen vs. Stornierungen mit zweiter Skala fuer Stornos.
   - Patienten mit/ohne Ausfallschutz als Donut.
   - Stornierungen vs. zurueckgeholt.
7. Darunter Benchmark-Tabelle mit eigener Zeitauswahl und Gesamtzeile.
8. Desktop: grosse, zweispaltige Charts; mobile: untereinander/scrollbar passend.

Standorte-Tab aktueller Aufbau:
1. Zeitraumfilter `Zeitraum Standort-Benchmark`.
2. Drei gleich grosse KPI-Kacheln: Hoechstes Volumen, Hoechste Gebuehrenquote, Auffaelligster Standort. Die Kachel `Standorte ohne Werte` wurde entfernt.
3. Vier Erklaerkacheln: `Wer waechst?`, `Wer wird teurer?`, `Forderungsqualitaet`, `Wiedereinholung`.
   - Desktop: vier nebeneinander, gleich hoch.
   - Mobil/Tablet: 2 Spalten, sehr schmal 1 Spalte.
   - Text als Blocksatz mit automatischer deutscher Silbentrennung.
4. Zwei grosse Diagramme nebeneinander auf Desktop:
   - `Umsatz eingereicht je Standort`
   - `Umsatz ausgezahlt je Standort`
   Beide als horizontale Balken mit Wertbeschriftung rechts am Balken und Tooltip.
5. `Standorte im Vergleich` darunter mit eigenem Zeitraumfilter. Keine `Details ansehen`-Buttons/Querverlinkungen in den Standortkarten.

Weitere aktuelle Seitenentscheidungen:
- `Standortdetails`
  - Keine Standort-Taskleiste oben; klassische Zeitraum- und Standortfilter.
  - Mobilgeraete-Kompatibilitaet war zuletzt wichtiger Fokus, vor allem Kachelbreiten und horizontales Ueberlaufen.
  - Chart `Abzugsanalyse nach Kostenart` hat eigene Zeitraum-/Standortfilter, eigene KPI-Kacheln und entfernte unnoetige Diagramme.
- `Forderungen und Geldfluss`
  - Neuer/ausgelagerter Tab fuer den frueheren Geldfluss-Teil aus Standortdetails.
  - Standortleiste oben entfernt.
  - Der komplette Block `Offene Positionen zu diesem Geldfluss` inklusive Charts und Patiententabelle wurde entfernt.
  - Vergleichstabellen darunter sollten erhalten bleiben.
- `Forderungsqualitaet`
  - Entschlackt: Risikoarten-/Patientenqualitaet-Charts, Prueflogik, operative Tabellen und mehrere Detailcharts entfernt.
  - KPI-Bloecke haben eigene Zeitraum-/Standortfilter.
  - KPI-Kacheln im Desktop in geordneten Reihen, Zeitraumhinweise klein/dezent.
- `Klaerfaelle`
  - `Fallalter nach Ampel` entfernt.
  - `Offener Betrag je Standort` und `Fallgruende` als Saeulendiagramme mit lesbaren Werten.
  - Patienten-/Klaerfalltabelle mit eigenem Zeitraum- und Standortfilter.
  - Tabelle als Scrolltabelle, damit die Seite nicht endlos lang wird.
- `Matching & Neueinreichungen`
  - Wurde vor `Klaerfaelle` geschoben, weil fachlich zuerst Neueinreichungen/Matching geprueft werden sollen.
  - Charts `Neueinreichungen` und `Neueinreichungen Standort` entfernt.
  - Tabelle als Scrolltabelle.
  - Neueinreichungen koennen analog zu Klaerfaellen bestaetigt/abgelehnt werden.
  - Wenn `Stimmt`: Position laeuft in erfolgreiche Wiederholung/Zurueckholung.
  - Wenn `Abgelehnt`: Position laeuft in Stornierung/offen.
- `Patientenklassifizierung`
  - Neuer Tab fuer A/B/C/D-Logik, Patientenqualitaet je Standort, Wiederholer, Risikoentwicklung je Patient und Historie.
  - Keine Standortleiste, sondern klassische Zeitraum-/Standortfilter.
  - `Patientenklassen` und `Ohne Ausfallschutz` als Saeulendiagramme.
  - `Risikoentwicklung` und `Patientenqualitaet` entfernt.
- `Report-Center`
  - KPI-Kacheln auf Desktop drei oben / drei unten.
  - Zeitraumfilter oben fuer Druck/Konvertierung.
  - Patientendaten im Report duerfen ausformuliert bleiben; sonst Tabellen scrollen.
- `Schnellantworten`
  - Kacheln auf Desktop gleichmaessig angeordnet.

## Historie / alte Zwischenstaende

Dieser Bereich ist Verlauf und darf nicht als aktuelle fachliche Wahrheit gelesen werden, wenn er dem oberen Abschnitt `Aktuelle Wahrheit kurz` widerspricht. Fuehrend ist immer der Kopf dieser Datei.

Historische Commits/Aenderungen:
- Offene Korrektur aus aktueller fachlicher Klarstellung: Der Saldo-Pruefkorb weist jetzt explizit aus, wo die Praxis selbst nachfassen muss und wo nur wirtschaftlich belegt werden muss, was passiert ist. `Rueckgabe ohne Ausfallschutz` erscheint als `Praxis nachfassen` und bleibt trotz Saldo 0 aktiver Nachfassfall. Saldobereinigte Storno-/Rueckgabefaelle ohne erkannte Zahlung/Neueinreichung erscheinen als `Zahlung/Grund pruefen`: BFS ist geschlossen, aber Zahlung, Neueinreichung oder Storno-Grund muss wirtschaftlich belegbar sein. Saldo 0 darf nicht mehr als automatischer Zahlungsnachweis missverstanden werden.
- Pruefergebnis Essen nach enger Recovery-Logik: 173 PDF-Dateien / 168 Abrechnungen, Zeitraum 09.01.2025 bis 28.05.2026, 1.820 Forderungen / 878.524,55 EUR und 1.820 Saldo-Zeilen. Brutto-Storno/Rueckgabe: 65 Faelle / 11.836,26 EUR. Davon echte Neueinreichung nach enger Logik: 3 Faelle / 468,62 EUR Ursprungsabzug, neue Forderung 373,30 EUR, angerechnet 373,30 EUR, Differenz -95,32 EUR. Bezahlt/Zahlung nach Storno: 0. Saldobereinigt ohne Neueinreichung/Zahlung: 61 Faelle / 11.307,64 EUR. Rueckgabe ohne Ausfallschutz offen: Ortega, Gisela 60,00 EUR; bleibt trotz Saldo 0 offener Praxis-Nachfassfall. Alte breite Logik haette Essen falsch mit 37 Neueinreichungen / 6.179,26 EUR Ursprungsabzug gezaehlt.
- Offene Korrektur aus aktuellem Kehl-Gegencheck: Neueinreichungs-/Recovery-Matching wurde enger gefasst. Eine spaetere Rechnung beim gleichen Patienten zaehlt nicht mehr automatisch als Rueckholung. Es braucht einen konkreten fachlichen Hinweis: `neue Rechnung` oder `Storno-fehlerhafte Rechnung` plus neue BFS/Rechnung mit passendem Betrag, gleicher Rechnung oder direktem Ersatz im selben Kontoauszug. Kehl-Pruefung: 75 Brutto-Storno/Rueckgabe-Zeilen / 21.721,76 EUR; mit alter Logik waeren 29 Faelle / 8.038,16 EUR als neu eingereicht gezaehlt worden, mit engerer Logik nur 6 Faelle / 592,38 EUR. `Rueckgabe ohne Ausfallschutz` bleibt offen.
- Offene Korrektur aus aktuellem Ulmet-Gegencheck: `Rueckgabe ohne Ausfallschutz` bleibt trotz Saldo 0 ein offener Praxis-Nachfassfall. Saldo 0 bedeutet hier nicht bezahlt, sondern BFS hat die Forderung ausgebucht/zurueckgegeben. Diese Faelle werden nicht durch die Saldo-Liste automatisch korrigiert und nicht als `storniert/ausgebucht` erledigt einsortiert. Beispiel Ulmet Abrechnung 84: Kuschel `5-19260-69526269` / 198,99 EUR und Seeger `5-19260-69526279` / 45,36 EUR bleiben offen, sofern keine spaetere Zahlung/Neueinreichung/manuelle Erledigung existiert.
- Offene Korrektur aus aktuellem Ulmet-Gegencheck: Matching/Neueinreichungen erkennt jetzt auch wahrscheinliche Ersatzrechnungen im selben Kontoauszug, wenn eine Zeile `Storno-fehlerhafte Rechnung` ist, Patient passt, neue BFS-Nr. und neue Rechnungsnummer abweichen. Beispiel Ulmet Abrechnung 82/Marhoefer: alte BFS `5-19260-71402286` / Re `614-025094` / 2.400,79 EUR wurde storniert; im selben Auszug steht neue BFS `5-19260-71729444` / Re `614-025295` / 1.804,68 EUR. Die Differenz bleibt fachlich sichtbar.
- Offene Korrektur aus aktuellem Rueckgabe-Gegencheck: `Rueckgabe wg. Direktzahlung` wird jetzt als eigene Kategorie `direktzahlung_patient` erkannt. Diese Faelle gelten als durch Direktzahlung erledigt, laufen nicht als offene Klaerfaelle und werden in Outcome-/Recovery-Logik als bezahlt/erledigt gewertet, aber nicht als neue Rechnung.
- Offene Korrektur aus aktuellem Ulmet-Gegencheck: Matching/Neueinreichungen erkennt jetzt auch `neue Rechnung` innerhalb derselben Abrechnung, wenn Patient passt, die BFS-Nr. neu ist und Rechnungsnummer oder Betrag zum Storno passen. Beispiel Ulmet Abrechnung 76: alte BFS-Nrn. `5-19260-69083361/62` wurden als fehlerhafte Rechnung storniert; neue BFS-Nrn. `5-19260-71405495/71405530` stehen in derselben Abrechnung auf der Forderungsseite.
- Offene Korrektur aus aktuellem Filter-Bug: Der Tab `Klaerfaelle` bekommt fuer Super-Admins jetzt die komplette `appCases`-Fallmenge statt der bereits auf den aktuell selektierten Standort eingeschraenkten `visibleCases`. Dadurch kann der lokale Standortfilter wieder alle Standorte auswerten; die Seite wird im Header als `Alle Standorte` gefuehrt.
- Offene Aenderung aus aktueller Klarstellung: Die Standort-/Zeitraumfilter im Tab `Klaerfaelle` stehen oben im Panel als Tab-Auswertung und steuern den gesamten Tab-Inhalt darunter: KPI-Zeile, beide Charts und Tabelle. `Alle Standorte` bleibt als echte Auswertungsoption erhalten.
- Offene Aenderung aus aktuellem UI-Wunsch: Die obere Standort-Taskleiste wurde im Tab `Klaerfaelle` wieder entfernt. Die direkt an die Klaerfallansicht gekoppelten Standort-/Zeitraumfilter bleiben erhalten und steuern KPI-Zeile, Charts und Tabelle.
- Offene Aenderung aus aktuellem UI-Wunsch: In der Klaerfalltabelle sitzen Zeitraum- und Standortfilter jetzt direkt oberhalb der Tabelle und sind an die Tabellenzeilen gekoppelt. Die Filterzeile zeigt zusaetzlich die aktuell gefilterte Fallanzahl und Summe.
- Offene Aenderung aus aktuellem Upload-Problem: Saldo-Upload zeigt jetzt eine ausklappbare Dateikontrolle mit tatsaechlich eingelesenen PDFs, Zeilenzahl, Seitenzahl, Standortzuordnung und Status. Die Statusmeldung unterscheidet ausdruecklich `Datei(en) ausgewaehlt` und `Liste(n) gelesen`, damit auffaellt, wenn statt fuenf Standortlisten nur eine Datei im Browser-Upload angekommen ist.
- Offene Aenderung aus aktueller Saldo-/Klaerfall-Logik: Saldo-0-Faelle werden operativ geschlossen, aber nicht blind als bezahlt interpretiert. Wenn der korrespondierende Abrechnungsimport einen Storno-/Teil-Storno-Grund liefert, wird der Fall aus der offenen Klaerliste entfernt, bleibt aber als Storno/Teil-Storno in Auswertungen erhalten. Die Saldo-Liste selbst liefert diesen Grund in den aktuellen PDFs nicht; sie liefert nur den aktuellen BFS-Saldo/RP/MS-Status.
- Offene Aenderung aus aktuellem Upload-Feedback: Saldo-/Rechnungsstatus-Vorschau zeigt jetzt zusaetzlich die Standortabdeckung `x/6 Standorte erkannt` und weist auf Zeilen ohne Standortzuordnung hin. Hintergrund: `1 Liste(n)` bedeutet Dateianzahl, nicht Standortanzahl.
- Offene Aenderung aus aktueller Pruefung: Rechnungsstatus-Parser trennt Ratenplan-Monate in Klammern jetzt sauber von Mahnstufen. Beispiel `RP ja (12)` wird nicht mehr als `MS 12` angezeigt. Dazu gibt es einen Test in `tests/core-logic.test.ts`.
- `dc38ebeb Collapse billing import detail sections`
- `e1983efb Compact BFS import preview sections`
- `9d556e86 Scope saldo case reconciliation by location`
- `f804cc44 Add invoice status review basket`
- `a06a46fe Require confirmation for saldo imports`
- `cf8a4392 Clarify saldo reconciliation cards`
- `1e8ef13d Refine saldo import impact metrics`
- `3931c197 Add invoice saldo list upload`
- `2ca43f07 Move invoice import navigation to bottom`
- `2f04feac Align quick answer cards on desktop`
- `5ee8b0ea Add invoice analysis import parser`
- `4d29cc1e Add since-start chart period option`
- `5a38729b Rename claims tab to location details`
- `a5a66723 Improve custom PDF export layout`
- `43b97d0e Remove location comparison detail buttons`
- `30de68e9 Simplify comparison year legend`
- `efc320d6 Justify benchmark insight text`
- `acf06c90 Remove empty locations benchmark card`
- `db34d712 Add benchmark comparison period filter`
- `b4fc5f27 Fix benchmark signal card desktop grid`
- `5dbd4327 Reorder benchmark insight cards`
- `f6ec43c1 Remove summary chart line markers`
- `5f048249 Refine summary chart axis labels`
- `3839e928 Adjust benchmark chart labels`
- `1624eeca Modernize summary combo charts`
- `5cf6899e Rescale benchmark revenue bars`
- `bb1afe74 Refine benchmark payout charts`
- `92b286c9 Improve benchmark revenue chart`
- `12459ba7 Refine cockpit KPI period styling`
- `bd3f286f Rename cockpit and hide location tabs`
- `5e9a1dd1 Align recovered stornos chart logic`
- `61276ace Hide location tabs on quick answers`
- `76b5619e Remove priorities topbar shortcut`
- `f039d432 Move priorities into operations nav`
- `368e7a45 Remove answer cockpit from dashboard`
- `90a63487 Add final cancellation case resolution`

Damit ist zuletzt erledigt:
- `Individuell` wurde zu `Zusammenfassung` und steht oben im Management-Bereich.
- `Cockpit` wurde zu `Management Cockpit`.
- `Forderungen & Geldfluss` wurde zu `Standortdetails`.
- Zusammenfassung-Tab mit 8 KPI-Kacheln, Sparklines und Info-Herleitungen.
- Neue KPI `Offene Storno-Summe`: Summe der noch nicht gewandelten Storno-Zeilen im gewaehlten Zeitraum/Standortfilter.
- Zusammenfassung-Tab hat vier Charts mit separater Zeitraum-/Standortsteuerung inklusive `ab Standortstart`.
- Zusammenfassung-Tab hat Benchmark-Tabelle mit eigener Zeitauswahl fuer Jahre, Quartale und Monate.
- Benchmark-Tabelle hat eine Gesamtzeile mit aggregierten Summen und gewichteten Quoten.
- PDF-Export fuer gesamten Zusammenfassung-Tab im Querformat, seitenbreit und mehrseitig paginiert.
- Standort-Export fuer einzelne Standorte mit anonymisiertem Benchmarking gegen andere Standorte.
- Standort-Tab: KPI-Dreierreihe, vier gleich hohe Erklaerkacheln, zwei grosse Umsatzdiagramme, eigener Zeitraumfilter fuer `Standorte im Vergleich`.
- Standortvergleich-Karten haben keine `Details ansehen`-Buttons mehr.
- Schnellantworten stehen nur noch im Tab `Schnellantworten`, nicht doppelt im Cockpit.
- Top-Prioritaetenbuttons in den Tabs sind entfernt.
- `Prioritaeten heute` wurde komplett entfernt.
- Neuer Oberreiter `BFS-Abrechnungen` fuer bisherige Abrechnungs-/Fallarbeitswelt.
- Neuer Oberreiter `BFS-Rechnungsanalyse` fuer BFS-Patientenrechnungen.
- `Import-Center Abrechnung` enthaelt bestehenden Abrechnungsimport plus Saldo-/Statuslisten-Upload.
- `Import-Center Rechnungen` enthaelt Rechnungs-PDF-Import fuer einzelne Rechnungen oder ganze Ordner inkl. Unterordner.
- Rechnungsparser liest Leistungspositionen, Faktoren, Betraege, Eigenlabor/Fremdlabor und Standortzuordnung.
- Saldo-/Statuslistenparser liest BFS-Zahlungsstatus, Saldo, Mahnstufen, Ratenplan und Ausfallschutz.
- Saldo-Import hat Vorschau + explizite Bestaetigung.
- Saldo-Import-Kacheln unterscheiden Statuszeilen, Brutto-Pruefbasis, Ratenplan erkannt, Ratenplan mit Storno-Bezug, Ratenplan-Status, kritisch offen, Mahnstufen kritisch, ohne Schutz offen und nicht zuordenbar.
- Neuer `Pruefkorb Rechnungsstatus` unter dem Saldo-Upload mit sechs Kategorien fuer Praxis-Aufgaben.
- Saldo-Tabelle und Pruefkorb-Tabelle sind Scrolltabellen.
- `Matching & Neueinreichungen` steht vor `Klaerfaelle`.
- `Patientenklassifizierung` wurde als eigener Tab angelegt.
- Linke Desktop-Navigation bleibt beim Scrollen sichtbar.
- Endgueltig stornierte Klaerfaelle koennen manuell geklaert werden und verschwinden aus offenen Arbeitslisten/Neueinreichungsvorschlaegen.
- Abrechnungsimport-Vorschau wurde kompakter gemacht: `Import bestaetigen` sitzt oben im Uploadbereich, Import-Historie/Grundauswertung/Detailvorschau/Pruefkorb/Saldo-Listen sind einklappbar und starten im Tab standardmaessig eingeklappt. Die Tabellen scrollen intern nach wenigen Zeilen.
- Appweite Typografie-Skala vereinheitlicht.
- Doppelte Wertzeile unter Zusammenfassung-Diagrammtiteln entfernt; Werte stehen nur noch im Diagramm-Tooltip.
- Chart-Tooltips fuer Zusammenfassung-Kombi-/Dual-Axis-Charts.
- Storno-/Recovery-Chartlogik an KPI-Logik angepasst.
- Durchschnittlicher Wert je Forderung als KPI.
- Benchmark-Tabelle mit Kennzahlen je Standort: Umsatz, Monatsdurchschnitt, Forderungen, Durchschnittsforderung, Stornos, Stornoquote, gewandelt, ohne Schutz, Gebuehr, Signal.
- Super-Admin kann manuelle Fall-Erledigung wieder ausloesen.
- Mobile/Tablet KPI-Kacheln wurden verbessert.
- Antwort-Cockpit-Kacheln wurden auf Tablet besser verteilt.
- Zeitraumfilter starten standardmaessig auf 2026 YTD.
- Standort-/Content-Steuerung bleibt beim Scrollen besser erreichbar.
- Gebuehrenquote wird mit zwei Nachkommastellen gezeigt.
- Logo fuehrt ins Cockpit.
- Sparklines wurden in KPI-/Antwort-Kacheln eingefuehrt.

## Technische Qualitaet / Checks

Zuletzt bei Code-Aenderungen verwendet:

```bash
PATH="/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run typecheck
PATH="/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run lint
PATH="/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run build
PATH="/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm test
git diff --check
```

Wichtige offene technische Punkte:
- Basis-Tests sind vorhanden (`pnpm test`) und pruefen zentrale Kernlogik wie Import-Business-Identity, Dubletten und stabile Klaerfall-Schluessel. Die Abdeckung ist aber noch klein; echte End-to-End-/UI-/Importtests fehlen weiterhin.
- Besonders testwuerdig:
  - BFS-Rechnungsstatus-/Saldo-Listen gegen weitere echte Monatslisten
  - Pruefkorb Rechnungsstatus gegen mehrere Standorte und Monatswechsel
  - Persistenz des bestaetigten Saldo-Statusdatenstands in Supabase
  - Rueckwirkung bestaetigter Saldo-Statusdaten auf Klaerfaelle, KPI-Kacheln, Matching und operative Fallarbeit
  - Unterscheidung "offen bei BFS" vs. "echte Praxis-Aufgabe" in allen relevanten Sichten
  - Erkennung von Rechnungen, die in einer neuen Saldo-Liste fehlen: alt/erledigt, endgueltig storniert, ausgebucht, Nummernproblem oder falscher Standort
  - Rechnungs-PDF-Parser gegen weitere BFS-Rechnungen mit Eigenlabor/Fremdlabor und Sammelstrukturen
  - Speicherstrategie: PDF-Dateien spaeter bereinigen, extrahierte Daten behalten
  - Zusammenfassung-Tab PDF-Export in echten Browsern auf Desktop/Mobile
  - Zusammenfassung-Tab Standort-Export: Zielstandort klar, andere Standorte anonymisiert, Benchmark-Klarzahlen anderer Standorte nur als Indexwerte
  - Zusammenfassung-Tab Benchmark-Zeitraumfilter
  - Zusammenfassung-Tab Gesamtzeile und offene Storno-Summe gegen echte Importdaten
  - Storno-/Recovery-Zuordnung im Chart gegen echte Importdaten
  - Import
  - Rollenrechte
  - Standortleitungszugriff
  - manuell erledigte Klaerfaelle
  - Reset-Logik
  - Report-/PDF-Export
  - Storno-/Recovery-Entdoppelung
- Lint-Konfiguration war frueher kaputt/falsch angebunden. Typecheck und Build sind aktuell die verlaesslichen Checks.
- Importdaten duerfen nicht hart bei 5000 Dokumenten abgeschnitten werden, ohne sichtbar darauf hinzuweisen oder zu paginieren.
- Reset sollte Fehler-/Duplikat-/Zwischenstaende sauber mitraeumen.

## Naechste fachlich sinnvolle Schritte aus dem aktuellen Chat

Prioritaet 1: Saldo-Status persistent machen
- Bestaetigte Saldo-Uploads als Monatsdatenstand speichern.
- Pro Statusliste Datei-Metadaten speichern: Dateiname, Hash, Monat/Zeitraum, Uploadzeit, Zeilenanzahl, Standort/Mandant.
- Statuszeilen dauerhaft speichern, aber PDF-Speicher spaeter bereinigbar halten.

Prioritaet 2: Operative Fallarbeit automatisch beeinflussen
- Klaerfaelle gegen bestaetigte Saldo-Statusdaten pruefen.
- Nur RP als erledigt/aus operativer Arbeitsliste raus; Saldo 0 ohne RP bleibt bei Storno/Rueckgabe pruefpflichtig.
- Kritisch offen, Mahnstufe, ohne Schutz offen und nicht in Saldo-Liste gefunden in `Klaerfaelle` priorisieren.
- Pruefkorb soll Quelle/Begruendung der operativen Aufgabe bleiben.

Prioritaet 3: Monatsvergleich Statuslisten
- Wenn die Liste monatlich neu hochgeladen wird, Veraenderungen anzeigen:
  - neu offen
  - offen geblieben
  - bezahlt geworden
  - in RP gewechselt
  - Mahnstufe gestiegen
  - nicht mehr in Liste vorhanden
  - ausgebucht/storniert erkannt

Prioritaet 4: Rechnungsanalyse ausbauen
- Leistungsnummern je Standort ranken.
- Faktoren je Leistungsnummer/Standort vergleichen.
- Durchschnittsbetrag je Leistung und Standort.
- Eigenlabor/Fremdlabor getrennt auswerten.
- Behandlungszeitraeume/Positionen fuer Matching Neueinreichungen nutzen.

## Wenn ich als Geschaeftsfuehrer/Management weiterentwickeln wuerde

Die App ist funktional schon deutlich nutzbar, aber der groesste Mehrwert entsteht jetzt durch mehr Management-Visualisierung.

Prioritaet 1: Cockpit als echte Lagekarte
- 2026 YTD vs 2025 YTD
- aktueller Monat vs Vormonat
- aktuelles Quartal vs Vorquartal/Vorjahresquartal
- eingereicht, Auszahlung, BFS-Kosten, Gebuehrenquote, Stornoquote, offene Faelle, Risikobestand
- Ampel: gut / beobachten / pruefen

Prioritaet 2: Standortentwicklung statt nur Standortliste
- je Standort Monatslinie: Eingang, Gebuehrenquote, Stornoquote, offene Faelle
- Abweichung vom Gruppenschnitt
- Ranking nach Risiko/Kosten/Wachstum
- klare Handlung: "Kehl pruefen wegen offener Faelle", "Essen Gebuehrenquote beobachten", etc.

Prioritaet 3: Patientenqualitaet als Managementsicht
- Anteil A/B/C/D
- Anteil ohne Ausfallschutz
- Anteil ohne Ausfallschutz mit echter Nichtzahlung/Rueckgabe/Storno
- Wiederholer je Standort
- Top-Risikopatienten fuer operative Fallarbeit

Prioritaet 4: Operative Arbeit sauber getrennt halten
- Klaerfaelle als Arbeitsliste/Kanban
- Jede Fallentscheidung persistent und importuebergreifend
- Reports fuer Standortleitung auf Knopfdruck
- Tabellen immer kompakt, scrollbar, exportierbar

Kurz: Die App soll im ersten Blick Entwicklung, Vergleich und Handlungsbedarf zeigen. Die Detailtabelle ist Beleg und Arbeitswerkzeug, nicht die Hauptgeschichte.

## Update 2026-06-29: Operative BFS-Logik nach Saldo-Abgleich

- Fachliche Logikstrecke ist jetzt: Umsatz eingereicht -> BFS-Kosten -> Umsatz ausgezahlt -> davon ohne Ausfallschutz -> Brutto Storno/Rueckgabe -> weiterer Status.
- Saldo 0 bei BFS bedeutet nur: der BFS-Saldo ist geschlossen. Es bedeutet nicht automatisch, dass die Praxis wirtschaftlich Geld bekommen hat.
- Operative Fallarbeit ist deshalb getrennt:
  - Praxis nachfassen: Rueckgaben ohne Ausfallschutz und echte Praxis-Aufgaben. Diese Faelle bleiben aktiv, auch wenn BFS-Saldo 0 ist.
  - Zahlung / Grund pruefen: saldobereinigte Storno-/Rueckgabefaelle, bei denen Zahlung, Neueinreichung oder Storno-Grund wirtschaftlich belegt werden muss.
  - Neueinreichung / Matching: echte Ersatz-/Neueinreichungen, die Brutto-Stornos als zurueckgeholt/gewandelt erklaeren.
- Erledigt braucht keinen eigenen Haupttab. Erledigungen bleiben Status/Filter/Historie.
- Navigation wurde entsprechend angepasst; die alte interne `cases`-Route bleibt nur als Rueckwaertskompatibilitaet und zeigt fachlich `Praxis nachfassen`.
- `Zahlung / Grund pruefen` wird aus dem Saldo-Pruefkorb gespeist und hat eigene Standort-/Zeitraumfilter sowie Summen, damit wirtschaftlich offene Belegfaelle sichtbar bleiben.

## Update 2026-06-29: Logik durch BFS-Abrechnungen gezogen

- Der Hauptbereich `BFS-Abrechnungen` wurde auf die neue Logikstrecke umgestellt. `BFS-Rechnungsanalyse` bleibt fachlich getrennt und wurde nicht in die Storno-/Saldo-Logik hineingezogen.
- Sichtbare Kacheln und Fallback-Infotexte nutzen jetzt die neue Sprache:
  - `Brutto Storno/Rueckgabe` = Ausgangsmenge aus Rueckgaben, Ruecklaeufern und Stornos.
  - `Davon zurueckgeholt` = echte Neueinreichung/Ersatzrechnung oder wirtschaftlich belegte Zahlung.
  - `Bezahlt` = belegte Zahlung/manuelle Zahlungsklaerung, nicht automatisch Saldo 0.
  - `Zahlung / Grund pruefen` = BFS geschlossen, wirtschaftlicher Beleg fehlt.
  - `Praxis nachfassen` = echte Praxis-Aufgabe, vor allem Rueckgabe ohne Ausfallschutz.
- Management Cockpit, Standort-Dashboard, Zusammenfassung, Standort-Benchmark, Forderungen/Geldfluss, Forderungsqualitaet, Massnahmenkontrolle, Report-Center, Standort-Navigation und Startseite wurden sprachlich/logisch angepasst.
- Standort- und Report-Zaehler fuer offene operative Arbeit zaehlen jetzt nur noch Praxis-Nachfassfaelle. Saldogeschlossene Belegfaelle laufen separat in `Zahlung / Grund pruefen`.
- Saldo-Import-Kacheln wurden umbenannt: `BFS geschlossen` und `Status BFS geschlossen` zeigen nur BFS-Status, nicht automatisch wirtschaftliche Zahlung. `Zahlung/Grund pruefen` weist saldobereinigte Storno-/Rueckgabefaelle separat aus.
- Generische `i`-Infotexte erklaeren jetzt die Unterscheidung zwischen Brutto-Abzug, zurueckgeholt/bezahlt, wirtschaftlich pruefen und Praxis-Nachfassen.

## Update 2026-06-29: Objektiver Upload-Gegencheck

- Gegencheck gegen die echten Ordner `1. Abrechnungen` und `2. Saldolisten`:
  - Saldolisten: 5 PDFs, 14.428 Rechnungsstatus-Zeilen, 5 von 6 Standorten erkannt. Kassel fehlt erwartbar, weil keine Saldoliste mitgeliefert wurde.
  - Abrechnungen: 839 PDFs auf Platte, nach fachlicher Dublettenlogik 837 importfaehige Abrechnungsnachweise, 0 zu pruefen.
  - 2026 gesamt aus dem Import: 1.687.113 EUR eingereicht, 1.609.085 EUR Auszahlung, 45.276 EUR BFS-Gebuehren, 38.047 EUR netto, 7.234 EUR MwSt inkl. EWMA-Steuer, 29 EUR EWMA, 5.804 Rechnungs-/Patientenpositionen.
- Fachlicher Randfall gefunden und korrigiert: `Rueckgabe lt. RA-Liste` wurde als echte Rueckgabe erkannt, hatte aber keine eigene Kategorie. Parser fuehrt diese Bewegungen jetzt als `ra_liste`.
- Summenbasis `summarizeImportRows` zaehlt echte Storno-/Rueckgabe-/Rueckbelastungsbewegungen jetzt auch dann, wenn die Bemerkung keine Kategorie bekommen hat. Dadurch bleiben Brutto Storno/Rueckgabe, Storno-Grundmenge, offener Abzug und CashFlow-Herleitung auf derselben fachlichen Basis.

## Update 2026-06-29: Appweite Abzugslogik vereinheitlicht

- Die Definition fuer relevante Storno-/Rueckgabe-Bewegungen wurde appweit zentralisiert:
  - echte Kategorie vorhanden und nicht `regulierung`/`abrechnungsumsatz`;
  - oder strukturell erkennbar als Storno, Rueckgabe oder Rueckbelastung, auch wenn keine Kategorie erkannt wurde.
- Diese Logik wird jetzt nicht nur in den Cockpit-Kacheln genutzt, sondern auch in:
  - operativen Faellen/Praxis-Nachfassen,
  - Risikoprofilen und Patientenqualitaet,
  - Neueinreichungs-/Matching-Logik,
  - Outcome- und offene Bewegungen-Auswertungen,
  - Import-Center-Vorschau und Import-Bestaetigungszahlen,
  - Grund-/Bewegungsaggregation in Tabellen und Reports.
- Direktzahlungen bleiben wirtschaftlich relevante Bewegungen, werden aber nicht als offene Praxis-Nachfassaufgabe gefuehrt.

## Update 2026-06-29: Zahlung/Grund pruefen als echte Arbeitsliste

- Der Tab `Zahlung / Grund pruefen` ist nicht mehr nur eine Anzeige.
- Jede Zeile kann jetzt direkt abgeschlossen werden:
  - `Bezahlt / geklaert` fuer wirtschaftlich belegte Zahlung oder geklaerten Grund mit echtem Zahlungsausgleich.
  - `Neu eingereicht` fuer Ersatzrechnung ohne zusaetzlichen Geldzufluss.
  - `Endgueltig storniert` fuer bewusst als Verlust/Endstorno entschiedene Faelle.
- Die Zeilen nutzen dieselbe persistente Fallentscheidungslogik wie `Praxis nachfassen` und `Neueinreichung Matching`.
- Bereits entschiedene Zahlung/Grund-Zeilen werden aus dem Prueftopf ausgeblendet und fliessen in die bestehenden Rueckhol-/Endstorno-Auswertungen.

## Update 2026-06-29: Filter in operativer Fallarbeit

- Die operativen Reiter `Praxis nachfassen`, `Zahlung / Grund pruefen` und `Neueinreichung / Matching` haben jetzt konsistente Standort-, Zeitraum- und Suchfilter.
- Die Suchfelder sind nicht mehr nur optisch: Patient, Standort, Rechnungsnummer, BFS-Nr., Betrag, Grund/Status und relevante Abrechnungs-/Datumsfelder filtern die jeweilige Tabelle wirklich.
- Kacheln, Tab-Auswertung, Summen, Charts und PDF-Export im operativen Bereich basieren auf den gefilterten Zeilen.
- Operative Betraege werden in Arbeitslisten, Entscheidungsdialogen und Exporten centgenau angezeigt. Management-Kacheln bleiben fuer schnelle Uebersicht weiterhin grob lesbar.
- Alle drei operativen Tabs haben einen filtergebundenen PDF-/Druckexport im A4-Querformat mit kompakter Zusammenfassung und druckbarer Arbeitsliste.

## Update 2026-06-29: BFS-Einzelrechnung BEMA/Festzuschuss

- Einzelrechnungen wie `Rechnung_5-18504-73794150.pdf` enthalten BEMA/Festzuschuss und Eigenlabor, aber keine GOZ-Faktorpositionen.
- Der Rechnungsparser akzeptiert solche Rechnungen jetzt als sauber erkannte Belege, sobald Kopf, Betrag und BEMA/Labor-Bestandteile erkannt sind. Sie werden nicht mehr nur wegen fehlender GOZ-Faktorpositionen auf `Zu pruefen` gesetzt.
- Die Importvorschau zeigt bei diesen Belegen `BEMA`, `Labor` oder `BEMA + Labor` statt irrefuehrend `0` Positionen. Die eigentliche Leistungsuebersicht/Potenzialanalyse bleibt davon getrennt und wertet weiterhin nur echte Faktorpositionen aus.

## Update 2026-06-29: Prueflisten-Export fuer Praxisausdruck

- PDF-/Druckexport und CSV der offenen Pruefliste enthalten am Ende keine technischen Spalten `Wiedervorlage` und `AbrechnungsNr` mehr.
- Stattdessen gibt es zwei manuelle Bearbeitungsspalten: `Kommentar` und `Wenn storniert: in der Praxissoftware ausgebucht?`.

## Update 2026-06-29: Leistungsnummer vs. Zahnregion

- In der BFS-Rechnungsanalyse wurde die Leistungsnummer-Erkennung verbessert: zweistellige Region-/Zahnangaben wie `36`, `25` oder `37` werden nicht mehr als GOZ-/GOAe-Abrechnungsnummer genutzt, wenn danach eine echte Leistungsnummer wie `2180`, `5070`, `4030` oder `Ae1` folgt.
- Die Tabelle `Leistungsuebersicht` zeigt damit in `Leistungsnr.` die fachlich relevante Leistungsnummer; Zahn/Region bleibt intern als Region an der Position erhalten.
- Gegencheck mit 66 PDFs aus `3. Einzel-Rechnungen_BFS`: 0 Parser-Statusfehler und 0 verbliebene auffaellige Faelle, in denen zweistellige Zahn-/Regionnummern vor einer echten Leistungsnummer als Leistungscode gruppiert wurden.

## Update 2026-06-29: Zusammenfassung-Kacheln und Zurueckbutton

- Im Tab `Zusammenfassung` sind die KPI-Kacheln auf Desktop jetzt als 5 Kacheln in der oberen Reihe und 4 Kacheln in der unteren Reihe angeordnet.
- Bei kleineren Desktop-/Tablet-Breiten fallen die Zusammenfassung-Kacheln kontrolliert auf 3 Spalten zurueck; mobil bleibt die einspaltige Darstellung.
- Der globale Zurueckbutton oben rechts im App-Header wurde entfernt. Die vorhandene schwebende Zurueck-Navigation unten links bleibt appweit erhalten.
- Geprueft: `pnpm run typecheck`, `pnpm run build`, `git diff --check`.

## Update 2026-06-29: Zusammenfassung-Diagramme auf neue KPI-Logik umgestellt

- Die alten Diagramme `Forderungen vs. Stornierungen` und `Stornierungen vs. zurueckgeholt` waren fachlich nicht mehr fuehrend, weil sie noch stark mit Fallanzahlen/Storno-Zaehlern arbeiteten.
- Sie wurden im Tab `Zusammenfassung` durch Diagramme nach neuer KPI-Logik ersetzt:
  - `Eingereicht vs. Brutto Storno/Rueckgabe`
  - `Brutto-Abzug vs. bereits geklaert`
- Die Monatsdaten fuehren jetzt zusaetzlich `grossDeductionAmount`, `recoveredAmount` und `finalLostAmount`, damit Diagramme und Sparklines mit Betragslogik statt alter Stueckzahl-Logik arbeiten.
- Die Kachel-Sparklines fuer `Brutto Storno/Rueckgabe` und `Bereits geklaert` nutzen jetzt die passenden Betragsfelder.

## Update 2026-06-29: Benchmark-Tabelle auf neue Abzugslogik umgestellt

- Die Benchmark-Tabelle im Tab `Zusammenfassung` nutzt nicht mehr die alten Spalten `Stornos`, `Stornoquote` und `gewandelt`.
- Neue fuehrende Spalten sind `Brutto-Abzug`, `Offene Pruefsumme` und `bereits geklaert`.
- Die Standortzeilen verwenden dieselbe Formel wie die KPI-Kacheln: `Offene Pruefsumme = Brutto Storno/Rueckgabe - Bereits geklaert - Endgueltig verloren`.
- `Bereits geklaert` ist als Betrag relativ zum Brutto-Abzug dargestellt; `Offene Pruefsumme` als Betrag relativ zum eingereichten Umsatz.
- Das Benchmark-Signal bewertet jetzt offene Pruefsumme, Ohne-Schutz-Anteil und Gebuehrenquote statt alter Storno-Stueckzahlquoten.

## Update 2026-06-29: Management-KPI-Reihen gleich breit

- Die KPI-Kacheln im `Management Cockpit` nutzen auf breitem Desktop ein 20-Spalten-Grid.
- Obere Reihe: 5 Kacheln mit je 4 Spalten. Untere Reihe: 4 Kacheln mit je 5 Spalten.
- Dadurch ist die untere KPI-Reihe real gleichmaessig ueber die volle Breite verteilt, statt rechts eine leere Fuenfergrid-Spalte stehen zu lassen.
- Unterhalb der breiten Desktop-Ansicht greifen weiter die bestehenden 3-/2-/1-Spalten-Regeln.

## Update 2026-06-29: Management-Diagramme dezenter

- Die Management-Cockpit-Diagramme zeigen Tooltips nicht mehr dauerhaft, sondern nur noch bei Hover/Fokus/Klick auf einen Datenpunkt.
- Tooltips wurden kompakter und ruhiger gestaltet: kleinerer Wert, weniger Rahmenkontrast, dezenter Hintergrund, kuerzere Vorjahreszeile.
- Legenden, Achsenlabels, Delta-Badge, Linienpunkte und aktive Balken-Glows wurden visuell reduziert, damit die Diagramme weniger laut wirken.
- Lokale Sichtpruefung wurde versucht; `/dashboard` leitet lokal ohne aktive Sitzung auf `/login` weiter. Technische Pruefung bleibt ueber Typecheck/Build.

## Update 2026-06-29: Lage-und-Entwicklung-Panel desktopkompatibel

- Das Panel `Lage & Entwicklung` im Management Cockpit nutzt auf Desktop jetzt die volle Breite statt in einer linken Halbspalte zu stehen.
- Innerhalb des Panels stehen Text/Einordnung links und die sechs Kennzahlen rechts in einem gleichmaessigen Dreierschema.
- KPI-Werte im Panel skalieren defensiver und brechen sauber um, damit grosse Eurobetraege nicht aus der Karte laufen.
- Auf Tablet/Mobile faellt das Panel wieder auf eine einspaltige Darstellung zurueck.

## Update 2026-06-29: Standortkarten-Vorjahrsvergleich korrigiert

- Die Standort-Benchmark-Karten waren fachlich bereits auf die neue Logik umgestellt: `Brutto Storno/Rueckgabe`, `Bereits geklaert`, `Offene Pruefsumme`, `Endgueltig verloren`, `Pruefliste`.
- Korrigiert wurde die Vorjahrszeile: Wenn der Vorjahreswert 0 ist, wird nicht mehr irrefuehrend `+100,0 %` angezeigt, sondern `Vergleich startet`.
- Der Infotext fuer `Auffaelligster Standort` nennt jetzt ausdruecklich offene Pruefsumme, Ohne-Ausfallschutz-Risiko, Prueflistenalter und Volumen statt alter offener-Prueflisten-Sprache.

## Update 2026-06-29: Schnellantworten auf neue Abzugslogik umgestellt

- Im Tab `Schnellantworten` wurden die Kacheln `Brutto Storno/Rueckgabe`, `Bereits geklaert` und `Offene Pruefsumme` auf die zentrale Betragslogik umgestellt.
- `Brutto Storno/Rueckgabe` zeigt jetzt den Brutto-Abzugsbetrag statt einer reinen Storno-Zeilenanzahl.
- `Bereits geklaert` zeigt jetzt den geklaerten Betrag und die Quote vom Brutto-Abzug statt `gewandelt`/Stueckzahl.
- `Offene Pruefsumme` kommt aus `Brutto Storno/Rueckgabe - Bereits geklaert - Endgueltig verloren`; die Fallanzahl bleibt nur als Hinweis auf die operative Pruefliste.
- Die Schnellantwort-Sparklines nutzen jetzt `deductionAmount`, `recoveryRate` und `openAmount`; fehlende Vorjahreswerte werden als `VJ startet` gezeigt.

## Update 2026-06-29: Standort-Benchmark aus Management Cockpit entfernt

- Der komplette Standort-Benchmark-Block wurde aus dem `Management Cockpit` entfernt, inklusive eigenem Zeitraumfilter, `Vollansicht`-Button und Standortkarten.
- Hintergrund: Der Inhalt existiert bereits im eigenen Bereich `Standorte`/Standort-Benchmark und soll im Cockpit nicht doppelt erscheinen.
- Das Management Cockpit fokussiert damit auf Filter, KPI-Kacheln, Diagramme und `Lage & Entwicklung`.
- Der separate Standort-Bereich und die dortige Standortkartenlogik bleiben unveraendert erhalten.

## Update 2026-06-29: Standortdetails-KPI-Block desktopkompatibel

- Der KPI-Block in `Standortdetails`/Detailsicht wurde auf Desktop auf 9 Kacheln reduziert und als 5 oben / 4 unten angeordnet.
- Die alte separate `Stornoquote`-Kachel wurde entfernt, weil die fuehrende Logik ueber Brutto Storno/Rueckgabe, Gesamtabzug und die nachgelagerten Abzugs-/Recovery-Bloecke laeuft.
- Technisch nutzt nur dieser Block ein eigenes 20-Spalten-Grid; andere `priority-grid`-Bereiche bleiben unveraendert.
- Unterhalb breiter Desktopansichten greifen weiter die bestehenden 3-/2-/1-Spalten-Regeln.

## Update 2026-06-29: Forderungen und Geldfluss auf neue Abzugslogik geprueft

- Der Tab `Forderungen und Geldfluss` nutzt bereits die zentrale Funktion `buildDeductionRecovery`.
- Damit gilt dort dieselbe Formel wie in Zusammenfassung, Benchmark und Schnellantworten: `Offene Pruefsumme = Brutto Storno/Rueckgabe - Bereits geklaert - Endgueltig verloren`.
- `Bereits geklaert` wird aus echter Neueinreichung/Ersatzrechnung, Ratenplan laut BFS oder manuell belegter Zahlung/Klaerung gebildet; `Saldo 0` allein bleibt kein Zahlungsnachweis.
- Alte Oberflaechenbegriffe wie `zurueckgeholt`/`Wiedereinholung` wurden im Tab durch `bereits geklaert`/`Klaerung` ersetzt, damit Beschriftung und neue KPI-Logik zusammenpassen.

## Update 2026-06-29: Ohne-Schutz-Patienten-Aufteilung geschlossen

- Im Block `Zahlungsstatus ohne Schutz` wird die Grundgesamtheit der Ohne-Schutz-Patienten jetzt sichtbar vollstaendig aufgeteilt.
- Neben `Davon nicht gezahlt` und `Bisher unauffaellig` gibt es eine eigene Kachel `Davon geklaert`.
- Damit ist die Summe nachvollziehbar: `nicht gezahlt + geklaert + bisher unauffaellig = Ohne-Schutz-Patienten`.
- Das Grid dieses Blocks nutzt auf breitem Desktop fuenf gleichwertige Spalten.

## Update 2026-06-29: Storno-Quercheck mit Gesamtfallquote

- Die Kachel `Stornos gesamt` im Storno-Quercheck zeigt jetzt zusaetzlich die Quote der Storno-Zeilen an allen eingereichten Gesamtfaellen im gewaehlten Filter.
- Berechnung: `Stornoquote = erkannte Storno-Zeilen / eingereichte Gesamtfaelle`.
- Die Standortkarten im Quercheck zeigen ebenfalls diese Stornoquote je Standort.
- Alte Formulierung `zurueckgeholt/bezahlt` wurde im Quercheck zu `bereits geklaert` vereinheitlicht.

## Update 2026-06-29: Pruefliste rein operativ

- Die Ansicht `Pruefliste offene Faelle` zeigt keine Auswertungs-KPI-Kacheln und keine Diagramme mehr.
- Entfernt wurden `Tab-Auswertung`, `Offener Betrag gesamt`, `Offene Faelle`, `Aeltester Fall`, `Hoechste Einzelposition`, `Offener Betrag je Standort` und `Fallgruende`.
- Die Ansicht startet nach Standort-/Zeitraum-/Suchfilter direkt mit der Arbeitsliste und dem PDF-Export.
- Ziel: Die Pruefliste bleibt eine reine operative Abarbeitungsliste; Auswertungen bleiben in den Analyse-/Cockpit-Bereichen.

## Update 2026-06-29: Leistungsuebersicht Tabellenkopf desktopkompatibel

- Die Tabellenkopfzeile der `Leistungsuebersicht` wurde fuer Desktop stabilisiert.
- Problematische Header wie Leistungsnummer, Haeufigkeit und Gruppenschnitt brechen nicht mehr mitten im Wort um.
- Die Leistungsuebersicht nutzt jetzt eigene Tabellen-Spaltenbreiten und eine groessere Mindestbreite mit horizontalem Scroll bei kleineren Viewports.
- Die Inhalte und Berechnungen der Leistungsuebersicht bleiben unveraendert.

## Update 2026-06-29: Leistungsuebersicht mit KPI-Kacheln

- Oberhalb der Tabelle `Leistungsuebersicht` gibt es jetzt sechs KPI-Kacheln.
- Kacheln: haeufigste Position inkl. Durchschnittsfaktor, Standort mit hoechstem Durchschnittsfaktor, Standort mit niedrigstem Durchschnittsfaktor, umsatzstaerkste Position, groesste Faktorstreuung und Leistungsvielfalt.
- Die KPI-Kacheln folgen dem gewaehlten Zeitraum- und Standortfilter.
- Layout: 3 Spalten auf Desktop, damit die sechs Kacheln als ruhiger 3x2-Block lesbar bleiben.

## Update 2026-06-29: Potenzialanalyse Top-Hebel erklaert

- Die Kachel `Top-Hebel` in der Potenzialanalyse zeigt den Eurobetrag jetzt explizit als `Potenzial`.
- Der Hint nennt zusaetzlich eigenen Durchschnittsfaktor und Gruppenschnitt-Faktor.
- Der Info-Text nennt die konkrete Abrechnungsposition/Kurzbeschreibung und erklaert, dass der Eurobetrag der geschaetzte Mehrumsatz bei Erreichen des Gruppenschnitts ist.

## Update 2026-06-29: Potenzialanalyse um weitere KPI-Kacheln erweitert

- Die Potenzialanalyse zeigt zusaetzlich `Potenzial p. Jahr`, `Betroffener Umsatz` und `Groesste Faktor-Luecke`.
- `Potenzial p. Jahr` rechnet das Zeitraum-Potenzial auf Jahresniveau hoch.
- `Betroffener Umsatz` zeigt den heutigen Ist-Umsatz der Positionen unter Benchmark.
- `Groesste Faktor-Luecke` zeigt die Leistungsnummer mit der groessten negativen Faktorabweichung zum Gruppenschnitt, unabhaengig vom Euro-Potenzial.

## Update 2026-06-30: Neueinreichung fachlich von Zahlung getrennt

- In der operativen Pruefliste gibt es neben `Bezahlt / geklaert` und `Endgueltig storniert` jetzt den eigenen Abschluss `Neu eingereicht`.
- `Neu eingereicht` entfernt den Fall aus der Pruefliste und zaehlt als `Bereits geklaert`, weil die offene Pruefsumme dadurch erledigt ist.
- In der Umsatz-/Cashflow-Herleitung zaehlt `Neu eingereicht` aber nicht als zusaetzlicher Geldzufluss. Eine Ersatzrechnung ersetzt die alte Forderung; sie darf keinen Doppelumsatz erzeugen.
- Die zentrale Abzugslogik trennt deshalb `replacementAmount`/Neueinreichung von `cashRecoveredAmount`/echter Zahlung bzw. Ratenplan.
- Der Cashflow-Wasserfall addiert nur noch echte Zahlung/Ratenplan als positiven Ausgleich; Neueinreichungen reduzieren offen, erscheinen aber nicht als Cash-Plus.

## Update 2026-06-30: Pruefliste mobil und sortierbar

- Die `Pruefliste offene Faelle` hat jetzt sortierbare Tabellenkoepfe fuer Ampel, Datum, Patient, Rechnung, BFS-Nr., Betrag, Alter und Wiedervorlage.
- Zusaetzlich gibt es eine kompakte Sortierauswahl fuer Name, Standort, Datum, Betrag und Alter auf-/absteigend.
- Auf Mobilgeraeten wird die breite Tabelle durch lesbare Fallkarten mit denselben operativen Aktionen ersetzt.
- Oberhalb der Arbeitsliste stehen drei KPI-Kacheln: Anzahl Prueffaelle, Wert Prueffaelle und Standort mit den meisten Prueffaellen.

## Update 2026-06-30: Import Center ergaenzt Monatsuploads statt Bestand zu ersetzen

- Im BFS-Abrechnungs-Sammelimport ergaenzen `Dateien auswaehlen` und `Ordner inkl. Unterordner` jetzt standardmaessig den bestehenden Datenstand.
- Beim Upload wird der gespeicherte Bestand vor dem Zusammenfuehren erneut geladen, damit ein neuer Monat nicht versehentlich nur als neuer Einzelbestand gespeichert wird.
- Gleiche Abrechnungen werden ueber Hash und fachliche Identitaet erkannt und serverseitig aktualisiert/ersetzt; neue Monate werden on top uebernommen.
- Komplettes Loeschen erfolgt nur noch ueber `Upload zuruecksetzen`.
- Im Rechnungsimport wird vor dem Bestaetigen ebenfalls der gespeicherte Bestand geladen und mit der neuen Vorschau zusammengefuehrt; gleiche Rechnungen werden serverseitig ersetzt statt doppelt angelegt.
- Saldo-/Rechnungsstatus-Listen folgen derselben Regel: neue Listen ergaenzen den bestaetigten Bestand, gleiche Listen ersetzen die vorhandene Version ueber Datei-Hash/Dateiidentitaet; `Saldo-Import zuruecksetzen` ist die einzige Loeschaktion.
- Die Regel gilt appweit fuer Uploads: Upload = ergaenzen/aktualisieren, Reset = loeschen.

## Update 2026-06-30: Einzelrechnungsimport fuer grosse Mengen skaliert

- Der Einzelrechnungsimport nutzt groessere Pakete fuer viele kleine Rechnungs-PDFs: bis 40 Dateien bzw. ca. 24 MB pro Parse-Paket.
- Wenn ein Paket serverseitig zu gross ist oder scheitert, wird es automatisch halbiert und erneut verarbeitet.
- Auch das Bestaetigen/Speichern der erkannten Rechnungen wird in kleinere JSON-Pakete zerlegt, damit mehrere tausend Rechnungen nicht an Request-Groessen scheitern.
- BFS-Monatsabrechnungen behalten die vorsichtigere Paketgroesse, weil diese PDFs deutlich groesser und parserlastiger sein koennen.

## Update 2026-06-30: Security-Hardening gegen externe Angriffe

- Live-Supabase-Projekt `BFS_Mandatenuebersicht` (`dozcaktodvogbkiomcqo`) geprueft:
  - fachliche Public-Tabellen haben RLS aktiv;
  - Bucket `bfs-documents` ist privat;
  - API-Routen fuer Imports/Admin nutzen serverseitig den Service-Role-Key, sind aber durch `getRequestProfile()` bzw. `requireSuperAdmin()` geschuetzt.
- Supabase Security Advisors meldeten:
  - mutable `search_path` bei Funktionen;
  - `handle_new_auth_user()` als direkt ausfuehrbare `SECURITY DEFINER`-Funktion;
  - leaked-password protection in Supabase Auth deaktiviert.
- Migration `010_security_hardening.sql` behebt die DB-seitigen Punkte:
  - feste `search_path` fuer `set_updated_at`, `is_super_admin`, `can_access_standort`, `audit_case_status_change`, `handle_new_auth_user`;
  - `revoke execute` fuer `handle_new_auth_user()` von `public`, `anon`, `authenticated`;
  - korrigierte Standort-Select-Policy fuer Standortleitungen.
- `next.config.mjs` setzt Security Header: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- Weiterer Pflichtpunkt vor Produktivbetrieb mit echten Patientendaten: Supabase Auth `Leaked Password Protection` in der Supabase-Konsole aktivieren; das ist keine Repo-Aenderung.

## Update 2026-06-30: Kallweit Praxissoftware-Sammeldruck geprueft

- Datei geprueft: `/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS/1. Rechnung_Kallweit/Kallweit_Rechnungsexport.pdf`.
- PDF-Metadaten: 756 A4-Seiten, DynaPDF, ca. 35,9 MB, nicht verschluesselt.
- Normale Textextraktion mit `pdfplumber` liefert 0 Zeichen auf den ersten Seiten. Der Sammeldruck ist damit fuer die App praktisch ein Bild-PDF, nicht wie die bisherigen BFS-Rechnungen ein direkt textlesbarer Beleg.
- Visuelle Stichproben zeigen zwei relevante Layoutvarianten:
  - klassische Patientenrechnung mit Kopf, Rechnungsnummer, Patient, Rechnungsdatum, Betrag, Leistungszeilen und Fusszeile `Seite x von y`;
  - technische Praxissoftware-Ansicht `Privatrechnung (ohne Anlagen)` mit Rechnungsempfaenger, Patientennummer, Versicherungsdaten, Rechnungsdaten, Leistungsdaten, Rechnungstexte und Betrag.
- Mehrseiten-Rechnungen sind erkennbar ueber `Seite 1 von 2`, `Seite 2 von 2` usw. Der Import darf deshalb nicht jede PDF-Seite als eigene Rechnung behandeln, sondern muss Seiten zu einem Rechnungsbeleg gruppieren.
- Inhaltlich bleibt die Rechnungsanalyse gleich: Standort/Praxis, Rechnungsnummer, Patient, Datum, Betrag, Leistungsnummer, Bezeichnung, Region/Zahn, Faktor, Anzahl und Positionsbetrag.
- Technisch braucht dieser Importpfad entweder OCR fuer Bild-PDFs oder, falls aus der Praxissoftware moeglich, einen strukturierten Export statt Sammeldruck. Ohne OCR kann die bestehende PDF-Textparserlogik diese Datei nicht automatisch auslesen.

## Update 2026-06-30: Praxissoftware-PDF-Importpfad vorbereitet

- Im `Import-Center Rechnungen` gibt es zusaetzlich zum BFS-Rechnungsupload einen zweiten Uploadbereich `Praxissoftware-Sammel-PDF einreichen`.
- Vor dem Praxissoftware-Upload wird die Praxis/der Standort explizit ausgewaehlt. Dadurch koennen PDF-Exporte ohne BFS-Mandantennummer fachlich korrekt zugeordnet werden.
- Der API-Endpunkt `/api/invoices/parse` unterscheidet jetzt `bfs_invoice_pdf` und `practice_software_pdf`.
- Neuer Parserpfad `parsePracticeSoftwareInvoicePdfBytes`:
  - versucht zuerst normalen eingebetteten PDF-Text zu lesen;
  - erkennt Bild-PDFs ohne Text und erzeugt einen sauberen Vorschau-Eintrag mit `ocrStatus: required`;
  - markiert Quelle, Seitenzahl, Praxis und Hinweis `OCR erforderlich`, statt falsche Rechnungspositionen zu erzeugen;
  - kann bei textlesbaren Praxissoftware-PDFs einfache Rechnungsdaten-/Leistungsdaten-Bloecke auslesen und Faktoren mit 3 oder 4 Nachkommastellen erkennen.
- Solange Praxissoftware-Bild-PDFs `OCR erforderlich` sind, ist `Rechnungsimport bestaetigen` gesperrt. Diese Dateien duerfen erst nach echter OCR-Aufteilung in Rechnungen/Positionen in den dauerhaften Rechnungsbestand laufen.
- Persistenz wurde vorbereitet: Fuer echte, ausgelesene Praxissoftware-Rechnungen ohne BFS-Nr. wird intern ein stabiler Schluessel `PRACTICE-{standortId}-{invoiceNo}` genutzt; in der UI bleibt die BFS-Nr. bei Praxissoftware-Belegen sichtbar getrennt.
- Geprueft: `pnpm run typecheck`, `pnpm test`, `pnpm run build`, `git diff --check`.

## Update 2026-06-30: Kallweit April-Praxisexport geprueft

- Datei geprueft: `/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS/1. Rechnung_Kallweit/2026/04/Rechnungsexport_04_2026.pdf`.
- PDF-Metadaten: 187 A4-Seiten, DynaPDF, ca. 8,0 MB, nicht verschluesselt.
- Auch dieser kleinere Monatsauszug enthaelt keinen eingebetteten Text; `pdfplumber` liefert auf den ersten zehn Seiten 0 Zeichen.
- Visuelle Stichproben bestaetigen die klassische Kallweit-Rechnungskopie mit Rechnungsnummer, Rechnungsdatum, Patient, Geburtsdatum, Betrag, Leistungszeile und Fusszeile `Seite x von y`.
- Beispiele aus der Sichtpruefung: `20260001` und `20260002` vom 07.04.2026, Andreas Oschatz, je 127,44 EUR; `20260003` vom 08.04.2026, Gerlinde Moeckel, 118,00 EUR; `20260038` vom 16.04.2026, Martina Barisch, 75,52 EUR; `20260127` vom 29.04.2026, Heidi Mueller, 127,44 EUR.
- Lokal verfuegbare OCR-Tools wurden geprueft: `tesseract` und `ocrmypdf` sind nicht installiert; Apple Vision lieferte in dieser Umgebung keine OCR-Ergebnisse. Fuer echtes maschinelles Auslesen muss daher als naechster Schritt Tesseract/OCRmyPDF oder ein anderer OCR-Dienst eingebunden werden.

## Update 2026-06-30: Browser-OCR fuer Praxissoftware-PDFs eingebaut

- Der Praxissoftware-Sammel-PDF-Upload liest Bild-PDFs jetzt direkt im Browser per `tesseract.js` aus. Dadurch funktioniert der Upload nicht nur auf dem Mac, sondern auch auf anderen PCs, solange die Web-App im Browser erreichbar ist.
- OCR-Assets werden in der App unter `public/ocr` mitgeliefert: Tesseract Worker, Tesseract-Core/WASM und deutsche Sprachdaten `deu.traineddata.gz`. Dadurch braucht der Praxis-PC keine lokale Tesseract-/OCR-Installation.
- `public/ocr/**` ist in ESLint ignoriert, weil dort minifizierte Drittanbieter-Worker/WASM-Wrapper als statische Assets liegen.
- Ablauf im Browser:
  - PDF-Datei wird lokal im Browser gerendert;
  - jede Seite wird per OCR mit deutscher Sprache gelesen;
  - der erkannte Text wird in Rechnungsbloecke ueberfuehrt;
  - Rechnungsnummer, Rechnungsdatum, Patient, Geburtsdatum, Rechnungsbetrag und Leistungszeilen werden extrahiert;
  - Leistungszeilen liefern Datum, Region/Zahn, Gebuehrennummer, Beschreibung, Faktor, Anzahl und EUR-Betrag fuer die bestehende Rechnungsanalyse.
- Die bestehende serverseitige BFS-Rechnungs-PDF-Logik bleibt unveraendert. Nur `practice_software_pdf` nutzt die neue Browser-OCR-Schicht.
- Kallweit-OCR-Probe gegen Seite 1 aus `Rechnungsexport_04_2026.pdf`: Tesseract erkennt u. a. `Rechnungsnummer: 20260001`, `Rechnungsdatum: 07.04.2026`, `Behandelte Person: Andreas Oschatz`, `Rechnungsbetrag: 127,44` und die Leistungszeile `1040 Professionelle Zahnreinigung`, Faktor `3,00`, Anzahl `27`, Betrag `127,44`.
- Parser wurde auf OCR-typische Kallweit-Zeilen getestet. Faktoren werden mit 2 bis 4 Nachkommastellen akzeptiert, damit sowohl klassische Rechnungskopien (`3,00`) als auch technische Praxissoftware-Ausgaben (`2,5000`) funktionieren.
- Neuer Test in `tests/core-logic.test.ts`: `Praxissoftware-OCR-Text liest Rechnungsbetrag und Leistungsposition`.
- Geprueft: `pnpm run typecheck`, `pnpm test`, `pnpm run build`, `pnpm run lint` (0 Fehler, bestehende Warnung `stornoReview` ungenutzt), lokaler Abruf `http://localhost:3003/login`, OCR-Assets per `curl -I`, `git diff --check`.

## Update 2026-06-30: Praxissoftware-Import als Formatprofile verstanden

- Die Praxisauswahl im Upload ist nur die fachliche Zuordnung der Datei zu einem Standort, kein universeller Parser-Schalter.
- Grundsatz: Jede Praxissoftware bzw. jeder Sammeldruck kann ein eigenes Layout haben. Kallweit ist nur das erste gepruefte Formatprofil.
- UI-Text im Praxissoftware-Upload wurde angepasst: `Praxis / Zuordnung` plus separater Hinweis `Formatprofil Kallweit geprueft` oder `Neues Formatprofil`.
- Browser-OCR laeuft weiterhin fuer alle Praxissoftware-PDFs. Fuer nicht validierte Praxisformate werden die erkannten Rechnungen aber automatisch auf `Zu pruefen` gesetzt und mit dem Hinweis markiert, dass das Layout noch nicht als belastbares Importprofil freigegeben ist.
- Dadurch koennen Dateien anderer Praxen hochgeladen und gesammelt werden, ohne dass ihre Werte vorschnell in belastbare Praxisvergleiche/Potenzialberechnungen eingehen.

## Update 2026-06-30: Praxissoftware-Fortschritt und Auswertungspfad geprueft

- Die Fortschrittsanzeige im Praxissoftware-Upload zeigt nur noch den Auslesestand, z. B. `Datei.pdf: 37 von 394 Seiten ausgelesen`, und keine technischen OCR-Statusmeldungen mehr.
- Der Fortschritt wird im aktiven Uploadblock angezeigt. Bei Praxissoftware-Uploads erscheint er im Praxissoftware-Block, nicht mehr im BFS-Uploadblock.
- Sammel-PDF-Rechnungen bekommen in der Vorschau und beim Mergen einen stabilen Rechnungsschluessel aus BFS-Nr., Datei-Hash bzw. Praxis/Rechnungsdaten. Dadurch kollidieren viele Rechnungen aus derselben Sammeldatei nicht mehr in der Tabellenanzeige.
- Der Datenfluss wurde geprueft: `InvoiceImportView` schreibt die importierten `ParsedInvoiceDocument`-Zeilen in `invoiceRows`; `InvoiceServicesView`, `InvoicePotentialView` und `InvoiceLocationsView` lesen genau diese `invoiceRows`. Nach `Rechnungsimport bestaetigen` werden die persistenten Zeilen ueber `/api/invoices/parse` geladen und enthalten die gespeicherten Leistungszeilen aus `bfs_patient_invoice_lines`.
- Die Auswertungstabs filtern OCR-offene und noch nicht validierte Praxissoftware-Formatprofile aus. Dadurch koennen neue Praxisformate in der Vorschau gesammelt werden, ohne ungeprueft in Leistungsuebersicht, Potenzialanalyse oder Standortvergleich zu laufen.
- Bedeutung fuer Kallweit: Erkannte Leistungspositionen laufen in Leistungsuebersicht und Standortvergleich. Die Potenzialanalyse zeigt fuer Kallweit erst belastbare Euro-Potenziale, wenn mindestens ein weiterer Standort mit vergleichbaren Leistungsnummern als Benchmark importiert ist.

## Update 2026-06-30: Leistungsuebersicht als PDF exportierbar

- In der Rechnungsanalyse-Ansicht `Leistungsuebersicht` gibt es jetzt einen `PDF Export` fuer den aktuell gewaehlten Zeitraum und Standortfilter.
- Der Export nutzt dieselbe gefilterte Leistungsnummern-Tabelle wie die Ansicht und dient damit auch zur Fehlersuche/Optimierung des Praxissoftware-Imports.
- Fuer den Druckmodus wird der Scrollbereich der Leistungsuebersicht aufgehoben, damit alle Tabellenzeilen im PDF landen und nicht nur der sichtbare Ausschnitt.

## Update 2026-06-30: Potenzialanalyse als PDF exportierbar

- In der Rechnungsanalyse-Ansicht `Potenzialanalyse` gibt es jetzt ebenfalls einen `PDF Export` fuer den aktuell gewaehlten Zeitraum und Standort.
- Exportiert werden die KPI-Kacheln und die Top-Hebel-Tabelle der gefilterten Potenzialanalyse.
- Die Standortauswahl der Potenzialanalyse beruecksichtigt nur analysefreigegebene Rechnungen, damit neue ungepruefte Praxissoftware-Formatprofile nicht in Potenzial-Exports auftauchen.

## Update 2026-06-30: OCR-Artefakte aus Leistungs- und Potenzialanalyse herausgefiltert

- Der Praxissoftware-Parser markiert Rechnungen mit verdaechtigen Leistungszeilen jetzt automatisch als `Zu pruefen` und nennt die Anzahl der OCR-/Zuordnungsrisiken in den Parse-Hinweisen.
- Verdaechtige Leistungszeilen werden vor der Leistungsuebersicht herausgefiltert. Dadurch erscheinen OCR-Reste wie Gebuehrennummern `1`, `5`, `88`, fast numerische Beschreibungen, `(dl)`-/`(0)`-Anfaenge, typische Lesefehler wie `ode7`/`nalch` sowie verrutschte Faktor-/Zahnangaben nicht mehr als echte Gebuehrenpositionen.
- Die Potenzialanalyse baut auf derselben bereinigten Leistungsuebersicht auf. Damit fliessen diese Artefakte auch nicht mehr in Top-Hebel, Delta, Summe oder Standort-Benchmark ein.
- Standortvergleich und KPI-Zaehlungen der Rechnungsanalyse nutzen ebenfalls nur analysefaehige Leistungszeilen, damit Positionszahlen und Ø-Faktoren durch OCR-Artefakte nicht kuenstlich steigen.
- Neuer Test in `tests/core-logic.test.ts`: `Praxissoftware-OCR-Text markiert verdächtige Leistungszeilen zur Prüfung`.
- Geprueft: `pnpm run typecheck`, `pnpm test`, `pnpm run lint` (0 Fehler, bestehende Warnung `stornoReview` ungenutzt), `pnpm run build`.

## Update 2026-06-30: Leistungs-KPIs fuer Einzelstandort bereinigt

- In der Leistungsuebersicht wird bei nur einem auswertbaren Standort kein kuenstlicher `Hoechster/Niedrigster Standortfaktor`-Vergleich mehr angezeigt.
- Stattdessen zeigt die KPI bei einem Standort den realen `Ø Standortfaktor`; die Vergleichskarte sagt `Noch offen`, bis mindestens zwei Standorte mit Faktorwerten vorhanden sind.
- Die KPI `Leistungsvielfalt` und die Zeitraumzeile zaehlen Rechnungen nur noch dann als analysiert, wenn mindestens eine bereinigte Leistungsposition vorhanden ist.
- Geprueft: `pnpm run typecheck`, `pnpm test`, `pnpm run build`.

## Update 2026-06-30: Auswertungstab-Exporte nur mit Tabellen

- Die PDF-Exporte in `Leistungsuebersicht` und `Potenzialanalyse` verwenden jetzt nur noch den jeweiligen Tabellenbereich als Druckquelle.
- KPI-Kacheln, Filterbereich und Tab-Erklaertexte bleiben in der App sichtbar, werden aber nicht mehr in diese PDF-Arbeitslisten uebernommen.

## Update 2026-06-30: Praxissoftware-Upload direkt zuruecksetzbar

- Der Praxissoftware-PDF-Uploadblock hat jetzt ebenfalls einen `Upload zuruecksetzen`-Button.
- Der Button nutzt dieselbe Reset-Logik wie der BFS-Rechnungsupload und leert den gemeinsamen Rechnungsimport-/Vorschaubestand.

## Update 2026-06-30: Praxissoftware-Auswahlfeld verbreitert

- Der Praxissoftware-Upload nutzt fuer Praxis/Zuordnung jetzt ein eigenes Filterlayout.
- Das Auswahlfeld ist breiter und nutzt die verfuegbare Spalte voll aus, damit Standort- und Praxisname nicht mehr eingequetscht wirken.

## Update 2026-06-30: Import-Hinweiskacheln fachlich neutralisiert

- Die drei Hinweiskacheln unter dem Rechnungsimport unterscheiden jetzt sauber zwischen BFS-PDFs und Praxissoftware-PDFs.
- Standortzuordnung nennt nicht mehr nur feste BFS-Mandanten, sondern erklaert: BFS ueber Mandant/Anschrift, Praxissoftware ueber Vorauswahl, neue Formate bleiben zur Pruefung markiert.

## Update 2026-06-30: Praxissoftware-Reset loescht nur gewaehlte Praxis

- Der Reset-Button im Praxissoftware-Upload loescht jetzt nur Praxissoftware-Rechnungen des aktuell ausgewaehlten Standortes.
- BFS-Rechnungen und Praxissoftware-Importe anderer Standorte bleiben dabei erhalten.
- Der API-Reset unter `/api/invoices/parse` unterstuetzt dafuer `source=practice_software_pdf` und `standortId`.

## Update 2026-06-30: Praxissoftware-Upload je Praxis vorbereitet

- Der Praxissoftware-Rechnungsimport zeigt jetzt pro Standort/Praxis eine eigene Uploadkarte statt eines zentralen Dropdowns.
- Jede Praxis hat eigene Buttons fuer `Sammel-PDF`, `Praxisordner` und einen eigenen Reset fuer genau diesen Standort.
- Kallweit/Kirchberg bleibt als geprueftes Formatprofil markiert; andere Praxen sind als eigene Uploadplaetze vorbereitet und bleiben bis zur Formatpruefung markiert.
- Die Importlogik wird weiterhin je Standort mit `practice_software_pdf` und `standortId` aufgerufen, sodass spaeter eigene Formatprofile je Praxis ergaenzt werden koennen.

## Update 2026-06-30: Praxissoftware-Upload je Praxis speicherbar

- Jede Praxis-Uploadkarte hat jetzt einen eigenen `Speichern`-Button.
- Der Button bestaetigt nur die Praxissoftware-Rechnungen des jeweiligen Standortes; BFS-Rechnungen und andere Praxisuploads werden nicht automatisch mitgespeichert.
- Nach dem Speichern bleiben andere noch nicht bestaetigte Vorschauzeilen in der Ansicht erhalten.

## Update 2026-06-30: Rechnungsvorschau wieder scrollbar

- Die Tabelle `Rechnungsvorschau` hat wieder einen eigenen scrollbaren Listenbereich mit begrenzter Hoehe.
- Der Tabellenkopf bleibt beim Scrollen sichtbar, damit grosse Importvorschauen leichter pruefbar bleiben.

## Update 2026-07-01: BFS-Downloadlauf April 2026 gestoppt und dokumentiert

- Ausgangslage: Alte Downloads wurden vom Nutzer bereits verschoben; dieser Lauf zaehlt nur die neu im Download-Ordner liegenden `Rechnung_5-*.pdf`.
- Verzeichnis fuer diesen Lauf: `/Users/svendneumann/Downloads`.
- Bewaehrte Download-Logik beibehalten: langsam klicken, nach jedem einzelnen PDF die exakt passende Datei `Rechnung_5-...pdf` im Download-Ordner pruefen, bei Haengern Chrome kurz loslassen/neu verbinden, sichtbare BFS-Nummern gegen Downloads vergleichen und bei der ersten fehlenden sichtbaren Rechnung fortfahren.
- Klicktempo, das stabil lief: ca. 1,25 s nach Klick auf die BFS-Rechnungsnummer, ca. 1,8 s nach Klick auf das PDF-Symbol, bis zu ca. 18 s auf die Ziel-Datei warten, danach ca. 0,65 s Pause, PDF-Fenster schliessen, ca. 0,75 s Pause; Seitenwechsel ca. 1,7 s. Nicht schneller machen.
- Nach ca. 100 Rechnungen bzw. nach groesseren Bloecken den Download-Ordner gegenpruefen; eine Rechnung gilt nur als erledigt, wenn die konkrete PDF-Datei wirklich vorhanden ist.
- Neuer Lauf wurde ab Seite 320 fortgesetzt und bis Seite 357 bearbeitet.
- Seiten 320 bis 344: fortlaufend verifiziert; nach Seite 344 lagen 250 neue PDFs vor.
- Seite 345: 9 von 10 Rechnungen gespeichert; Ausnahme `5-19260-72100188` vom 01.04.2026, kein Rechnungsduplikat/keine PDF verfuegbar.
- Seiten 346 bis 354: alle sichtbaren Rechnungen gespeichert; nach Seite 354 lagen 349 neue PDFs vor.
- Seiten 355 und 356: alle 20 Rechnungen vom 01.04.2026 gespeichert.
- Seite 357: die ersten 6 Rechnungen vom 01.04.2026 wurden gespeichert; danach begann der 31.03.2026. Die Seite wurde komplett geladen, daher sind zusaetzlich 4 Maerz-Rechnungen im Download-Ordner.
- Aktueller neuer Downloadbestand nach Stopp: 379 PDFs.
- Letzte April-Rechnung in diesem Lauf: `Rechnung_5-19260-72100198.pdf` vom 01.04.2026.
- Zusaetzlich bereits mitgeladen aus Maerz: `Rechnung_5-18504-71923869.pdf`, `Rechnung_5-18504-71949710.pdf`, `Rechnung_5-18504-71923866.pdf`, `Rechnung_5-18504-71940459.pdf` vom 31.03.2026.
- Aktuelle BFS-Seite bei Stopp: Seite 357. Fuer den naechsten Lauf ist April 2026 erledigt; wenn ab Maerz weitergemacht werden soll, auf Seite 357 bei den Maerz-Rechnungen starten bzw. sichtbare Rechnungen zuerst gegen vorhandene Downloads pruefen.

## Update 2026-07-01: BFS-Downloadlauf Maerz 2026 bis Portal-Fehlerseite

- Nach Neustart ab Seite 357 wurde der Klickprozess neu kalibriert:
  - pro Rechnung nur ein Klick auf die BFS-Zeile, ein Klick auf das PDF-Symbol, ein Klick auf `Speichern`;
  - keine unnoetigen zweiten Zeilenklicks mehr, weil diese offene Detailzeilen wieder zuklappen koennen;
  - vor tief liegenden Zeilen selbststaendig scrollen und Koordinaten neu auslesen;
  - nach jedem Speichern die konkrete Datei `Rechnung_5-...pdf` im Download-Ordner pruefen.
- Seite 358 wurde vollstaendig nachgeladen; dabei wurde die zuerst problematische `5-18504-71940460` nach laengerem Warten erfolgreich gespeichert.
- Seite 359 und 360 wurden vollstaendig gespeichert.
- Danach liefen groessere Bloecke stabil:
  - Seiten 361 bis 365 vollstaendig gespeichert;
  - Seiten 366 bis 370 vollstaendig gespeichert, trotz Rueckmelde-Timeout; Pruefung danach: Seite 370, 509 PDFs, keine sichtbare Luecke;
  - Seiten 371 bis 374 fast vollstaendig; `5-19260-71888878` wurde danach einzeln nachgeladen. Pruefung danach: Seite 374 vollstaendig, 549 PDFs;
  - Seiten 375 und 376 vollstaendig gespeichert, inklusive Nachladen der Restpositionen auf Seite 376;
  - Seiten 377 bis 380 vollstaendig gespeichert.
- Aktueller Stand beim Abbruch durch BFS-Fehlerseite:
  - Downloadbestand: 614 PDFs in `/Users/svendneumann/Downloads`;
  - letzte vollstaendig abgeschlossene Seite: 380;
  - aktuelle Bearbeitung stoppte auf Seite 381;
  - auf Seite 381 wurden die ersten 5 Rechnungen gespeichert;
  - auf Seite 381 sind noch offen/nicht gespeichert: `5-19804-71863588`, `5-19804-71863621`, `5-19804-71863567`, `5-19804-71863601`, `5-19804-71863570`.
- Die BFS-Seite wechselte nach einem Reload in `BFS Error Page` und blieb auch nach erneutem Reload/Back auf der Fehlerseite. Naechster Start: Nutzer muss BFS im Chrome-Tab wieder in die Rechnungsuebersicht bringen; dann auf Seite 381 starten und die oben genannten offenen Nummern gegen den Download-Ordner pruefen.

## Update 2026-07-02: BFS-Downloadlauf bis Seite 652

- Im aktuellen Lauf wurde weiter mit dem stabilen Tempo gearbeitet: nicht doppelklicken, Detailfenster nach jedem Speichern sauber schliessen, sichtbare Zeilen und konkrete Dateien im Download-Ordner verifizieren.
- Seiten 604 bis 614 abgeschlossen; danach 513 neue `Rechnung_5-*.pdf` im Downloadordner. Letzter Stand: Seite 614, `Rechnung_5-19260-70832143.pdf`, Re-Datum 02.02.2026.
- Seiten 615 bis 626 bearbeitet; Seite 623 hatte eine verzoegerte PDF-Anzeige, wurde danach erfolgreich nachgeladen. Seite 626 enthielt bereits vorhandene Duplikate. Danach 623 PDFs; letzter neu verifizierter Stand: `Rechnung_5-19092-70542465.pdf`, Re-Datum 28.01.2026.
- Seiten 627 bis 640 bearbeitet; Seiten 627 und 628 waren bereits vorhanden. Seite 634: `5-19260-70519289` hatte kein PDF/kein Rechnungsduplikat und bleibt als offene Ausnahme markiert. Danach 740 PDFs; letzter Stand: `Rechnung_5-19804-70529427.pdf`, Re-Datum 27.01.2026.
- Seiten 641 bis 652 wurden vollstaendig gespeichert und verifiziert. Downloadordner enthaelt danach 860 neue `Rechnung_5-*.pdf`. Letzter bestaetigter Punkt: Seite 652 komplett, `Rechnung_5-19260-70442104.pdf`, Re-Datum 22.01.2026.
- Seite 653 wurde danach neu kalibriert und vollstaendig gespeichert/verifiziert. Wichtig: Der Klick muss exakt auf die blaue BFS-Nr. erfolgen, nicht links in die Zeile. Das PDF oeffnet in einem eingebetteten Fenster; der Download-Klick liegt oben rechts im PDF-Fenster auf dem Download-Symbol, nicht an der alten Koordinate. Problemnummer `5-19260-70442109` wurde manuell nachgeladen und ist gespeichert.
- Danach wurde ein Block ab Seite 654 gestartet. Der Tool-Ruecklauf ist abgelaufen, aber der Downloadordner stieg auf 897 PDFs. Neueste sichtbare Dateien danach u. a. `Rechnung_5-19260-70410605.pdf`, `Rechnung_5-19260-70410609.pdf`, `Rechnung_5-19260-70410612.pdf`, `Rechnung_5-19260-70410601.pdf`, `Rechnung_5-19260-70410620.pdf`.
- Belastbar abgeschlossen: Seite 653 komplett, 870 PDFs.
- Nicht als komplett markieren, bevor geprueft: Seiten 654 bis 656 gegen die sichtbaren BFS-Nummern und den Downloadordner nachpruefen; Stand im Ordner nach Timeout: 897 PDFs. Wahrscheinlich wurden 27 weitere Rechnungen gespeichert, aber die letzte aktive Seite konnte wegen Chrome-Verbindungsabbruch nicht mehr ausgelesen werden.
- Beim Fortsetzen zuerst Chrome-Verbindung wiederherstellen, aktive Seite pruefen und Seiten 654 bis 656 nach fehlenden PDFs scannen. Danach ab der ersten nicht vollstaendigen Seite weiterarbeiten.

## Update 2026-07-02: Fortsetzung ab Seite 656

- Chrome-Verbindung kam wieder zustande; BFS stand auf Seite 656, Zeitraum `seitBeginn`, Re-Datum absteigend.
- Seite 656 hatte nach dem vorherigen Timeout 3 fehlende Dateien: `5-19260-70410623`, `5-19260-70410596`, `5-19260-70410608`.
- Diese 3 Dateien wurden erfolgreich nachgeladen. Seite 656 ist damit komplett verifiziert; Downloadbestand danach: 900 `Rechnung_5-*.pdf`.
- Danach wurde Block Seiten 657 bis 659 gestartet. Der Downloadbestand stieg auf 927 PDFs, also 27 weitere Dateien. Der Tool-Ruecklauf lief erneut in ein Timeout.
- Neueste sichtbare Dateien danach u. a. `Rechnung_5-19092-70385180.pdf`, `Rechnung_5-19092-70367436.pdf`, `Rechnung_5-19092-70367450.pdf`, `Rechnung_5-19092-70367435.pdf`, `Rechnung_5-19092-70385181.pdf`.
- Belastbar abgeschlossen: Seite 656 komplett, 900 PDFs.
- Nicht als komplett markieren, bevor geprueft: Seiten 657 bis 659 gegen die sichtbaren BFS-Nummern und den Downloadordner nachpruefen; Stand im Ordner nach Timeout: 927 PDFs. Wahrscheinlich sind 27 von 30 Rechnungen gespeichert.
- Beim Fortsetzen zuerst Chrome-Verbindung wiederherstellen, aktive Seite pruefen und Seiten 657 bis 659 nach fehlenden PDFs scannen. Danach ab der ersten nicht vollstaendigen Seite weiterarbeiten.

## Update 2026-07-02: Verbindungsabbruch beim Wiederaufsetzen

- Nach Nutzerwunsch `mache weiter` wurde Chrome wieder angebunden; BFS war durch den Browser-Neustart wieder auf Seite 1 und Zeitraum `letzte4Wochen`.
- Zeitraum wurde erfolgreich auf `seitBeginn` zurueckgestellt.
- Direkter Tabellen-Sprung per PrimeFaces war aus dem isolierten Codex-Kontext nicht moeglich; danach wurde ein sichtbarer Seitennavigationssprung getestet. Klick auf die letzte sichtbare Seitennummer springt nur stufenweise weiter.
- Ein automatischer Vorsprung Richtung Seite 657 wurde gestartet, lief aber in ein Timeout. Danach war die Chrome-Verbindung zum Tab nicht mehr stabil auslesbar.
- Downloadbestand blieb unveraendert bei 927 `Rechnung_5-*.pdf`; es wurden in diesem Wiederaufnahmeversuch keine neuen Rechnungsdownloads verifiziert.
- Belastbar bleibt: Seite 656 komplett, 900 PDFs. Seiten 657 bis 659 sind nur teilweise/ungeprueft mit Stand 927 PDFs.
- Beim naechsten Fortsetzen: Chrome komplett neu starten bzw. Codex-Chrome-Verbindung frisch herstellen, BFS auf `seitBeginn` setzen, dann erst aktive Seite auslesen. Falls BFS wieder auf Seite 1 steht, nicht lange mit Seitensprung experimentieren; besser Nutzer auf Seite 657/659 vorpositionieren lassen oder mit kleinerem Datumszeitraum um den 21./22.01.2026 arbeiten, um die Seitentiefe zu reduzieren.

## Update 2026-07-02: Seiten 657 bis 659 verifiziert, Block 660-662 teilweise

- Nach erneutem Wiederaufsetzen stand BFS korrekt auf Seite 657, Zeitraum `seitBeginn`, Re-Datum absteigend.
- Seite 657 wurde gegen den Downloadordner geprueft: keine sichtbaren Luecken, Downloadbestand 927 PDFs.
- Seiten 658 und 659 wurden danach geprueft und vervollstaendigt. Seite 659 hatte 3 fehlende Dateien, die nachgeladen wurden: `Rechnung_5-19092-70367421.pdf`, `Rechnung_5-19092-70367422.pdf`, `Rechnung_5-19092-70367443.pdf`.
- Belastbar abgeschlossen: Seite 659 komplett, 930 `Rechnung_5-*.pdf`.
- Danach wurde Block Seiten 660 bis 662 gestartet. Der Tool-Ruecklauf lief in ein Timeout, der Downloadbestand stieg aber auf 958 PDFs.
- Neueste Dateien nach diesem Timeout u. a. `Rechnung_5-19260-70410619.pdf`, `Rechnung_5-19260-70410629.pdf`, `Rechnung_5-19260-70410617.pdf`, `Rechnung_5-19092-70367428.pdf`, `Rechnung_5-19092-70367432.pdf`, `Rechnung_5-19092-70367446.pdf`, `Rechnung_5-19092-70385179.pdf`, `Rechnung_5-19092-70367438.pdf`, `Rechnung_5-19092-70367448.pdf`, `Rechnung_5-19092-70385176.pdf`, `Rechnung_5-19092-70367426.pdf`, `Rechnung_5-19092-70367433.pdf`, `Rechnung_5-19092-70385178.pdf`.
- Nicht als komplett markieren, bevor geprueft: Seiten 660 bis 662 gegen die sichtbaren BFS-Nummern und den Downloadordner pruefen. Wahrscheinlich sind 28 von 30 Rechnungen gespeichert.
- Aktuelles Problem beim Fortsetzen: Chrome antwortete nicht mehr beim Auslesen/Claimen der offenen BFS-Seite. Nach 30 Sekunden Wartezeit und Neuverbindung blieb die Chrome-Verbindung instabil. Naechster Start: Chrome/BFS-Seite neu ansprechbar machen, aktive Seite pruefen, dann Seiten 660 bis 662 verifizieren und ab der ersten Luecke weiterarbeiten.

## Update 2026-07-02: Seiten 660 bis 662 abgeschlossen, Block 663-665 gestartet

- Nach Wiederaufnahme wurde die Klicklogik neu geprueft und langsamer gestellt.
- Wichtigste Korrektur: PDF-Download nur noch ueber das eindeutig passende `rePDF/iconPDF`-Element in der Detailzeile derselben BFS-Nummer. Keine Fallback-Klicks mehr auf beliebige Icons. Wenn kein eindeutiges PDF-Element sichtbar ist, wird die Rechnung markiert statt falsch geklickt.
- Bei tief liegenden Detailzeilen liegt das PDF-Icon teilweise unterhalb des sichtbaren Bereichs; dann kontrolliert nach unten scrollen und erst danach das `rePDF/iconPDF` der passenden Detailzeile klicken.
- Seiten 660, 661 und 662 wurden vollstaendig gegen den Downloadordner verifiziert.
- Auf Seite 662 fehlten `5-19260-70410627` und `5-19260-70410622`; beide wurden mit der neuen Scroll-/Detailzeilenlogik erfolgreich nachgeladen.
- Belastbar abgeschlossen: Seite 662 komplett, Downloadbestand danach 960 `Rechnung_5-*.pdf`.
- Danach wurde ein kleiner Testblock Seiten 663 bis 665 mit der neuen Logik gestartet. Der Tool-Ruecklauf lief in ein Timeout; der Downloadbestand stieg von 960 auf 987 PDFs, also 27 neue Dateien.
- Neueste Dateien danach u. a. `Rechnung_5-19260-70356308.pdf`, `Rechnung_5-19260-70356305.pdf`, `Rechnung_5-19260-70356307.pdf`, `Rechnung_5-19260-70410611.pdf`, `Rechnung_5-19260-70410599.pdf`, `Rechnung_5-19260-70410628.pdf`, `Rechnung_5-19260-70410616.pdf`, `Rechnung_5-19260-70410600.pdf`, `Rechnung_5-19260-70410621.pdf`, `Rechnung_5-19260-70410597.pdf`.
- Nicht als komplett markieren, bevor geprueft: Seiten 663 bis 665 gegen sichtbare BFS-Nummern und Downloadordner pruefen; wahrscheinlich sind 27 von 30 Rechnungen gespeichert.
- Aktuelles Problem: Nach dem Timeout antwortete Chrome erneut nicht mehr beim Tab-Auslesen. Nach 30 Sekunden Wartezeit und Neuverbindung blieb das Auslesen offener Tabs haengen. Naechster Start: Chrome/BFS-Verbindung frisch herstellen, aktive Seite pruefen, Seiten 663 bis 665 verifizieren und fehlende PDFs nachladen.

## Update 2026-07-02: Fortsetzung stabil bis Seite 675

- Chrome-Verbindung kam wieder zustande; BFS stand auf Seite 665, Zeitraum `seitBeginn`, Re-Datum absteigend.
- Seiten 663 und 664 wurden gegen den Downloadordner geprueft und waren komplett.
- Seite 665 hatte 3 fehlende PDFs: `5-19804-70529350`, `5-19804-70529419`, `5-19804-70529355`. Diese wurden erfolgreich nachgeladen.
- Danach wurden mit langsamer, detailzeilen-genauer Logik die Seiten 666 bis 675 geladen.
- Seiten 666, 667, 668, 669, 670, 671, 672, 673, 674 und 675 sind vollstaendig gespeichert und verifiziert. Bei 668/669 und 670/671 trat kurz eine Statusanzeige `current: 1` in der Rueckmeldung auf; beide Bloecke wurden danach explizit nachgeprueft und hatten keine fehlenden Dateien.
- Belastbar abgeschlossen: Seite 675 komplett, Downloadbestand 1090 `Rechnung_5-*.pdf`.
- Bewaehrte Logik weiterhin: kleine 2-Seiten-Bloecke, nach jedem Block explizit pruefen; PDF nur ueber `rePDF/iconPDF` aus der Detailzeile derselben BFS-Nr.; bei tief liegendem PDF-Icon kontrolliert scrollen; keine Fallback-Klicks.

## Update 2026-07-02: Fortsetzung stabil bis Seite 681

- Mit derselben langsamen, detailzeilen-genauen Logik weitergeladen.
- Seiten 676 und 677 komplett gespeichert, Downloadbestand 1110 PDFs.
- Seiten 678 und 679 komplett gespeichert, Downloadbestand 1130 PDFs.
- Seiten 680 und 681 komplett gespeichert, Downloadbestand 1150 PDFs.
- Belastbar abgeschlossen: Seite 681 komplett.
- Weiterer Startpunkt: Seite 682. Zeitraum muss `seitBeginn` bleiben, Re-Datum absteigend. Weiterhin in 2-Seiten-Bloecken arbeiten und nach jedem Block pruefen.

## Update 2026-07-02: Fortsetzung stabil bis Seite 685

- Seiten 682 und 683 komplett gespeichert, Downloadbestand 1170 PDFs.
- Seiten 684 und 685 komplett gespeichert, Downloadbestand 1190 PDFs.
- Belastbar abgeschlossen: Seite 685 komplett.
- Weiterer Startpunkt: Seite 686. Gleiche langsame 2-Seiten-Blocklogik beibehalten.

## Update 2026-07-02: Fortsetzung stabil bis Seite 689

- Seiten 686 und 687 komplett gespeichert, Downloadbestand 1210 PDFs.
- Seiten 688 und 689 komplett gespeichert, Downloadbestand 1230 PDFs.
- Belastbar abgeschlossen: Seite 689 komplett.
- Weiterer Startpunkt: Seite 690.

## Update 2026-07-02: Fortsetzung stabil bis Seite 693

- Seiten 690 und 691 komplett gespeichert, Downloadbestand 1250 PDFs.
- Seiten 692 und 693 komplett gespeichert, Downloadbestand 1270 PDFs.
- Belastbar abgeschlossen: Seite 693 komplett.
- Weiterer Startpunkt: Seite 694.

## Update 2026-07-02: Fortsetzung stabil bis Seite 697

- Seiten 694 und 695 komplett gespeichert, Downloadbestand 1290 PDFs.
- Seiten 696 und 697 komplett gespeichert, Downloadbestand 1310 PDFs.
- Belastbar abgeschlossen: Seite 697 komplett.
- Weiterer Startpunkt: Seite 698.

## Update 2026-07-02: Fortsetzung bis Seite 701, eine Storno-Ausnahme

- Seiten 698 und 699 komplett gespeichert, Downloadbestand 1330 PDFs.
- Seiten 700 und 701 bearbeitet; Seite 701 komplett gespeichert.
- Auf Seite 700 wurde `5-19092-70174169` nicht gespeichert, weil in der Detailzeile kein Rechnungsduplikat/PDF vorhanden ist. Detailpruefung: Rechnungsbetrag 105,00 EUR, davon storniert 105,00 EUR, erledigt am 08.01.2026. Als Storno-Ausnahme markieren, nicht als fehlenden Download behandeln.
- Downloadbestand nach Seite 701: 1349 PDFs.
- Belastbar abgeschlossen: Seite 701 komplett, mit Ausnahme `5-19092-70174169`.
- Weiterer Startpunkt: Seite 702.

## Update 2026-07-02: Fortsetzung stabil bis Seite 705

- Seiten 702 und 703 komplett gespeichert, Downloadbestand 1369 PDFs.
- Seiten 704 und 705 komplett gespeichert, Downloadbestand 1389 PDFs.
- Belastbar abgeschlossen: Seite 705 komplett.
- Weiterer Startpunkt: Seite 706.

## Update 2026-07-02: Fortsetzung stabil bis Seite 707

- Seiten 706 und 707 komplett gespeichert. Bei Seite 707 trat kurz wieder `current: 1` in der Rueckmeldung auf; danach wurden Seiten 706 und 707 explizit nachgeprueft.
- Beide Seiten haben keine fehlenden Dateien.
- Belastbar abgeschlossen: Seite 707 komplett, Downloadbestand 1409 PDFs.
- Weiterer Startpunkt: Seite 708.

## Update 2026-07-02: Fortsetzung stabil bis Seite 711

- Seiten 708 und 709 komplett gespeichert; wegen kurzer `current: 1`-Rueckmeldung auf Seite 708 wurden beide Seiten explizit nachgeprueft. Downloadbestand 1429 PDFs.
- Seiten 710 und 711 komplett gespeichert, Downloadbestand 1449 PDFs.
- Belastbar abgeschlossen: Seite 711 komplett.
- Weiterer Startpunkt: Seite 712.

## Update 2026-07-02: Fortsetzung stabil bis Seite 715

- Seiten 712 und 713 komplett gespeichert, Downloadbestand 1469 PDFs.
- Seiten 714 und 715 komplett gespeichert, Downloadbestand 1489 PDFs.
- Belastbar abgeschlossen: Seite 715 komplett.
- Weiterer Startpunkt: Seite 716.

## Update 2026-07-02: Fortsetzung stabil bis Seite 719

- Seiten 716 und 717 komplett gespeichert, Downloadbestand 1509 PDFs.
- Seiten 718 und 719 komplett gespeichert, Downloadbestand 1529 PDFs.
- Belastbar abgeschlossen: Seite 719 komplett.
- Weiterer Startpunkt: Seite 720.

## Update 2026-07-02: Fortsetzung stabil bis Seite 721

- Seiten 720 und 721 komplett gespeichert, Downloadbestand 1549 PDFs.
- Belastbar abgeschlossen: Seite 721 komplett.
- Weiterer Startpunkt: Seite 722.

## Update 2026-07-02: Fortsetzung stabil bis Seite 723

- Seiten 722 und 723 komplett gespeichert. Wegen `current: 1`-Rueckmeldungen wurden beide Seiten danach explizit nachgeprueft.
- Beide Seiten haben keine fehlenden Dateien.
- Belastbar abgeschlossen: Seite 723 komplett, Downloadbestand 1569 PDFs.
- Weiterer Startpunkt: Seite 724.

## Update 2026-07-02: Fortsetzung bis Seite 725, zweite Storno-Ausnahme

- Seite 724 komplett gespeichert.
- Seite 725 bearbeitet; `5-19092-69963323` wurde nicht gespeichert, weil kein Rechnungsduplikat/PDF vorhanden ist. Detailpruefung: Rechnungsbetrag 1.917,53 EUR, davon storniert 1.917,53 EUR, erledigt am 29.12.2025. Als Storno-Ausnahme markieren, nicht als fehlenden Download behandeln.
- Downloadbestand nach Seite 725: 1588 PDFs.
- Belastbar abgeschlossen: Seite 725 komplett, mit Ausnahme `5-19092-69963323`.
- Weiterer Startpunkt: Seite 726.

## Update 2026-07-02: Fortsetzung stabil bis Seite 749

- Seiten 726 und 727 komplett gespeichert, Downloadbestand 1608 PDFs.
- Seiten 728 und 729 nach Kontextwechsel explizit nachgeprueft: keine fehlenden Dateien, Downloadbestand 1628 PDFs. Zeitraum `seitBeginn`, Sortierung Re-Datum `descending`.
- Seiten 730 bis 739 komplett gespeichert und jeweils nachgeprueft, Downloadbestand 1728 PDFs.
- Seiten 740 bis 749 komplett gespeichert und jeweils nachgeprueft, Downloadbestand 1828 PDFs.
- Bekannte `current: 1`-Rueckmeldungen traten weiterhin vereinzelt nach PDF-Speicherung auf; die direkte Nachpruefung der jeweiligen Seiten war sauber.
- Aktuelles Datum auf Seite 749: 16.12.2025.
- Belastbar abgeschlossen: Seite 749 komplett.
- Weiterer Startpunkt: Seite 750.

## Update 2026-07-02: Fortsetzung stabil bis Seite 787

- Nach Wiederaufnahme wurde Chrome/BFS zuerst neu verifiziert: Zeitraum `seitBeginn`, Sortierung `Re-Datum` absteigend. Die Seitennavigation sprang optisch zwischen oben/unten unter der Tabelle; deshalb muss beim Seitensprung jeder sichtbare Seitenbutton dynamisch neu gesucht werden. Keine festen Koordinaten fuer Seitenzahlen verwenden.
- Seiten 750 bis 753 wurden komplett gespeichert/verifiziert.
- Seite 754 hatte eine neue Storno-Ausnahme: `5-19092-69698261`, Rechnungsnummer `2/14425/1`, Betrag 90,34 EUR, davon storniert 90,34 EUR, erledigt am 16.12.2025. Kein Rechnungsduplikat/PDF vorhanden; nicht als fehlenden Download behandeln.
- Seiten 755 bis 758 komplett gespeichert/verifiziert. Auf Seite 756 wurde `5-19260-69775094` nach zunaechst fehlender Datei erfolgreich nachgeladen.
- Seite 759 komplett bis auf Storno-Ausnahme `5-18504-69694019`: Betrag 1.090,99 EUR, davon storniert 1.090,99 EUR, erledigt am 16.12.2025. Kein Rechnungsduplikat/PDF vorhanden; nicht als fehlenden Download behandeln. `5-18790-69685488` wurde nachtraeglich erfolgreich gespeichert.
- Seiten 760 bis 784 komplett gespeichert/verifiziert.
- Seite 785: 9 von 10 Dateien gespeichert. Offen bleibt `5-19260-69526279` (05.12.2025, Patient Seeger, Alisa, Betrag 45,36 EUR, davon storniert 45,36 EUR, erledigt am 27.03.2026). In der Detailzeile ist ein `rePDF`/PDF-Icon sichtbar, aber der kontrollierte Speicherversuch lieferte keinen PDF-Dialog bzw. danach kein eindeutig passendes Icon. Beim naechsten Lauf zuerst diese Nummer erneut pruefen; falls wieder kein Speichern moeglich ist, als Storno-/PDF-Ausnahme dokumentieren.
- Seiten 786 und 787 komplett gespeichert/verifiziert.
- Nach ca. 100+ neuen Dateien wurde der Downloadordner geprueft; neueste Dateien hatten plausible Dateigroessen und aktuelle Zeitstempel.
- Downloadbestand bei Stopp: 2203 `Rechnung_5-*.pdf`.
- Aktueller BFS-Stand bei Stopp: Seite 787, Re-Datum 04.12.2025, Zeitraum `seitBeginn`, Sortierung absteigend.
- Belastbar abgeschlossen: Seite 787 komplett, mit offener Einzelpruefung `5-19260-69526279` auf Seite 785.
- Weiterer Startpunkt: Seite 788. Beim Fortsetzen zuerst aktive Seite/Filter/Sortierung pruefen, dann `5-19260-69526279` gezielt nachpruefen oder als Ausnahme markieren, danach ab Seite 788 weiterarbeiten.

## Update 2026-07-02: Hauptbereich Abrechnungsqualitaet gestartet

- Neuer dritter Hauptbereich `Abrechnungsqualitaet` in der App-Navigation fuer Super Admin, Standortleitung und Abrechnungsmanagement.
- Start-Unterbereiche:
  - `Qualitaetscockpit`
  - `Leistungsketten`
  - `Praxis-Feedback`
- Die erste Logik nutzt bestehende `ParsedInvoiceDocument`-/Leistungszeilen aus der BFS-Rechnungsanalyse und laedt daher denselben Rechnungsdatenbestand.
- Muster-Engine:
  - filtert nur analysefaehige Rechnungen/Leistungszeilen (`invoiceReadyForAnalysis`, `invoiceLineReadyForAnalysis`, Katalog-Normalisierung);
  - bildet je Rechnung eindeutige Leistungsnummern;
  - zaehlt datengetriebene Wenn-dann-Kombinationen `Wenn Leistung A, dann kommt Leistung B haeufig mit`;
  - vergleicht Gruppenquote gegen Praxisquote je Standort;
  - erzeugt Pruefhinweise, wenn Gruppenquote hoch ist, die Praxisquote deutlich niedriger ist und genuegend Fallbasis vorhanden ist;
  - schaetzt Potenzial aus erwarteter Luecke mal durchschnittlichem Betrag der moeglichen Begleitleistung.
- UI:
  - Filter fuer Zeitraum, Standort, Falltyp, Suche, Mindest-Gruppenquote, Mindestfallzahl und Mindestpotenzial;
  - zusaetzlicher Statusfilter `Offen`, `Relevant`, `Fachlich unbegruendet`, `Spaeter pruefen`;
  - KPI-Kacheln fuer Pruefhinweise, geschaetztes Potenzial, staerkste Leistungskette, hoechste Abweichung, Falltypen und Workflow;
  - Tabelle mit Standort, Falltyp, Hauptleistung, moeglicher Begleitleistung, Gruppenquote, Praxisquote, Luecke, Potenzial und Hinweistext;
  - Management/Abrechnung kann jeden Hinweis browserseitig als `relevant`, `fachlich unbegruendet` oder `spaeter pruefen` markieren; diese Entscheidung bleibt lokal erhalten;
  - Vorperiodenvergleich zeigt je Hinweis, ob sich die Praxisquote gegenueber dem vergleichbaren Vorzeitraum verbessert, verschlechtert oder stabil geblieben ist;
  - in `Leistungsketten` und `Praxis-Feedback` zusaetzliche Rechnungsbeispiele mit Rechnung, Datum, Patient, Betrag und bereits abgerechneten Leistungsnummern;
  - PDF-Export und CSV-Export fuer Praxisgespraeche.
- Wichtige fachliche Einordnung: Hinweise sind Pruefansaetze und duerfen nicht als automatisch falsche Abrechnung formuliert werden. Textlogik bleibt bewusst bei `fachlich pruefen`.
- Echter Supabase-Analysecheck am 02.07.2026:
  - Datenbasis: 11.614 Einzelrechnungen, 63.315 Positionszeilen, 39.245 Service-Zeilen, 5 Standorte.
  - 2026-Standortbasis: Kirchberg 3.139 Rechnungen / 9.221 Service-Zeilen; Kehl 2.776 / 10.376; Ulmet 2.545 / 7.415; Huettenberg 1.691 / 5.966; Essen 1.463 / 6.267.
  - Erste datengetriebene Top-Hinweise bei Schwelle ca. Gruppenquote >=70 %, Mindestfaelle >=12, Praxisanker >=5: Huettenberg `4020 -> 1040` stark auffaellig; Ulmet Implantat-/Augmentationsketten `0530/9100 -> 9010`; Essen `4005/4000 -> 1040`; Kehl Funktionsanalyse `8000 -> 8050/8020/8010`; Kehl Endo `2400 -> 2420`, `2410 -> 2430`; Kirchberg mehrere ZE-/Adhaesiv-/Beratungsbegleiter.
  - Diese Ergebnisse zeigen, dass der Workflow grundsaetzlich verwertbare Hinweise liefert, aber fachlich kuratiert werden muss: statistische Muster sind Pruefansatz, keine automatische GOZ-Regel.
- Nach weiterer Klarstellung wurde der Praxis-Feedback-Workflow nachgeschaerft:
  - `Praxis-Feedback` steht standardmaessig auf `Nur kuratierte Regeln`, damit Standortleitungen nicht rohe statistische Muster sehen.
  - Erste interne Regelbasis hinterlegt fuer FAL (`8000 -> 8010/8020/8050`), Endo (`2400 -> 2420`, `2410 -> 2430`), ZE/Adhaesiv (`2200/2210/2270/2310/5010/5040 -> 2197`), ZE/FAL (`5040/5180 -> 8010/8020`) und Implantologie/Diagnostik (`0530/9100/Ä2382 -> 9010`, `9100 -> Ä5004`).
  - Jede Regel hat Titel, fachlichen Hinweistext, Konfidenz (`hoch`/`mittel`) und Quellenlabel, z. B. `BZÄK GOZ-Kommentar Abschnitt J/C/F/K/L`.
  - Datenmuster bleiben optional sichtbar ueber Filter `Regeln + Datenmuster`, aber nicht als Standard-Praxisbericht.
- Geprueft nach Aenderung:
  - `pnpm run typecheck` gruen
  - `pnpm run lint` gruen
  - `pnpm test` gruen, 15 Tests bestanden
  - `pnpm run build` gruen
  - Vercel Production Deploy am 02.07.2026 ca. 18:17 Uhr erfolgreich: Deployment `dpl_EcNZr6QB3YaPyawyXX74qavQZ86y`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.
  - Zweiter Vercel Production Deploy mit kuratierter Regelbasis am 02.07.2026 ca. 18:28 Uhr erfolgreich: Deployment `dpl_AXAChKn4RC1HPjWwdquC4LTRnw8f`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Potenzialanalyse Top 20

- In der BFS-Rechnungsanalyse zeigt die Kachel `Potenzialanalyse > Top-Hebel` jetzt explizit die `Top 20 Leistungen mit groesstem Mehrumsatz`.
- Die Auswahl basiert auf der bereits nach Euro-Potenzial sortierten Potenzialliste fuer den gewaehlten Standort und Zeitraum.
- CSV-Export und PDF-Druck der Top-Hebel-Tabelle verwenden dieselbe Top-20-Auswahl; die KPI-Kacheln oben bleiben weiterhin auf der vollstaendigen Potenzialbasis.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 18:35 Uhr erfolgreich: Deployment `dpl_61z4NXc2tM6CV8hbcVE5YyykjbPG`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Abrechnungsqualitaet mobile Hinweise

- Die Tabelle `Abrechnungsqualitaet > Pruefhinweise/Praxis-Feedback` bleibt auf Desktop tabellarisch.
- Auf mobilen Ansichten wird dieselbe Datenbasis jetzt als Kartenliste gezeigt, damit Standort, Leistungskette, Gruppe/Praxis-Quote, Luecke, Potenzial, Basis, Hinweistext und Statusaktionen ohne horizontales Abschneiden lesbar sind.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 18:39 Uhr erfolgreich: Deployment `dpl_2ehVUfJW9GNp24o5c6Zgm2RXnnu2`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Abrechnungsqualitaet als Informationsliste

- Die Abrechnungsqualitaet-Hinweise sind keine Abhak-/Bearbeitungsliste mehr. Statusfilter, Status-Spalte und Aktionen `relevant`, `unbegruendet`, `spaeter` wurden aus der sichtbaren Hinweis-/Kartenliste entfernt.
- UI-Text und CSV sprechen nun von `Einordnung`: Die Praxis soll fachlich beurteilen, ob ein Hinweis relevant und im konkreten Behandlungsfall anwendbar ist.
- Direkt an der Hinweis-/Leistungskettenliste gibt es nun zusaetzlich sichtbare Exportaktionen fuer `Tabelle`/CSV und `PDF`. CSV exportiert alle aktuell gefilterten Hinweise, nicht nur die sichtbaren gekuerzten Reportzeilen.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 18:46 Uhr erfolgreich: Deployment `dpl_26VHXdgUJcwGD7zbFeUGUC6RgAyp`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Praxis-Feedback Exporttext

- Praxis-Feedback nutzt nun ebenfalls die reine Informationslogik: Der Listenabschnitt heisst im Feedback-Kontext `Praxis-Feedback`, nicht mehr allgemein `Pruefhinweise`.
- Die mobile Kartenansicht fuer Abrechnungsqualitaet ist jetzt bereits ab schmalen Layouts aktiv, nicht erst im kleinsten Mobile-Breakpoint. Damit werden Status-/Tabellenreste auf Smartphone/kleinen Tablets vermieden.
- Alle Abrechnungsqualitaet-Reports (`Qualitaetscockpit`, `Leistungsketten`, `Praxis-Feedback`) enthalten im exportierten Bereich einen Report-Vorspann `Wie dieser Report zu lesen ist`.
- Der Vorspann erklaert in 4 Zeilen: Ableitung aus Einzelrechnungen und anonymisierter Standortgruppe, haeufige Begleitleistungen in vergleichbaren Leistungsketten, keine automatische Fehlerbewertung, fachliche Pruefung auf Relevanz/Anwendbarkeit vor Ort.
- CSV-Exporte der Abrechnungsqualitaet enthalten denselben Vorspann vor der Datentabelle.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 18:51 Uhr erfolgreich: Deployment `dpl_8NGiRQbfG5KQW13vvZD4fFAqUgS7`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Abrechnungsqualitaet konsequent nicht als Abhakliste

- Der gesamte Reiter `Abrechnungsqualitaet` wurde sprachlich weiter von einer Bearbeitungs-/Abhakliste weggefuehrt.
- Regel- und UI-Texte sprechen jetzt von `Einordnung`, `Katalog-/Plausibilitaetsinfos`, `Informationsgrundlage` und `Orientierungswert`, nicht von `pruefen`, `Workflow`, `Pruefhinweis` oder gesichertem Potenzial.
- Die fachliche Herleitung wird klarer benannt: gesetzliche Vorgaben, GOZ/BEMA-/GOÄ-Katalog, BZÄK-Kommentar-/Kataloglogik, Dokumentation, Behandlungsablauf und anonymisierter Gruppenvergleich.
- Die hinterlegten Regeln bleiben bewusst Hinweise zur fachlichen Einordnung; sie erzeugen keine automatische Fehlerbewertung und keinen Nachberechnungsauftrag.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 18:55 Uhr erfolgreich: Deployment `dpl_7fuH77cPwSr2qYrLRvz6dtMsZYXX`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Performance Sofortmassnahmen

- Ziel: App soll schneller sichtbar und weniger hakelig werden, ohne fachliche Logik oder Berechnungsergebnisse zu veraendern.
- Initiale Importdaten aus dem Browser-Speicher werden beim Start nur noch einmal synchron gelesen und innerhalb des Modulstarts gecacht. Vorher konnten dieselben Daten beim Initialisieren mehrfach geparst werden.
- Manuelle Klaerungen und Saldo-/Statusdaten blockieren den generellen App-Start nicht mehr. Sie laden weiter im Hintergrund; Ansichten, die diese Daten zwingend brauchen (`Antworten`, `Pruefliste`), warten weiterhin darauf.
- Die grosse operative Fallliste (`buildUnifiedOperationalReviewCases`) wird in der Root-Komponente nur noch fuer operative Ansichten gebaut, die sie wirklich verwenden (`answers`, `cases`, `practiceFollowup`). Dashboard- und Rechnungsanalyse-Start werden dadurch entlastet.
- Grosse Hintergrund-State-Updates fuer Importdaten, Saldo-/Statusdaten, manuelle Klaerungen und Einzelrechnungen laufen als React `startTransition`, damit die UI beim Nachladen weniger blockiert.
- Keine Aenderung an Fachlogik, Katalog-/Abrechnungsregeln, Matching, Importformaten oder gespeicherten Daten.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 19:01 Uhr erfolgreich: Deployment `dpl_4253Y32VSegH3fFWqnkchrJWShQJ`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Performance Runde 2

- Abrechnungsqualitaet wurde rechnerisch optimiert, ohne Auswertungslogik zu veraendern:
  - Rechnungsprofile fuer Abrechnungsqualitaet werden per `WeakMap` gecacht. Dieselbe Rechnung muss bei Zeitraum-/Vorperioden-/Filterberechnung nicht mehrfach normalisiert werden.
  - Die Gruppenstatistik zaehlt `anchorCount` jetzt direkt per Map, statt fuer jedes Leistungspaar erneut durch alle Anchor-Schluessel zu filtern.
- Operative Ableitungen aus Importdaten werden per `WeakMap` fuer dieselbe Importdaten-Array-Referenz gecacht:
  - `casesFromImportRows`
  - `resubmissionCandidatesFromImportRows`
- Diese Caches greifen nur bei unveraenderten In-Memory-Datenarrays. Bei neu geladenen/importierten Daten entsteht ein neues Array und die Ableitungen werden neu berechnet.
- Keine Aenderung an Fachlogik, Matching, Katalogregeln, Importformaten oder gespeicherten Daten.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 19:08 Uhr erfolgreich: Deployment `dpl_D5MuR8JG6iEoocCZJdbaVGgTEnpn`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Performance Runde 3

- Die grossen Monitor-App-Einstiegspunkte laden `components/monitor-app.tsx` jetzt ueber `components/monitor-app-loader.tsx` dynamisch nach.
- Alle App-Routen (`/dashboard`, `/reports`, `/standorte`, `/importe`, `/nutzer` sowie die Standortleitungs-Routen) verwenden nun den schlanken Loader statt den direkten Import der grossen Monitor-Komponente.
- Fuer den Zwischenzustand wurde `components/monitor-loading.tsx` ergaenzt und in `app/globals.css` mit einem schlanken Ladebildschirm gestylt.
- Ziel: schnellere erste Seitenreaktion und weniger Arbeit im initialen Route-Bundle. Die bestehende Monitor-App, ihre Props, Berechnungslogik, Fachregeln, Matching-Logik, Importformate und gespeicherten Daten wurden nicht veraendert.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 19:15 Uhr erfolgreich: Deployment `dpl_FkvhLp6eu8EWJewLFHnsgcUoZUoM`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Performance Runde 4

- App-Start priorisiert jetzt vorhandene Browserdaten: Wenn IndexedDB-Importdaten lokal vorhanden sind, wird die App damit sofort sichtbar gemacht, auch wenn parallel ein Serverabgleich laeuft.
- Reine Ableitungen wurden per `WeakMap` gecacht, ohne Formeln oder fachliche Regeln zu veraendern:
  - `summarizeImportRows`
  - `rowsForSparklinePeriod`
  - `buildDeductionRecovery`
  - `buildUnifiedOperationalReviewCases`
  - `buildAnonymousPeerAverage`
- Standort-Dashboard verwendet fuer den eigenen Standort eine stabile Standortliste, damit die Caches nicht durch neu erzeugte Array-Referenzen verfehlt werden.
- Die Caches greifen nur fuer identische In-Memory-Datenreferenzen. Bei neuem Import, Server-Sync, geaenderten manuellen Klaerungen oder neuen Saldo-/Statusdaten entstehen neue Arrays und die Berechnungen laufen neu.
- Keine Aenderung an Fachlogik, Diagrammdefinitionen, Katalog-/Abrechnungsregeln, Matching, Importformaten oder gespeicherten Daten.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` gruen.
- Lokaler Production-Server gestartet; Auth-geschuetzte Routen `/dashboard`, `/standort/dashboard`, `/reports` antworten erwartungsgemaess mit Redirect `307`.
- Vercel Production Deploy am 02.07.2026 ca. 19:55 Uhr erfolgreich: Deployment `dpl_EcAPoav4yYsPRuAPXKQdpUXFTz5y`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Refactor Checkpoint und Stufe 2 Start

- Vor dem groesseren Refactor wurde der aktuelle Arbeitsstand als Git-Checkpoint gesichert und auf `origin/main` gepusht:
  - Commit `f65ad86f` (`Checkpoint current BFS monitor state before refactor`)
  - Dient als Rueckvergleich/Rueckkehrpunkt fuer fachliche Querchecks.
- Erster vorsichtiger Stufe-2-Schnitt: Abrechnungsqualitaet-Analyse wurde teilweise aus `components/monitor-app.tsx` herausgezogen nach `lib/invoice-quality-analysis.ts`.
- Ausgelagert wurden:
  - Invoice-Quality-Typen (`InvoiceQualityFinding`, `InvoiceQualityProfile`, Regeln)
  - kuratierte Regelbasis
  - Musterlogik `buildInvoiceQualityFindingsFromProfiles`
  - Profilbildung `buildInvoiceQualityProfile`
  - Gruppenstatistik, Falltyp-Erkennung, Filter, KPIs, CSV, Export-Vorspann, Trendlabel
- `components/monitor-app.tsx` behaelt aktuell noch die UI und den Wrapper `buildInvoiceQualityFindings`, der Rechnungen filtert, Profile cached und dann die neue Lib-Funktion aufruft. Die bestehende Canonicalisierung/Katalognormalisierung bleibt unveraendert und wird als Callback genutzt.
- Neue Regressionstests fuer Abrechnungsqualitaet ergaenzt:
  - kuratierte Leistungskette `8000 -> 8010`
  - Filter/KPI/CSV-Stabilitaet
- Keine Aenderung an Fachlogik, UI, Diagrammen, Reporttexten, Katalognormalisierung, Matching, Importformaten oder gespeicherten Daten beabsichtigt.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test` (17 Tests), `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploy am 02.07.2026 ca. 20:12 Uhr erfolgreich: Deployment `dpl_HtJQQLkyduqh5R5ZGu7yWwStF8kx`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.

## Update 2026-07-02: Performance Runde 5 / Startpfad

- Vor der Aenderung wurde in echter Chrome-Production-Session gemessen:
  - Reload bis echte Dashboard-KPIs sichtbar: ca. 15,4 Sekunden.
  - Nach der reinen Analyse-Extraktion blieb die Ladezeit bei ca. 15,8-17,1 Sekunden.
  - Befund: Der Nutzer sah lange `App-Modul und Datenstand werden vorbereitet`; der erste harte Blocker war damit nicht die fachliche Abrechnungslogik allein, sondern Startpfad aus grossem Monitor-Modul plus Datenhydration.
- Datenladepfad wurde vorsichtig geaendert:
  - Die App wartet nicht mehr global auf einen Server-Importsync, wenn Browserdaten vorhanden sind.
  - Beim Start wird zuerst IndexedDB/Browsercache gelesen; Serverdaten werden nur bei hartem Sync/`Neu laden` oder fehlenden Browserdaten geladen.
  - Waehrend Importdaten noch hydrieren, wird keine falsche `Keine Uploaddaten`-Ansicht angezeigt.
  - Falls noch keine Importdaten im Speicher sind, bleibt das Dashboard im Ladezustand, damit keine falschen 0-KPIs als echte Auswertung sichtbar werden.
- Loader-Auslieferung wurde angepasst:
  - `components/monitor-app-loader.tsx` nutzt den dynamischen Monitor-Import nicht mehr mit `ssr: false`.
  - Dadurch kann Next/Vercel den grossen Monitor-Chunk frueher in den Route-Startpfad nehmen. Ein Zwischen-Test zeigte, dass das App-Modul dadurch schon nach ca. 1,5 Sekunden sichtbar werden kann.
  - Danach wurde ein Hydration-Risiko beseitigt: `session` startet server- und clientseitig konsistent mit `null`; die echte Session wird im bestehenden Effekt geladen.
- Wichtig: Fachlogik, Kennzahlenformeln, Diagramme, Report-/Exportlogik, Katalog-/Abrechnungsqualitaet, Matching und Importformate wurden nicht veraendert.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test` (17 Tests), `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploys:
  - Datenladepfad: 02.07.2026 ca. 20:27 Uhr, Deployment `dpl_GQ4LsNigSUVXv6PDZaNHkpk6NAMs`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.
  - Loader-Test: 02.07.2026 ca. 20:31 Uhr, Deployment `dpl_2ijesSLGhnVbMgNjBNXgnKuCtEoa`, Status `Ready`; zeigte Modulstart ca. 1,5 Sekunden, aber Hydration-Fehler/kurz 0-KPIs, daher nicht als final bewertet.
  - Korrigierter finaler Stand: 02.07.2026 ca. 20:35 Uhr, Deployment `dpl_7bMrBRZMYEZe4LpQ7bswZUpkH1gs`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.
- Offene Nachmessung: Die echte Chrome-Nachmessung des finalen Deployments wurde gestartet, aber das Browser-Werkzeug lief in ein Timeout/Session-Abbruch. Production-Alias und Buildstatus sind verifiziert; eine weitere echte Chrome-Zeitmessung sollte bei naechster Gelegenheit nachgezogen werden.

## Update 2026-07-02: Performance Runde 6 / Nachtest und sichere Zusatzoptimierungen

- Auf Nutzerwunsch wurde Production erneut in echter Chrome-Session getestet.
- Messwerte vor weiteren Aenderungen:
  - Reload bis echte Dashboard-KPIs sichtbar: ca. 17,4 Sekunden.
  - Zweiter Reload direkt danach: ca. 15,4 Sekunden.
  - Keine Console-Fehler, keine 0-KPIs; sichtbarer Zustand bis dahin `Anmeldung wird geprueft`.
- Sichere Zusatzoptimierungen umgesetzt:
  - Kein synchroner `localStorage`-Importdaten-Parse mehr beim Komponentenstart. `liveImportRows` startet leer, `importRowsHydrating` blockiert falsche 0-Auswertung bis echte Daten da sind.
  - Browsercache und Server-Importdaten laufen beim notwendigen Startup-Sync parallel; die App nimmt den ersten nicht-leeren Datensatz. `Neu laden` bleibt serverorientiert.
  - Eine gueltige lokale Session aus `getStoredSession()` wird im Effekt sofort gesetzt; Servervalidierung laeuft weiter nach.
  - `lib/auth.ts` laedt Supabase nur noch lazy bei Login/Passwort/Supabase-Fallback. Dashboard-Start importiert Supabase nicht mehr direkt.
- Getestete, aber wieder entfernte Idee:
  - Kompakter Dashboard-Startcache wurde gebaut und live getestet, brachte aber keine messbare Verbesserung (`cache-warmup` ca. 17,4s, zweiter Reload ca. 15,2s). Wegen Zusatzkomplexitaet und potenzieller Teil-Daten-Risiken wurde er wieder entfernt.
- Finale Production-Messung nach bereinigten sicheren Optimierungen:
  - Reload bis echte Dashboard-KPIs sichtbar: ca. 17,5 Sekunden.
  - Keine Console-Fehler, keine 0-KPIs.
- Schlussfolgerung: Kleine Startpfad-/Cache-Optimierungen reichen nicht. Der verbleibende Blocker ist sehr wahrscheinlich die monolithische Client-App (`components/monitor-app.tsx`, >13k Zeilen, grosses gemeinsames Bundle) plus initialer Voll-Datenhydration. Der naechste wirksame Schritt ist ein echter Strukturumbau:
  - Dashboard/Management als eigenes schlankes Bundle bzw. eigener Hauptbereich ohne alle Import-, Rechnungsanalyse-, Admin- und Report-Views im Startpfad.
  - Alternativ oder zusaetzlich serverseitig/materialisierte Dashboard-Aggregate statt Voll-Importdaten fuer den ersten Render.
- Geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test` (17 Tests), `pnpm run build` und `git diff --check` gruen.
- Vercel Production Deploys:
  - Datenpfad/Session-Zwischenstaende: `dpl_5NrLM7AUu9CuMEdbrKmWj8oK7sx8`, `dpl_BpJ6o7BGm8Tu5GhC62vwnXQ55Biw`, `dpl_J3PKXjopUsbJ4GE2u5nNF69Vtkqn`.
  - Finale bereinigte sichere Optimierungen: 02.07.2026 ca. 21:00 Uhr, Deployment `dpl_7pQg8XimqBLCMpifvuJe2ekQ8Cmr`, Alias `https://bfs-mandatenuebersicht.vercel.app`, Status `Ready`.
