# Orisus BFS Monitor - Projektkontext

Stand: 27.06.2026, ca. 23:58 Uhr
Repo: `/Users/svendneumann/Documents/BFS_Mandantenportal`  
Live: `https://bfs-mandatenuebersicht.vercel.app`  
GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`  
Aktueller Head: `17de9a71 Replace stale failed PDF imports`

## Prompt fuer den naechsten Chat

```text
Bitte lies zuerst `/Users/svendneumann/Documents/BFS_Mandantenportal/PROJECT_CONTEXT.md` vollstaendig ein und arbeite danach im Projekt `/Users/svendneumann/Documents/BFS_Mandantenportal` weiter.

Antworte auf Deutsch. Nutze die bestehende App-Struktur. Wenn du Code aenderst: zuerst relevante Dateien lesen, dann gezielt patchen, danach `pnpm run typecheck` und `pnpm run build` ausfuehren, committen und pushen.

Wichtige Dateien:
- `components/monitor-app.tsx`
- `app/api/imports/parse/route.ts`
- `lib/bfs-parser.ts`
- `lib/demo-import.ts`
- `lib/server-auth.ts`
- `proxy.ts`
- `app/globals.css`
- `supabase/migrations/*`

App: Orisus BFS Monitor. Ziel: BFS-Abrechnungen fuer Orisus-Standorte produktiv importieren, auswerten und statistisch analysieren: Umsatz eingereicht, Auszahlung, BFS-Gebuehr netto, MwSt, EWMA/Meldeamtabfragen, Rueckgaben, Stornos, offene Klaerfaelle, Matching/Neueinreichungen, ohne Ausfallschutz, Reports.
```

## Aktueller Live-Stand

Die App ist live auf Vercel und mit Supabase verbunden.

Supabase:
- Project ref: `dozcaktodvogbkiomcqo`
- URL: `https://dozcaktodvogbkiomcqo.supabase.co`
- Auth laeuft wieder sauber ueber Supabase Auth.
- Super-Admin: `svend.neumann@orisus.de`
- Supabase bestaetigte zuletzt:
  - E-Mail bestaetigt
  - nicht gesperrt
  - Profil `super_admin`
  - `active=true`
  - Login war erfolgreich sichtbar ueber `last_sign_in_at`

Vercel:
- Production Env ist gesetzt:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / Publishable Key
  - `SUPABASE_SERVICE_ROLE_KEY`
- Dieses Repo ist lokal mit dem Vercel-Projekt `bfs-mandatenuebersicht` verknuepft.
- Nicht verwechseln mit dem separaten Vercel-Projekt `orisus-cfo-dashboard`.
- Letzter Production-Deploy: `dpl_DYt8714ViG7mbkxQ2VnCKzEzRRtA`.
- Alias: `https://bfs-mandatenuebersicht.vercel.app`.
- Deploy-URL: `https://bfs-mandatenuebersicht-4uvscd76v-orisus.vercel.app`.
- Smoke-Test nach Deploy: Startseite erreichbar, `/dashboard` leitet ohne Session erwartungsgemaess auf `/login`.
- Deploys laufen ueber Git push auf `main` oder direkt per Vercel CLI.
- GitHub-Push war kurz blockiert, weil Git keinen Credential-Helper nutzte. Reparatur: Repo-lokaler Credential-Helper `/Library/Developer/CommandLineTools/usr/libexec/git-core/git-credential-osxkeychain`.
- Danach funktionierte `git push origin main` wieder.
- Lokale Shell kann Vercel/Supabase DNS teilweise nicht per `curl` aufloesen. Das ist ein lokales Shell-/DNS-Problem; Browser/Live-App funktionierten beim User.

## Letzte wichtige Commits

- `17de9a71 Replace stale failed PDF imports`
  - Alte fehlerhafte PDF.js-Importe werden nicht mehr als gueltige Dubletten behandelt.
  - Persistierte kaputte Vorschauzeilen mit fehlender PDF-Extraktion werden ausgeblendet bzw. beim Reupload ersetzt.

- `41c5e37b Fix Vercel PDF worker loading`
  - Vercel/Node PDF.js Fehler `Setting up fake worker failed` behoben.
  - Server-PDF-Extraktion laedt den PDF.js Worker vor und funktioniert wieder mit echten BFS-PDFs.

- `2280eb6b Document metric wording normalization`
  - Projektkontext nach Kacheltext-Fix aktualisiert.

