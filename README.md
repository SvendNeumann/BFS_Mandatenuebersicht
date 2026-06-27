# Orisus BFS Monitor

Interne Monitoring-App fuer BFS-Abrechnungsnachweise von Zahnarzt- und MVZ-Standorten.

Die App trennt fachlich zwischen echten offenen BFS-Klaerfaellen und reinen Risikohinweisen wie laufenden Forderungen ohne Ausfallschutz. Importierte BFS-Originaldaten bleiben read-only; interne Bearbeitungsstaende, Kommentare und Erledigungsgruende sind auditierbar.

## Funktionen im MVP

- Rollenbasierte Oberflaeche fuer `super_admin` und `standortleitung`
- Gruppen-Dashboard und Standort-Dashboard
- Monats-Sammelupload fuer PDFs, Ordner und ZIPs als UI-Flow
- Importvorschau mit Status, Dubletten- und Summenhinweisen
- Offene Faelle, Rueckbelastungen, Ohne-Ausfallschutz und Neueinreichungen
- Fall-Detail mit read-only BFS-Daten und interner Bearbeitung
- Reports je Standort mit Druckansicht und CSV-Export
- Supabase-Migration mit Tabellen, RLS-Hilfsfunktionen, Policies und privatem Storage-Bucket
- Demo-Daten fuer Standort Ulmet / Praxis Dr. Hangx / Mandant-Nr. 19260

## Entwicklung

```bash
pnpm install
pnpm dev
```

Danach laeuft die App lokal unter `http://localhost:3000`.

## Supabase

Die Migration liegt unter `supabase/migrations/001_orisus_bfs_monitor.sql`.

Fuer eine echte Umgebung werden benoetigt:

- Supabase Auth
- Supabase Postgres
- privater Storage-Bucket `bfs-documents`
- Edge Functions oder Serverlogik fuer PDF-Parsing und Importbestaetigung

Frontend-Umgebungsvariablen:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
