# Orisus BFS Monitor - Projektkontext

Stand: 28.06.2026, ca. 22:15 Uhr
Repo: `/Users/svendneumann/Documents/BFS_Mandantenportal`  
Live: `https://bfs-mandatenuebersicht.vercel.app`  
GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`  
Aktueller Fokus: CFO-/Management-Cockpit, Zusammenfassung/KPI-/Benchmark-Tab, stabile Live-Daten, saubere Rollenrechte, mobile/Desktop-Qualitaet und exportfaehige Steuerungsansichten.

## Prompt fuer den naechsten Chat

```text
Bitte lies zuerst `/Users/svendneumann/Documents/BFS_Mandantenportal/PROJECT_CONTEXT.md` vollstaendig ein und arbeite danach im Projekt `/Users/svendneumann/Documents/BFS_Mandantenportal` weiter.

Antworte auf Deutsch. Nutze die bestehende App-Struktur. Wenn du Code aenderst: zuerst relevante Dateien lesen, dann gezielt patchen, danach mindestens `pnpm run typecheck`, `pnpm run build` und `git diff --check` ausfuehren, committen und auf `origin/main` pushen.

Wichtige Dateien:
- `components/monitor-app.tsx`
- `app/globals.css`
- `app/api/imports/parse/route.ts`
- `app/api/cases/resolutions/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[userId]/route.ts`
- `lib/bfs-parser.ts`
- `lib/demo-data.ts`
- `lib/demo-import.ts`
- `lib/server-auth.ts`
- `proxy.ts`
- `supabase/migrations/*`

App: Orisus BFS Monitor. Ziel: BFS-Abrechnungen fuer Orisus-Standorte produktiv importieren, auswerten, steuern und als CFO-/Management-Cockpit sichtbar machen: Umsatz eingereicht, Auszahlung, BFS-Gebuehren, MwSt, EWMA/Meldeamtabfragen, Rueckgaben, Stornos, offene Klaerfaelle, Matching/Neueinreichungen, ohne Ausfallschutz, Patientenqualitaet, Standort-Benchmark und Reports.
```

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
- Management
- Analyse & Benchmarking
- Operative Fallarbeit
- Reports
- Import & Pruefung
- Admin Bereich

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
  - CFO-Schnellantwort-Kacheln stehen nur noch hier, nicht doppelt im Cockpit.
- `Standorte`
  - Standort-Benchmark mit KPI-Dreierreihe, vier Erklaerkacheln, zwei Umsatzdiagrammen und Standortvergleich.
  - `Standorte im Vergleich` hat einen eigenen Zeitraumfilter.
- `Standortdetails`
  - Ehemals `Forderungen & Geldfluss`.

## Wichtigste fachliche Weiterentwicklung

Der aktuelle Stand kann bereits importieren, auswerten, Klaerfaelle anzeigen und Standortdaten vergleichen. Der naechste grosse Produktschritt sollte aber klarer in Richtung CFO-Cockpit gehen.

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
- Dunkles CFO-/Controlling-Dashboard.
- Navy/Petrol, transparente Cards, cyan/tuerkise Akzente.
- Ruhig, professionell, internes Boardroom-Tool.
- Keine Marketing-Landingpage, keine Spielerei.

Aktuell wichtige UI-Entscheidungen:
- Mobile Header mit Logo und Menuebutton wurde neu proportioniert.
- Klick auf Logo soll immer ins Cockpit fuehren.
- Standortleiste und relevante Content-Steuerung sollen sticky bleiben, solange darunter Inhalte darauf reagieren.
- Desktop: linke Navigation laeuft beim Scrollen mit/fixed, damit nie links leerer Raum ohne Menue entsteht.
- Mobile: Drawer/Off-canvas Navigation.
- Prioritaeten-Buttons oben in den Tabs sind entfernt. `Prioritaeten heute` liegt im Reiter `Operative Fallarbeit`.
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

## Zuletzt umgesetzte wichtige Aenderungen

Aktuelle letzte Commits/Aenderungen:
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
- `Prioritaeten heute` liegt im Reiter `Operative Fallarbeit`.
- Linke Desktop-Navigation bleibt beim Scrollen sichtbar.
- Endgueltig stornierte Klaerfaelle koennen manuell geklaert werden und verschwinden aus offenen Arbeitslisten/Neueinreichungsvorschlaegen.
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
PATH="/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH" pnpm run build
git diff --check
```

Wichtige offene technische Punkte:
- Automatisierte Tests fehlen weiterhin.
- Besonders testwuerdig:
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

## Wenn ich als CFO/Geschaeftsfuehrer weiterentwickeln wuerde

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