- `fd43d82c Normalize import wording in metric cards`
  - Kachel-Hinweise und Zeitraum-Badges normalisieren alte gespeicherte Testupload-Wortlaute zu produktiven Begriffen.
  - Sichtbare Kacheltexte zeigen `aktueller Import` statt `aktueller Testupload`.

- `7b698194 Fix metric info popovers`
  - KPI-/Metric-Infoboxen werden nicht mehr von Karten abgeschnitten.
  - Es bleibt appweit nur eine Infobox offen; Klick auf das naechste `i` schliesst die vorherige.
  - Infobox schliesst auch bei Escape, Scroll, Resize und Hintergrundklick.

- `adb9511b Improve import confirmation contrast`
  - Import-Bestaetigungsdialog lesbar gemacht: dunkle Kacheln, helle Werte, kontrastreiche Labels.

- `4a8df726 Preserve monitor view on reload`
  - Browser-Refresh und Button `Neu laden` behalten aktuelle Ansicht und Standortauswahl bei.
  - Datenstand wird trotzdem vollstaendig neu geladen.

- `e2259a6f Reset server import data with upload reset`
  - Upload-Reset archiviert serverseitig importierte Dokumente.
  - Tabwechsel/Refresh holt danach nicht wieder alte Importdaten zurueck.

- `68a5a1c8 Remove test wording from import flow`
  - Sichtbare Test-/Demo-Begriffe im Import-Center entfernt.

- `a255e908 Add import issue report and preserve failed files`
  - Fehlerbericht/Druck-PDF fuer Importanalyse ergaenzt.
  - Einzelne fehlerhafte Importdateien bleiben sichtbar.

- `afc8e68d Redesign BFS landing login page`
  - Startseite nach Referenzaufbau neu gestaltet mit BFS-/Orisus-Inhalten und Login-Panel.

- `9c43431a Chunk large folder imports`
  - grosser Ordnerupload wird clientseitig in kleine Chunks gesplittet
  - max. 6 PDFs bzw. ca. 3,5 MB pro Request
  - fehlerhafte Chunks werden rekursiv halbiert
  - einzelne Problemdateien werden isoliert statt ganzen Upload abzubrechen
  - alte `error`-Dokumente blockieren Reimport mit gleichem Hash nicht mehr

- `225c0d8c Fix mobile summary label wrapping`
  - Mobile-Label-Overflow in Zusammenfassungs-Kacheln behoben

- `5df17062 Tighten responsive layout guardrails`
  - Desktop/Tablet/Mobile Layout guardrails
  - Standort-Tabs auf Tablet/Mobile stabilisiert

- `5f899f66 Clear stale import previews and preserve folder paths`
  - alte lokale IndexedDB-Vorschauen werden nicht mehr als Wahrheit angezeigt, wenn Serverdaten leer sind
  - Import-API `GET/POST` mit `no-store`
  - relative Ordnerpfade werden explizit als `paths` mitgesendet

- `db60de0b Fix server PDF text extraction`
  - Vercel/Node PDF.js Fehler `DOMMatrix is not defined` behoben
  - serverseitige PDF-Extraktion funktioniert wieder mit echten BFS-PDFs

- `0d8529bc Make import status and dashboard data consistent`
  - Supabase ist die serverseitige Import-Datenquelle
  - Kacheln laden persistierte Importdaten aus Supabase
  - Status unterscheidet importiert / Dublette / Fehler

- `972a32e5 Remove super admin auth fallback`
  - Notfall-App-Session-Fallback entfernt
  - Login nur noch Supabase Auth

## Upload / Import

Aktuelle Architektur:
- Frontend: `components/monitor-app.tsx`
- Server-Endpoint: `app/api/imports/parse/route.ts`
- Parser: `lib/bfs-parser.ts`, `lib/demo-import.ts`
- Storage: privater Supabase Bucket `bfs-documents`
- Tabellen:
  - `bfs_import_batches`
  - `bfs_documents`
  - `bfs_abrechnungen`
  - `bfs_forderungen`
  - `bfs_bewegungen`
  - `bfs_cases`

Wichtig:
- Nur PDFs werden verarbeitet.
- Nicht-PDFs im Ordner werden ausgesortiert.
- Dubletten werden ueber Hash und fachliche Identitaet erkannt.
- Fachliche Identitaet: Mandant-Nr. + Abrechnungs-Nr. + Standort.
- Eine Abrechnung mit gleicher Abrechnungsnummer darf nicht doppelt gerechnet werden.
- Alte fehlgeschlagene `error`-Dokumente blockieren erneuten Upload nicht mehr.
- Alte fehlgeschlagene PDF.js-/Fake-Worker-Importe blockieren erneuten Upload nicht mehr, auch wenn sie vorher faelschlich als `imported` gespeichert wurden.

