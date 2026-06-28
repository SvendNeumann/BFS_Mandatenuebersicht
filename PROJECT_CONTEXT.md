# Orisus BFS Monitor - Projektkontext

Stand: 28.06.2026, ca. 18:20 Uhr
Repo: `/Users/svendneumann/Documents/BFS_Mandantenportal`  
Live: `https://bfs-mandatenuebersicht.vercel.app`  
GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`  
Aktueller Fokus: CFO-/Management-Cockpit, individuelles KPI-/Benchmark-Tab, stabile Live-Daten, saubere Rollenrechte, mobile/Desktop-Qualitaet und exportfaehige Steuerungsansichten.

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
   - Standortvergleich, Forderungen & Geldfluss, Forderungsqualitaet, Patientenqualitaet.
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

Wichtige neue Sicht:
- `Individuell`
  - Frei gestalteter KPI-/Chart-/Benchmark-Bereich fuer zentrale Steuerungskennzahlen.
  - Eigene KPI-Zeitraum- und Standortauswahl.
  - Eigene Diagramm-Zeitraum- und Standortauswahl.
  - Eigene Benchmark-Zeitauswahl fuer die Tabelle "Standorte nach Kennzahlen vergleichen".
  - PDF-Export des gesamten Tabs im Querformat, auf eine Seite skaliert.

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

Aktuelle Korrektur im individuellen Tab:
- KPI `Anzahl Stornierungen` zeigt die Storno-Grundmenge im gewaehlten Zeitraum.
- KPI `Davon gewandelt` zeigt, wie viele dieser Storno-Zeilen inzwischen erledigt/gewandelt sind.
- Als gewandelt gelten Zahlung nach Storno, erkannte spaetere Neueinreichung oder manuelle Markierung als bezahlt.
- Das Diagramm `Stornierungen vs. zurueckgeholt` ordnet `zurueckgeholt` dem urspruenglichen Storno-Monat zu. Dadurch passt die Linie zur Storno-Grundmenge und faellt nicht faelschlich auf 0, nur weil die erfolgreiche Wandlung spaeter datiert ist.

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
- Im Tab `Individuell` existiert ein PDF-Export fuer den gesamten Tab. Ziel: A4 Querformat, komplette Ansicht auf eine Seite skaliert, kein mehrseitiger zerhackter Druck. Technisch oeffnet die App ein Druckfenster; bei blockiertem Popup gibt es einen HTML-Fallback.

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
- Desktop/Tablet: linke Navigation sticky.
- Mobile: Drawer/Off-canvas Navigation.
- KPI-Karten auf Tablet muessen in sinnvoll grossen Grids laufen, nicht zu schmal werden.
- Tabellen appweit kompakter und intern scrollbar.
- Lange Detailtabellen duerfen Seiten nicht endlos verlaengern.

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
- Im individuellen Tab haben `Umsatz eingereicht vs. ausgezahlt` und `Forderungen vs. Stornierungen` echte Tooltips im Diagramm. Linienpunkte sind auf die Balkenmitte ausgerichtet.

Individuell-Tab aktueller Aufbau:
1. Oben Zeitraum + Standort fuer KPI-Kacheln und PDF-Export.
2. KPI-Reihe 1: Eingereichter Umsatz, BFS-Gebuehren, Ausgezahlter Umsatz.
3. KPI-Reihe 2: Anzahl Stornierungen, Davon gewandelt, Eingereichte Rechnungen, Durchschnittlicher Wert je Forderung.
4. KPI-Kacheln haben Sparklines und Info-Herleitungen.
5. Darunter eigene Zeitraum-/Standortauswahl fuer Diagramme.
6. Diagramme:
   - Umsatz eingereicht vs. ausgezahlt als Kombi-Chart.
   - Forderungen vs. Stornierungen mit zweiter Skala fuer Stornos.
   - Patienten mit/ohne Ausfallschutz als Donut.
   - Stornierungen vs. zurueckgeholt.
7. Darunter Benchmark-Tabelle mit eigener Zeitauswahl.
8. Desktop: grosse, zweispaltige Charts; mobile: untereinander/scrollbar passend.

## Zuletzt umgesetzte wichtige Aenderungen

Aktuelle letzte Commits:
- `80aac379 Add separate custom benchmark period filter`
- `38e5b78f Improve custom chart tooltips and storno recovery`
- `7dd08f91 Add one-page custom PDF export`
- `beac01ec Add custom benchmark table`
- `8fd2777b Add custom KPI sparklines`
- `bddec3c7 Add average claim KPI`
- `cd6be5a4 Align storno counts across app`
- `29075bfe Keep content controls sticky while scrolling`
- `76c473fc Default period filters to 2026 YTD`
- `4f71bf83 Improve tablet answer cards`
- `ac27a80f Improve tablet KPI cards`
- `c65d9704 Fix manual case resolution permissions`
- `3a0586ec Clean up mobile chart bars`
- `15792694 Format fee rate with two decimals`
- `df5e7a26 Refine mobile header proportions`
- `ad9b32b3 Fix single-location chart bars`
- `a2f04fa4 Make logo open cockpit`
- `9c9a5444 Add sparklines to KPI cards`
- `ca1c1086 Add KPI sparklines to answer cards`

Damit ist zuletzt erledigt:
- Individuell-Tab mit 7 KPI-Kacheln, Sparklines und Info-Herleitungen.
- Individuell-Tab hat vier Charts mit separater Zeitraum-/Standortsteuerung.
- Individuell-Tab hat Benchmark-Tabelle mit eigener Zeitauswahl fuer Jahre, Quartale und Monate.
- PDF-Export fuer gesamten Individuell-Tab im Querformat, auf eine Seite skaliert.
- Chart-Tooltips fuer individuelle Kombi-/Dual-Axis-Charts.
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
  - Individuell-Tab PDF-Export in echten Browsern auf Desktop/Mobile
  - Individuell-Tab Benchmark-Zeitraumfilter
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
