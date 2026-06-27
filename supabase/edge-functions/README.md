# Edge Function contracts

These function names are reserved for the production import pipeline:

- `upload-bfs-batch`
- `parse-bfs-document`
- `prepare-import-preview`
- `confirm-import-batch`
- `generate-report`

The frontend MVP currently uses local demo data. Production wiring should keep parsing modular through `lib/bfs-parser.ts`, store original PDFs in the private `bfs-documents` bucket, then write final records only after the import preview is confirmed.