Grosser Ordner:
- User-Ordner: `/Users/svendneumann/Desktop/BFS Uploads/`
- Gemessen: 839 PDFs, ca. 542 MB.
- Ein einzelner Request ist fuer Vercel zu gross.
- Deshalb chunked Upload:
  - max. 6 PDFs pro Chunk
  - max. ca. 3,5 MB pro Chunk
  - automatisches Splitten bei Fehlern
  - Fortschritt zeigt `Paket x/y`

Wenn der grosse Ordner weiter scheitert:
- zuerst pruefen, ob der aktuellste Vercel-Deploy mit `17de9a71` aktiv ist.
- hart neu laden.
- Browser-Konsole/Network fuer `/api/imports/parse` pruefen.
- Wenn einzelne Chunks scheitern, sollte Status die konkrete Einzeldatei nennen.
- Naechster sinnvoller Schritt waere eine echte Job-/Queue-Architektur, falls Vercel Function-Laufzeit trotz Chunking fuer 839 PDFs noch zu eng wird.

## Bekannter alter Fehler und Bereinigung

Alte Fehler:
- Server-PDF-Parsing scheiterte mit `DOMMatrix is not defined`.
- Dadurch wurden zwei Dokumente ohne Summen gespeichert.
- Server-PDF-Parsing scheiterte spaeter auf Vercel mit `Setting up fake worker failed`.
- Dadurch wurden viele Dokumente ohne Abrechnungsdaten, ohne Kontoauszug und mit PDF.js-Parse-Notiz gespeichert.

Bereinigt:
- Diese alten Dokumente wurden in Supabase auf `status='error'` gesetzt.
- Zugehoerige Batches wurden auf `failed` korrigiert.
- Dashboard-Quelle liest nur `bfs_documents.status='imported'`.
- Nach Reupload werden diese PDFs neu verarbeitet.
- Seit `17de9a71` werden kaputte PDF.js-Importe beim Laden der Vorschau herausgefiltert und beim Reupload ersetzt, statt als Dubletten uebersprungen zu werden.

## Auth / Nutzer

Login:
- nur noch Supabase Auth.
- `proxy.ts` prueft geschuetzte Routen serverseitig.
- `lib/server-auth.ts` liest Supabase-Session-Cookie und Profil.
- App-Session-Fallback wurde entfernt.
- Der Legacy-Cookie `orisus_bfs_app_session` wird nur noch geloescht, nicht akzeptiert.

Admin-Nutzeranlage:
- Super Admin kann Nutzer in der App anlegen.
- Admin vergibt temporaeres Passwort.
- Nutzer muss beim ersten Login ein eigenes Passwort setzen.
- Wichtige APIs:
  - `app/api/admin/users/route.ts`
  - `app/api/admin/users/[userId]/route.ts`
  - `app/api/auth/complete-password-change/route.ts`

## Responsive / UI

Geprueft per Browser-Automation auf Live-App:
- Desktop 1440x900
- Tablet 1024x768
- Mobile 390x844

Ergebnis nach Fixes:
- Dashboard: kein Page-Overflow, keine sichtbaren Elemente ausserhalb, kein Textoverflow.
- Import-Center: Tabellen scrollen innerhalb `.table-wrap`, nicht die ganze Seite.
- Nutzerverwaltung: Mobile/Tablet sauber, Tabellen intern scrollbar.
- Sidebar:
  - Desktop sticky sichtbar
  - Tablet/Mobile fixed off-canvas Drawer
  - Mobile-Menuebutton sichtbar
- Standort-Tabs:
  - Desktop normal
  - Tablet bruch-/wrap-faehig
  - Mobile horizontal scrollbar

Logo:
- Transparentes Orisus-Zahnmedizin-Logo liegt in `public/orisus-zahnmedizin-transparent.png`.
- Wird in `components/monitor-app.tsx` als `.orisus-wordmark` verwendet.

## Standorte / Mandanten

Standorte:
- Kirchberg, live seit 01.07.2024
- Essen, live seit 01.01.2025
- Kehl, live seit 01.04.2025
- Ulmet, live seit 01.07.2025
- Huettenberg, live seit 01.01.2026
- Kassel, vorbereitet ab 01.07.2026

