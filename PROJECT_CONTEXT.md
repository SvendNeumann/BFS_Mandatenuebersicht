# Orisus BFS Monitor - Projektkontext

Stand: 29.06.2026, ca. 21:45 Uhr
Repo: `/Users/svendneumann/Documents/BFS_Mandantenportal`  
Live: `https://bfs-mandatenuebersicht.vercel.app`  
GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`  
Aktueller Fokus: Orisus BFS Monitor mit zwei Hauptbereichen: BFS-Abrechnungen/operative Fallarbeit und BFS-Rechnungsanalyse. BFS-Abrechnungen wurden auf eine klare Geldfluss-Herleitung plus eine gemeinsame operative Pruefliste umgestellt; BFS-Rechnungsanalyse bleibt davon fachlich getrennt.

## Aktuelle Wahrheit kurz

- `BFS-Abrechnungen` nutzt die zentrale Geldflusslogik: `Eingereichter Umsatz - BFS-Gebuehr netto - MwSt - EWMA/Adresspruefung = Auszahlung laut BFS`.
- Separat gilt die operative Abzugslogik: `Offene Pruefsumme = Brutto Storno/Rueckgabe - Bereits geklaert - Endgueltig verloren`.
- `Bereits geklaert` umfasst echte Neueinreichung/Ersatzrechnung, manuell bezahlt/geklaert und Ratenplan laut BFS.
- `Saldo 0` ohne Ratenplan ist kein Zahlungsnachweis. Bei Storno/Rueckgabe bleibt der Fall pruefpflichtig, bis er manuell geklaert, endgueltig storniert oder durch echte Neueinreichung/Ersatzrechnung erklaert ist.
- Die sichtbare operative Fallarbeit ist eine gemeinsame `Pruefliste`. Alte sichtbare Mehrkorb-Listen wie `Praxis nachfassen`, `Zahlung/Grund pruefen` und `Noch nicht zugeordnet` sind keine fuehrenden Haupttabs mehr.
- Gegencheck mit echtem Upload `/Users/svendneumann/Desktop/BFS Uploads`: 839 Abrechnungs-PDFs + 5 Saldolisten, ca. 4.652.836,91 EUR eingereicht, 4.470.324,62 EUR Auszahlung, 74.806,85 EUR Brutto Storno/Rueckgabe, 15.079,31 EUR automatisch geklaert und 59.727,54 EUR offene Pruefsumme vor manuellen Entscheidungen.
- `BFS-Rechnungsanalyse` ist fachlich getrennt von der Storno-/Saldo-Logik. Tabs: `Leistungsuebersicht`, `Potenzialanalyse`, `Standortvergleich`, `Import-Center Rechnungen`.
- Einzelrechnungen: BEMA/Festzuschuss-Rechnungen ohne GOZ-Faktor werden als Beleg erkannt, aber nicht in die GOZ-Faktor-Potenzialanalyse eingerechnet.
- Praxissoftware-Sammeldrucke koennen als alternative Quelle fuer die Rechnungsanalyse relevant werden. Beispiel Kallweit-Sammeldruck: 756 A4-Seiten, bildbasiert ohne eingebetteten PDF-Text; normale PDF-Textextraktion liefert 0 Zeichen. Inhaltlich sind Rechnungsnummer, Patient, Rechnungsdatum, Betrag und Leistungszeilen visuell klar vorhanden, technisch braucht dieser Import aber OCR oder besser einen echten strukturierten Praxissoftware-Export.
- Leistungsnummern: Zahn-/Regionangaben wie `36` werden nicht als Leistungsnummer gruppiert, wenn danach eine echte Leistungsnummer wie `2180` folgt. Die Tabelle zeigt `Leistungsnr.`.
- Prueflisten-Export: PDF/Druck und CSV enden mit den manuellen Spalten `Kommentar` und `Wenn storniert: in der Praxissoftware ausgebucht?`.

## Prompt fuer den naechsten Chat

```text
Bitte lies zuerst `/Users/svendneumann/Documents/BFS_Mandantenportal/PROJECT_CONTEXT.md` vollstaendig ein und arbeite danach im Projekt `/Users/svendneumann/Documents/BFS_Mandantenportal` weiter.

Antworte auf Deutsch. Nutze die bestehende App-Struktur. Wenn du Code aenderst: zuerst relevante Dateien lesen, dann gezielt patchen, danach mindestens `pnpm run typecheck`, `pnpm run build` und `git diff --check` ausfuehren, committen und auf `origin/main` pushen.

Wichtig: Diese Kontextdatei muss nach jedem abgeschlossenen Arbeitsauftrag/Befehl mitgeschrieben werden. Wenn fachliche Logik, UI-Struktur, Importlogik, offene Punkte, Commits oder Pruefergebnisse dazukommen, `PROJECT_CONTEXT.md` am Ende aktualisieren, damit ein neuer Chat nahtlos fortsetzen kann.

