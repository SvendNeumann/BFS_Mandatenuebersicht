# Orisus BFS Monitor - Projektkontext

Stand: 27.06.2026

## Projekt

Web-App: **Orisus BFS Monitor**

Ziel der App: BFS-Abrechnungen je Standort auswerten, offene Klärfälle/Rückbelastungen/Stornos erkennen, Patienten ohne Ausfallschutz klassifizieren, Neueinreichungen nach Rückgabe/Storno matchen und CFO-/Standortleiter-Auswertungen ermöglichen.

Repository:
- Lokal: `/Users/svendneumann/Documents/BFS_Mandantenportal`
- GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`
- Hauptbranch: `main`

Deployment:
- Vercel-Projekt ist angebunden.
- App war erreichbar unter `bfs-mandatenuebersicht.vercel.app`.

## Aktueller technischer Stand

Framework:
- Next.js App Router
- React
- TypeScript
- Lokale Demo-/Uploaddaten im Browser, keine echte Produktivdatenbanklogik aktiv
- Supabase-Struktur vorbereitet, aber Fachlogik aktuell primär clientseitig/Demo-Import

Wichtige Dateien:
- `components/monitor-app.tsx`: Haupt-App, Navigation, Dashboards, KPIs, Upload, Tabellen, Reports, Matching-Views
- `lib/bfs-parser.ts`: PDF-/BFS-Textparser
- `lib/demo-import.ts`: Upload-Verarbeitung, Datei-/Ordnerimport, Vorschau, Matching-Hinweise
- `lib/demo-data.ts`: Demo-Standorte, Demo-KPIs, Perioden-/Standortdaten
- `lib/types.ts`: zentrale Typen
- `app/globals.css`: komplettes Layout/Design/Responsive Styling

## Standorte

Aktive bzw. vorbereitete Standorte:
- Kirchberg, live seit 01.07.2024
- Essen, live seit 01.01.2025
- Kehl, live seit 01.04.2025
- Ulmet, live seit 01.07.2025
- Hüttenberg, live seit 01.01.2026
- Kassel, vorbereitet, live ab 01.07.2026

Mandantennummern/Zuordnung:
- Essen: u.a. `18790`
- Ulmet: `19260`, `19668`, `19669`
- Kassel/Spohr: `20309`, `20902`
- Aligner-Konten sollen dem jeweiligen Standort zugeordnet werden, nicht separat behandelt werden.

## Wichtige Fachlogik

### Upload

Upload soll ganze Ordner und Unterordner unterstützen.
Beispielstruktur:

```text
BFS Uploads/
  4. BFS_Ulmet/
    2026/
      01/
        AbrechnungsNachweis_19260_56.pdf