Bekannte Mandantennummern:
- Essen: `18790`
- Ulmet: `19260`, `19668`, `19669`
- Kassel/Spohr: `20309`, `20902`
- Weitere Zuordnungen liegen in `lib/demo-data.ts` und Supabase-Tabelle `standort_mandanten`.

## Parser / Fachlogik

Parser kann aus BFS-PDFs erkennen:
- Mandant-Nr.
- Abrechnungsnummer
- Abrechnungsdatum
- Forderungsanzahl
- Forderungssumme
- Forderungsliste / Patienten / Rechnungsnummern / BFS-Nr.
- Kontoauszug-Bewegungen
- Auszahlung
- BFS-Gebuehr netto
- MwSt
- EWMA/Meldeamtabfragen
- Ohne-Ausfallschutz-Markierungen
- Rueckgaben/Stornos inkl. Grundklassifizierung

Lokal verifiziert nach `DOMMatrix`-Fix mit echten PDFs:
- `AbrechnungsNachweis_19092_1.pdf`
  - Mandant `19092`
  - Abrechnung `1`
  - Datum `03.04.2025`
  - Forderungssumme `189,16`
  - Auszahlung `184,09`
  - Gebuehr netto `4,26`
  - MwSt `0,81`
- `AbrechnungsNachweis_19092_9.pdf`
  - Mandant `19092`
  - Abrechnung `9`
  - Datum `23.04.2025`
  - Forderungssumme `1.691,88`
  - Auszahlung `1.581,10`
  - Gebuehr netto `38,07`
  - MwSt `7,23`

## Fachliche Auswertungen

Die App soll statistisch auswerten:
- Umsatz eingereicht
- Auszahlungsbetrag
- BFS-Gebuehr netto
- MwSt
- EWMA/Meldeamtabfragen
- Rueckgaben/Rueckbelastungen
- Stornos
- offene Klaerfaelle
- offene Summe
- ohne Ausfallschutz
- Matching/Neueinreichungen
- Standortzuordnung ueber Mandantennummern

Definitionen:
- Gesamtkosten BFS = BFS-Gebuehr netto + MwSt auf BFS-Gebuehr
- Zusatzkosten ohne Steuer = BFS-Gebuehr netto + EWMA/Meldeamtabfragen netto
- Stornos/Rueckgaben sind Umsatz-/Liquiditaetsabfluss, nicht normale Kosten
- Dubletten duerfen nicht doppelt in Auswertungen eingehen

## Wichtige Kommandos

Immer mit Node-PATH ausfuehren, wenn Shell `node: not found` meldet:

```bash
PATH="/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm run typecheck
PATH="/Users/svendneumann/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" pnpm run build
```

Normale Git-Kommandos:

```bash
git status --short
git log --oneline -10
git add <files>
git commit -m "<message>"
git push
```

## Offene Risiken / Naechste sinnvolle Checks

1. Grossen Ordner nach Deploy von `adb9511b` erneut testen.
   - Erwartung: Status zeigt `Paket x/y`.
   - Keine 542-MB-Einzelrequest mehr.

2. Wenn weiter Fehler:
   - Network-Response von `/api/imports/parse` lesen.
   - Pruefen, ob Fehler einzelne PDF betrifft oder Function Timeout.
   - Falls Timeout: echte Queue/Job-Architektur bauen.

3. Nach erfolgreichem Grossimport:
   - Dashboard-Kacheln pruefen.
   - Import-Historie pruefen.
   - Stichprobe Summen gegen BFS-PDF:
     - Umsatz eingereicht
     - Auszahlung
     - Gebuehr netto
     - MwSt
     - EWMA
     - Rueckgaben/Stornos
     - Ohne Ausfallschutz
     - Monat/Standort

4. Lint-Script ist noch falsch/irrelevant:
   - `pnpm run lint` sucht aktuell einen falschen Pfad/ist nicht verlaesslich.
   - Typecheck und Build sind die verbindlichen Checks.

## Aktueller Status

- GitHub `origin/main` war nach dem Push synchron mit lokalem `main`.
- Letzter produktiver Code-Commit: `fd43d82c Normalize import wording in metric cards`.
- Production-Deploy `dpl_FfmH2WqFDsikUpDPH1kWVkqNjJYF` ist READY und auf `https://bfs-mandatenuebersicht.vercel.app` aliasiert.
- Vercel zeigt zwei Deployments fuer `adb9511b`, weil einmal der GitHub-Push und einmal ein direkter Vercel-CLI-Deploy gelaufen ist. Das ist unkritisch, beide basieren auf demselben Commit.