Wichtige Dateien:
- `components/monitor-app.tsx`
- `app/globals.css`
- `app/api/imports/parse/route.ts`
- `app/api/invoices/parse/route.ts`
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
  - `Potenzialanalyse`
  - `Standortvergleich`
  - `Import-Center Rechnungen`
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
- Wichtige Tabellen: `bfs_import_batches`, `bfs_documents`, `bfs_abrechnungen`, `bfs_forderungen`, `bfs_bewegungen`, `bfs_cases`, `audit_log`

Vercel:
- Projekt: `bfs-mandatenuebersicht`
- Live-Alias: `https://bfs-mandatenuebersicht.vercel.app`
- Nicht verwechseln mit separatem Projekt `orisus-cfo-dashboard`.
- Deploys laufen ueber Push auf `origin/main`.

Git:
- Immer auf `origin/main` pushen, wenn Aenderungen abgeschlossen sind.
- GitHub-Verbindung wurde repariert und funktionierte zuletzt.

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
- `Leistungsuebersicht`: pro Leistung eigener Faktor bzw. Standortfaktor vs. Gruppenschnitt ohne eigenen Standort, nach Haeufigkeit absteigend sortiert, Tabelle intern scrollbar.
- `Potenzialanalyse`: Euro-Potenzial, Top-Hebel, Monats-/Jahreshochrechnung aus echten Positionsbetraegen gegen Gruppenschnitt ohne eigene Praxis.
- `Standortvergleich`: Rechnungen, Positionen, Umsatz, Fallwert, Durchschnittsfaktor, Laborquote und Potenzial je Praxis.
- `Import-Center Rechnungen`: Daten rein, speichern, pruefen und bei Bedarf `Upload zuruecksetzen`.

Technik:
- `lib/invoice-parser.ts`
- `app/api/invoices/parse/route.ts`
- Import unter `BFS-Rechnungsanalyse > Import-Center Rechnungen`
- Upload unterstuetzt mehrere PDFs sowie Ordner inkl. Unterordner.
- Bestaetigte Rechnungen werden ueber `/api/invoices/parse` in `bfs_invoice_import_batches`, `bfs_patient_invoices` und `bfs_patient_invoice_lines` gespeichert und per `GET` wieder geladen.
- `Upload zuruecksetzen` ruft den serverseitigen DELETE auf und entfernt gespeicherte Rechnungen, Positionen und Import-Batches dauerhaft.
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
- Zahn-/Regionangaben wie `36`, `25`, `37`, `OK`, `UK` duerfen nicht als Leistungsnummer gruppiert werden, wenn danach eine echte GOZ-/GOAe-/Analog-Leistungsnummer folgt.
- Beispiel: `36 modv 2180 ...` wird als Region `36 modv` und Leistungsnr. `2180` gelesen.
- Die Tabelle zeigt deshalb `Leistungsnr.` statt nur `Nr.`.
- BEMA-/Festzuschuss-Rechnungen ohne GOZ-Faktor werden als Beleg erkannt, aber nicht in die GOZ-Faktor-Potenzialanalyse eingerechnet.
- Beispiel `Rechnung_5-18504-73794150.pdf`: BEMA/Festzuschuss + Eigenlabor, keine GOZ-Faktorposition; Importstatus OK, Vorschau `BEMA + Labor`.
- Gegencheck mit 66 PDFs aus `/Users/svendneumann/Desktop/BFS Uploads/3. Einzel-Rechnungen_BFS`: 0 Parser-Statusfehler und 0 auffaellige Faelle, in denen eine zweistellige Zahn-/Regionnummer vor einer echten Leistungsnummer als Leistungscode gruppiert wurde.

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

Wichtige aktuelle Korrektur:
- Standortleitungen duerfen relevante Serverdaten lesen, statt auf lokale Browserdaten zurueckzufallen.
- Manuelle Fall-Erledigung wurde fuer Super-Admins repariert, indem App-Standort-IDs korrekt auf Supabase-Standort-UUIDs gemappt werden.

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
- Stabile Fall-Schluessel basieren auf Standort, Patient, Rechnungsnummer, BFS-Nr., Betrag und Grund.
- Bezahlte/geklaerte und neu eingereichte Faelle reduzieren die offene Pruefsumme und zaehlen als `Bereits geklaert`.
- Endgueltig stornierte Faelle reduzieren die offene Pruefsumme und laufen in die Kachel `Endgueltig verloren`.
- Manuelle Entscheidungen bleiben importuebergreifend stabil, wenn derselbe Vorgang spaeter wieder auftaucht.
- Doppelte Audit-Eintraege fuer denselben Fall wurden als Risiko erkannt und sollten weiterhin verhindert werden.

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