```

Die App soll rekursiv durch Unterordner laufen und alle PDFs einlesen.

Wichtig:
- Der Upload bleibt lokal im Browser/Demo-Modus gespeichert.
- Trotzdem soll er sich wie Live-Daten verhalten.
- Neue Rechnungen sollen erkannt werden.
- Doppelte Dateien werden über Hash/Dateiinformationen geprüft.

### BFS-Auswertung

Grundsatz für Geldfluss:
- Umsatz eingereicht
- BFS-Gebühr netto
- MwSt auf Gebühren
- Gesamtkosten BFS = BFS-Gebühr netto + MwSt
- Auszahlungsbetrag
- Rückgaben/Rückbelastungen
- Stornierungen
- Storno-/Rückgabe-Abzug
- Wieder reingeholt durch spätere Neueinreichung
- Noch nicht reingeholt/offen

Es gibt inzwischen explizite Quoten:
- Stornoquote = Stornobetrag / eingereichter Umsatz
- Abzugsquote = Rückläufer + Stornos / eingereichter Umsatz
- Nicht reingeholt Quote = noch nicht gematchter Abzug / eingereichter Umsatz
- Matchingquote = wieder reingeholter Betrag / gesamte Abzugssumme

### Matching

Wichtigste fachliche Logik:
Wenn ein Patient in einer Abrechnung eingereicht wurde und später in einer Kontoauszug-/Rückgabe-/Storno-Zeile auftaucht, muss erkannt werden:
- Patient
- BFS-Nummer
- Rechnungsnummer
- Betrag
- Grund/Bemerkung, z.B. unzustellbar, laut Nachricht, laut Factoringsvereinbarung, ohne Ausfallschutz, sonstiger Grund

Wenn derselbe Patient später wieder in einer Forderungsliste auftaucht, soll das als Neueinreichung/Wiedereinholung erkannt werden.

Offen ist vor allem:
- exakte Auswertung realer großer Ordner, z.B. `/Users/svendneumann/Desktop/BFS Uploads/4. BFS_Ulmet/`
- Vergleich, warum die App aktuell nur eine kleine offene Zahl anzeigt
- unabhängige Parser-Auswertung gegen alle PDF-Dateien im Ordner

## Aktuelle User-Frage vor Erstellung dieser Datei

Der User möchte den Ordner:

```text
/Users/svendneumann/Desktop/BFS Uploads/4. BFS_Ulmet/
```

komplett auswerten:
- Wie viele offene Fälle/Stornierungen sind dort tatsächlich noch offen?
- Wie viele Patienten haben nicht bezahlt bzw. wurden rückbelastet?
- Was ist noch nicht wieder reingeholt?
- Warum zeigt die App nur eine sehr kleine Zahl?

Für diese Analyse wurden Leserechte auf den Ordner bereits angefragt und im aktuellen Chat für die Session genehmigt. In einem neuen Chat müssen die Leserechte ggf. erneut angefragt werden.

Empfohlener nächster Schritt:
1. PDFs im Ordner rekursiv zählen.
2. Mit bestehendem Parser oder separatem Analyse-Script alle PDFs extrahieren.
3. Bewegungen/Rückgaben/Stornos sammeln.
4. Forderungslisten sammeln.
5. Matching nach Patient, BFS-Nr., Rechnungsnummer, Datum und Betrag durchführen.
6. Offene, wieder eingereichte und bezahlte/erledigte Fälle tabellarisch ausgeben.
7. Ergebnis mit App-Anzeige vergleichen.

## UI-/UX-Stand

Design:
- Dunkles Navy/Teal Premium-Dashboard
- Orisus-Zahnmedizin-Branding im mobilen Header
- Mobile Header ist fixed
- Desktop: Sidebar dauerhaft sichtbar
- Mobile/Tablet: Off-Canvas Drawer mit Overlay
- Drawer zeigt Nutzer/Sitzung, Rolle, Standort/Scope
- Drawer hat `Neu laden` Button für harten Refresh
- Navigation ist Accordion: immer nur ein Menübereich offen
- Upload-Shortcut wurde aus den normalen Tabs entfernt; Upload nur über den Bereich `Import & Prüfung`

Responsive:
- App wurde mehrfach auf Mobile/Tablet geprüft
- Später soll nochmal ein gesamter Mobile-Check erfolgen, aber nicht nach jeder kleinen Änderung

Diagramme:
- Balkendiagramme haben interaktive Tooltips
- Desktop: Hover
- Mobile/Tablet: Tap

KPI-Kacheln:
- Haben Info-Icon mit Herleitung
- Zeitraum-Badge ist sichtbar, z.B. aktueller Monat, aktueller Datenstand, aktueller Testupload, Quartal/Jahr

## Wichtige letzte Commits

Letzte fachlich relevante Commits:
- `e4aabe9` - Add interactive chart tooltips
- `6c43800` - Add cancellation and recovery rates
- `e87210c` - Remove global upload shortcut
- `b4c1bad` - Improve mobile drawer session controls
- `fe00c67` - Harden mobile responsive layout

## Arbeitsweise/Wünsche des Users

Der User möchte:
- deutschsprachige Antworten
- praktisch und direkt
- keine unnötigen langen Mobile-Checks nach jeder Kleinigkeit
- am Ende größerer Blöcke einmal sauber gesamt testen
- keine fachliche Logik unnötig ändern, nur gezielt verbessern
- App soll CFO-tauglich sein: schnell offene Beträge, Rückläufer, Stornos, Gebühren, MwSt, Auszahlungsbetrag, Quoten und Standortvergleiche sehen

## Wichtig für neuen Chat

Wenn ein neuer Chat diesen Kontext liest:
1. Zuerst `PROJECT_CONTEXT.md` lesen.
2. Dann bei Bedarf relevante Dateien prüfen:
   - `components/monitor-app.tsx`
   - `lib/bfs-parser.ts`
   - `lib/demo-import.ts`
   - `lib/demo-data.ts`
   - `lib/types.ts`
3. Bei Uploadordnern außerhalb des Repo-Lesezugriff explizit anfragen.
4. Für große PDF-Auswertung nicht nur App-Anzeige glauben, sondern unabhängig alle PDF-Dateien auswerten.
5. Ergebnis immer mit Summen liefern:
   - Anzahl Rückgaben/Stornos
   - Betrag Rückgaben/Stornos
   - Anzahl eindeutig Patienten zugeordnet
   - wieder eingereicht/gematcht
   - noch offen
   - offene Summe
   - wichtigste Patienten/Fälle

