# Orisus BFS Monitor - Projektkontext

Stand: 29.06.2026, ca. 10:40 Uhr
Repo: `/Users/svendneumann/Documents/BFS_Mandantenportal`  
Live: `https://bfs-mandatenuebersicht.vercel.app`  
GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`  
Aktueller Fokus: Orisus BFS Monitor mit zwei Hauptbereichen: BFS-Abrechnungen/operative Fallarbeit und BFS-Rechnungsanalyse. Neu hinzugekommen sind Rechnungs-PDF-Import, BFS-Rechnungsstatus-/Saldo-Listen, Monats-Pruefkorb fuer Praxis-Aufgaben, Patientenklassifizierung, bereinigte Tab-Struktur, responsive/visuelle Konsistenz und scrollbare Arbeitslisten.

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
  - Operative Fallarbeit
  - Reports
  - Import-Center Abrechnung
- Oberreiter `BFS-Rechnungsanalyse`
  - Auswertungen
    - Rechnungsuebersicht
    - Leistungsanalyse
    - Laboranalyse
  - Import & Pruefung
    - Import-Center Rechnungen
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
- `Matching & Neueinreichungen`
  - Wurde vor `Klaerfaelle` geschoben, weil fachlich zuerst Neueinreichungen/Matching geprueft werden sollen.
  - Fruehere Diagramme entfernt, Tabelle als Scrolltabelle.
  - Neueinreichungen koennen analog zu Klaerfaellen bestaetigt/abgelehnt werden.
  - Wenn `Stimmt`: Position laeuft in erfolgreiche Wiederholung/Zurueckholung.
  - Wenn `Abgelehnt`: Position laeuft in Stornierung/offen.
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

Neu aufgebauter zweiter Fachbereich: `BFS-Rechnungsanalyse`.

Ziel:
- BFS-Patientenrechnungen aus dem BFS-Portal einlesen.
- Je Standort auswerten, welche Abrechnungsnummern/Leistungsnummern wie oft abgerechnet werden.
- Faktoren, Betraege und Leistungsbeschreibungen je Standort vergleichen.
- Standorte challengen: z. B. "Ulmet rechnet Position X auffaellig niedrig/selten ab im Vergleich zu Standort Y".
- Eigenlabor und Fremdlabor erkennen und getrennt auswerten.
- Spaeter Matching/Neueinreichungen fachlich verbessern, weil Rechnungen Behandlungszeitraum, Positionen, Faktoren und Rechnungsnummern enthalten.

Technik:
- `lib/invoice-parser.ts`
- `app/api/invoices/parse/route.ts`
- Import unter `BFS-Rechnungsanalyse > Import & Pruefung > Import-Center Rechnungen`
- Upload unterstuetzt mehrere PDFs sowie Ordner inkl. Unterordner.
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
  - Leistungszeilen mit Nr./Code, zusammengefasster Leistungsbeschreibung, Faktor, Menge, Betrag, Kategorie

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
- `Saldo 0,00 EUR` = bezahlt / erledigt.
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
- `Durch Saldo korrigiert`: Storno-/Klaerfaelle, die per Saldo 0 oder RP als erledigt erkannt werden.
- `Automatisch erledigt`: alle Statuslisten-Zeilen mit Saldo 0 oder RP.
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
- `Saldo 0` = Fall kann aus operativer Fallarbeit raus, weil bezahlt/erledigt.
- `Ratenplan` = fuer Orisus ebenfalls raus aus aktiver Klaerung, weil BFS das fuehrt.
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

## Klaerfaelle / Manuelle Bearbeitung

Klaerfaelle koennen operativ bearbeitet werden.

Aktuelle Logik:
- Fall als bezahlt/erledigt markieren.
- Markierung wird serverseitig im `audit_log` gespeichert.
- Stabile Fall-Schluessel basieren auf Standort, Patient, Rechnungsnummer, BFS-Nr., Betrag und Grund.
- Erledigte Faelle werden importuebergreifend ausgeblendet, wenn derselbe Vorgang spaeter wieder auftaucht.
- Manuell erledigte Faelle zaehlen bei Recovery-/Erledigungsquoten mit.
- Doppelte Audit-Eintraege fuer denselben Fall wurden als Risiko erkannt und sollten weiterhin verhindert werden.

Noch wichtig fuer Produktlogik:
- "Bezahlt/erledigt" bedeutet: fachlich geklaert und nicht mehr operativ offen.
- "Weiterhin offen" bedeutet: nicht als bezahlt bestaetigt und muss in Klaerfaelle/Fallarbeit sichtbar bleiben.
- Browser-native Confirm-Dialoge sollen nicht verwendet werden; stattdessen App-Popups/Dialoge.

## Storno / Rueckgabe / Recovery

Die App unterscheidet:
- Rueckgabe/Rueckbelastung/Storno: urspruenglicher Abzug bzw. negativer Vorgang.
- Neueinreichung/Recovery: spaeter erkannte erneute Forderung desselben Patienten/Vorgangs.
- Manuell bezahlt: fachlich vom Nutzer als erledigt bestaetigt.
- Operativ offen: echter Fallbestand, der noch bearbeitet werden muss.

Wichtig bei Beschriftungen:
- Recovery-Betrag kann hoeher sein als urspruenglicher Abzug, wenn spaetere Neueinreichungen mehr als den alten Abzug enthalten. Das muss eindeutig als "spaeter erneut eingereichte Summe" oder aehnlich beschriftet sein, nicht als 1:1 Rueckholung des alten Betrags.
- Quoten muessen klar sagen, ob sie sich auf Anzahl Faelle, Abzugssumme oder eingereichten Umsatz beziehen.
- `110/226 erledigt` und `operativ offen 161` duerfen nicht missverstaendlich addiert werden, wenn sie unterschiedliche Grundgesamtheiten/Definitionen haben. Entweder logisch entdoppeln oder sehr klar beschriften.

Aktuelle Korrektur im Zusammenfassung-Tab:
- Der fruehere Tab `Individuell` heisst jetzt `Zusammenfassung`.
- KPI `Anzahl Stornierungen` zeigt die Storno-Grundmenge im gewaehlten Zeitraum.
- KPI `Davon gewandelt` zeigt, wie viele dieser Storno-Zeilen inzwischen erledigt/gewandelt sind.
- Als gewandelt gelten Zahlung nach Storno, erkannte spaetere Neueinreichung oder manuelle Markierung als bezahlt.
- Das Diagramm `Stornierungen vs. zurueckgeholt` ordnet `zurueckgeholt` dem urspruenglichen Storno-Monat zu. Dadurch passt die Linie zur Storno-Grundmenge und faellt nicht faelschlich auf 0, nur weil die erfolgreiche Wandlung spaeter datiert ist.
- Fachliche Regel: `zurueckgeholt` und `gewandelt` sind dieselbe Managementlogik.
- Endgueltig stornierte Faelle koennen manuell als `endgueltig storniert` geklaert werden. Sie verschwinden aus der offenen Klaerliste und aus Neueinreichungsvorschlaegen, bleiben aber als dauerhaft storniert in Storno-Auswertungen enthalten.

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

## Zuletzt umgesetzte wichtige Aenderungen

Aktuelle letzte Commits/Aenderungen:
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
- Saldo-Import-Kacheln unterscheiden Statuszeilen, Storno-Basis, durch Saldo korrigiert, automatisch erledigt, kritisch offen, Mahnstufen kritisch, ohne Schutz offen und nicht zuordenbar.
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
- Saldo 0 und RP als erledigt/aus operativer Arbeitsliste raus.
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
