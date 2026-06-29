# Orisus BFS Monitor - Projektkontext

Stand: 29.06.2026, ca. 19:05 Uhr
Repo: `/Users/svendneumann/Documents/BFS_Mandantenportal`  
Live: `https://bfs-mandatenuebersicht.vercel.app`  
GitHub: `https://github.com/SvendNeumann/BFS_Mandatenuebersicht.git`  
Aktueller Fokus: Orisus BFS Monitor mit zwei Hauptbereichen: BFS-Abrechnungen/operative Fallarbeit und BFS-Rechnungsanalyse. BFS-Abrechnungen wurden auf eine klare Geldfluss-Herleitung plus eine gemeinsame operative Pruefliste umgestellt; BFS-Rechnungsanalyse bleibt davon fachlich getrennt.

Letzte Aenderung/Pruefung:
- Hauptreiter `BFS-Abrechnungen` fachlich vereinfacht und alte Mehrkorb-Herleitung aus den sichtbaren Haupttabs entfernt. Neue Leitlogik: `Eingereichter Umsatz - BFS-Gebuehr netto - MwSt - EWMA/Adresspruefung = Auszahlung laut BFS` als Geldflussblock; separat `Brutto Storno/Rueckgabe - Bereits geklaert = Offene Pruefsumme`. `Bereits geklaert` umfasst echte Neueinreichung/Ersatzrechnung, manuell bezahlt/geklärt und Ratenplan laut BFS. Wichtig: `Saldo 0` ohne Ratenplan zaehlt nicht als bezahlt/geklart, sondern bleibt bei Storno/Rueckgabe pruefpflichtig. `Endgueltig verloren` ist eine eigene Kachel fuer manuell endgueltig stornierte Faelle.
- Operative Fallarbeit wurde auf eine gemeinsame `Pruefliste` reduziert. Die alten sichtbaren Reiter/Kachellogiken `Praxis nachfassen`, `Zahlung/Grund pruefen`, `Noch nicht zugeordnet` und `Kontrollsumme Operativ` sind aus Navigation, Management-/Zusammenfassungs-Kacheln, Standortkarten, Geldfluss und Reports entfernt bzw. in technische Herkunftshinweise umbenannt. In der Pruefliste entscheidet die Praxis je Fall nur noch `Erledigt / bezahlt` oder `Endgueltig storniert`; dadurch reduziert sich die offene Pruefsumme bzw. waechst `Endgueltig verloren`.
- `Forderungen und Geldfluss` zeigt jetzt Geldfluss und Storno/Rueckgabe-Herleitung, aber keine zweite Abarbeitungsliste mehr. Standortkarten zeigen `Umsatz eingereicht`, `Auszahlungsbetrag`, `BFS-Gebuehr netto`, `MwSt`, `EWMA/Adresspruefung`, `Brutto Storno/Rueckgabe`, `Bereits geklaert`, `Offene Pruefsumme`, `Endgueltig verloren`. Der fruehere Restkorb unter `Storno/Rueckgabe & Wiedereinholung` wurde entfernt.
- `Zusammenfassung`, `Management Cockpit`, Standortdetails, Schnellantworten und Reports verwenden dieselbe Sprache: `Brutto Storno/Rueckgabe`, `Bereits geklaert`, `Offene Pruefsumme`, `Endgueltig verloren`, `Pruefliste`. Reports bauen die Fallliste jetzt aus der neuen `buildUnifiedOperationalReviewCases`-Logik statt aus alten Nachfass-/Belegkoerben.
- Technisch neu in `components/monitor-app.tsx`: `buildUnifiedOperationalReviewCases` erzeugt die gemeinsame Pruefliste aus Abrechnungsimport, Saldo-/Statuslisten und manuellen Entscheidungen. Nur Ratenplan per BFS-Saldoliste fliegt automatisch aus der aktiven Pruefliste; `Saldo 0` und Storno laut BFS bleiben pruefpflichtig, bis manuell geklaert/endgueltig storniert oder durch echte Neueinreichung/Ersatzrechnung erklaert.
- Pruefung nach Vereinfachung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build` und `git diff --check` erfolgreich.
- Fachliche Klarstellung Hauptreiter `BFS-Abrechnungen`: Ein bei BFS hinterlegter Ratenplan gilt fuer die offene Abzugslogik als bezahlt/gesichert. Die Recovery-Logik `buildDeductionRecovery` rechnet neben Neueinreichungen und manuell bezahlten Faellen nur Ratenplan aus der Saldoliste automatisch in `Bereits geklaert` an. `Saldo 0` allein bleibt kein automatischer Geldfluss, sondern muss fachlich geprueft/ggf. manuell als bezahlt oder endgueltig storniert entschieden werden.
- Gegencheck mit echtem Upload `/Users/svendneumann/Desktop/BFS Uploads`: 839 Abrechnungs-PDFs + 5 Saldolisten. Neue Logik ergibt ca. 4.652.836,91 EUR eingereicht, 4.470.324,62 EUR Auszahlung, 74.806,85 EUR Brutto Storno/Rueckgabe, 15.079,31 EUR automatisch geklaert (14.766,72 EUR Neueinreichung/Ersatzrechnung + 312,59 EUR Ratenplan) und rechnerisch 59.727,54 EUR offene Pruefsumme vor manuellen Entscheidungen. Die alte Anzeige von ca. 72.390 EUR `Bereits geklaert` war falsch, weil `Saldo 0` als bezahlt mitgerechnet wurde.
- BFS-Rechnungsanalyse / `Import-Center Rechnungen`: Button heisst jetzt `Upload zuruecksetzen` statt `Vorschau zuruecksetzen` und ruft den dauerhaften DELETE fuer gespeicherte Patientenrechnungen auf. Damit werden Rechnungen, Positionen und Import-Batches serverseitig entfernt und tauchen nach Tabwechsel/Reload nicht wieder auf.
- Operative Pruefliste nachgezogen: Cockpit/Schnellantworten und Haupttab `Pruefliste` nutzen jetzt durchgehend `buildUnifiedOperationalReviewCases`. Die Pruefliste startet mit Zeitraum `Seit Standortstart`, damit die Listensumme zur Gesamt-`Offenen Pruefsumme` passt. Teilweise erklaerte Neueinreichungen reduzieren nur den erklaerten Betrag; Restbetraege bleiben in der Liste. Manuell `Endgueltig storniert` reduziert die offene Pruefsumme und wird separat als `Endgueltig verloren` ausgewiesen.
- Hauptreiter `BFS-Abrechnungen` / `Forderungen und Geldfluss`: Zur operativen Kontrollsumme wurde eine echte Arbeitsliste `Noch nicht zugeordnete offene Abzuege` ergaenzt. Sie sitzt direkt unter `Storno/Rueckgabe & Wiedereinholung` und listet den Restkorb der offenen Abzugsbewegungen, die noch nicht in `Zahlung/Grund pruefen`, `Praxis nachfassen`, `Endgueltig storniert` oder manuell erledigt liegen. In dieser Liste koennen Faelle direkt als `Erledigt / bezahlt` oder `Endgueltig storniert` markiert werden. Damit ist der Weg fuer den Nutzer klar: Offener Abzug wird ueber die operativen Koerbe abgearbeitet; Neueinreichungen erklaeren nur `Zurueckgeholt / bezahlt` und werden nicht zusaetzlich zum offenen Abzug addiert. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check` erfolgreich.
- Hauptreiter `BFS-Abrechnungen` / `Forderungen und Geldfluss` fachlich nachgezogen: Im Block `Storno/Rueckgabe & Wiedereinholung` gibt es jetzt eine klare operative Kontrollsumme. `Noch ungeklaert` bleibt `Brutto Storno/Rueckgabe minus Zurueckgeholt/bezahlt`. Die operative Ueberleitung lautet jetzt: aktive `Zahlung/Grund pruefen` + `Praxis nachfassen` + `Endgueltig storniert` + `Noch nicht zugeordnet` = `Noch ungeklaert`. Dadurch ist sofort sichtbar, ob der offene Abzug komplett in Arbeitskoerbe/Restkategorie uebergeleitet ist. `Zahlung/Grund pruefen` in dieser Kontrollsicht zaehlt nur noch aktive, nicht manuell erledigte Prueffaelle. `Matching/Neueinreichungen` wurde textlich geklaert: Diese Treffer erklaeren die Kachel `Zurueckgeholt / bezahlt` und duerfen nicht zusaetzlich zum offenen Abzug addiert werden. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check` erfolgreich.
- Standortvergleich-Karten auf neue Logik umgestellt: Die Kacheln zeigen jetzt `Umsatz`, `Auszahlung`, `Gebuehr`, `Brutto Storno/Rueckgabe`, `Zurueckgeholt / bezahlt`, `Offener Abzug`, `Zahlung/Grund pruefen` und `Praxis nachfassen`. Die Risiko-Faerbung nutzt Brutto-Abzug, offenen Abzug, Zahlung/Grund-Pruefvolumen, Ohne-Schutz-Anteil und echte Praxis-Nachfassfaelle statt der alten Rueckbelastungs-/Ohne-Schutz-Kachellogik.
- Desktop-Zurueck-Button sichtbar gemacht: Neben dem Seitentitel in der Desktop-Topbar erscheint jetzt ein `Zurueck`-Button, sobald App-interne View-Historie vorhanden ist. Der bestehende schwebende Zurueck-Button bleibt als zusaetzliche Hilfe erhalten.
- Praxis-nachfassen-Filter geschaerft: Tab-Auswertung, KPI-Kacheln, Diagramme und Tabelle haengen weiterhin am selben `filteredRows`-Stand. Konkrete Jahre/Quartale/Monate lassen jetzt nur noch Nachfassfaelle mit passendem Quelldatum durch; undatierte Faelle bleiben nur in `ab Standortstart` sichtbar. Die Arbeitsliste zeigt das steuernde Datum als eigene Spalte.
- Zahlung/Grund-pruefen-Filter geschaerft: Die Tabelle nutzt jetzt eine eigene Zeitraumpruefung je Prueffall. Konkrete Jahre/Quartale/Monate zaehlen nur noch Zeilen mit verwertbarem Quelldatum; undatierte Faelle bleiben nur in `ab Standortstart` sichtbar. Die Tabelle zeigt das steuernde Datum als eigene Spalte, damit Filterergebnisse nachvollziehbar sind.
- Praxis-nachfassen-Tabelle nachgezogen: Der PDF-Export sitzt jetzt direkt am Tabellenkopf der Arbeitsliste. Die Nachfass-Tabelle hat eine eigene Spaltenlogik mit fixer Mindestbreite, Sticky Header, no-wrap fuer Betraege/Alter/Abrechnungsnummern und groesseren Spalten fuer Patient/Grund, damit Zelltexte nicht mehr unsauber in einzelne Silben oder harte Zeilen zerfallen.
- BFS-Rechnungsanalyse fachlich neu sortiert: Tabs laufen jetzt als `Leistungsuebersicht`, `Potenzialanalyse`, `Standortvergleich`, `Import-Center Rechnungen`. Die Leistungsuebersicht bleibt nach Haeufigkeit sortiert und vergleicht eigener Faktor vs. Gruppe ohne eigenen Standort. Die Potenzialanalyse rechnet Euro-Potenzial aus echten Positionsbetraegen gegen den Gruppenschnitt ohne eigene Praxis inkl. Monats-/Jahreshochrechnung. Der Standortvergleich verdichtet Rechnungen, Positionen, Umsatz, Fallwert, Durchschnittsfaktor, Laborquote und Potenzial je Praxis. Fachlicher Fokus ist private BFS-Patientenrechnung: GOZ/GOA/Analogpositionen, Labor, Material/Auslagen; BEMA wird fuer diese Analyse nicht als regulaere Quelle angenommen.
- Saldo-/Rechnungsstatus-Upload nachgebessert: Der normale Button `Saldo-Listen` ergaenzt jetzt einen bestehenden Vorschau-/Importstand automatisch, statt jede nachtraeglich gewaehlte Datei wieder als Ersetzen-Upload zu behandeln. Der Button zeigt bei vorhandenem Stand `Saldo-Listen ergaenzen`; File-Inputs werden nach Auswahl geleert, damit dieselben Dateien erneut ausgewaehlt werden koennen. Gewolltes Ersetzen laeuft ueber `Saldo-Import zuruecksetzen` und anschliessenden Neu-Upload.
- Pruefung Hauptreiter `BFS-Rechnungsanalyse` am 29.06.2026: Der Bereich ist fachlich sauber von der neuen BFS-Abrechnungs-/Saldo-Logik getrennt. Rechnungs-PDFs laufen aktuell als MVP: Server-Parse ueber `/api/invoices/parse`, Frontend-State `invoiceRows`, Auswertungen fuer Rechnungsuebersicht, Leistungsanalyse und Laboranalyse. Es gibt noch keine dauerhafte Supabase-Persistenz fuer Patientenrechnungen/Leistungszeilen und keine Lade-API fuer bestaetigte Rechnungsdaten. Standortleitungen sehen den Reiter, der Server-Endpoint verlangt aber Super-Admin; das muss vor produktiver Nutzung entschieden bzw. angeglichen werden. Auswertungen haben noch keine Standort-/Zeitraumfilter, keine Standortvergleiche je Leistungsnummer/Faktor und keine Tests fuer `lib/invoice-parser.ts`. Geprueft: `pnpm run typecheck`, `pnpm test`, `pnpm run lint`, `pnpm run build`, `git diff --check` erfolgreich.
- Beispielrechnungen fuer `BFS-Rechnungsanalyse` aus `/Users/svendneumann/Downloads/Rechnungen_BFS` geprueft: 28 PDFs, Standorte Kirchberg 11, Essen 7, Ulmet 4, Huettenberg 6. Kernfelder BFS-Nr., Mandant, Rechnungsnummer, Rechnungsdatum, Patient und Rechnungsbetrag wurden in allen 28 Dateien erkannt; jede Datei hat mindestens eine erkannte Leistungs-/Faktorzeile. Laborerkennung: 15 Eigenlabor-Dokumente, 14 Fremdlabor-Dokumente. Enthaltene Rechnungsnummern-Formate: klassische Standortnummern wie `24-0045`, Essen-Formate wie `2/20555/40`, Ulmet/Huettenberg-Formate wie `675-023996`/`554-091070` und achtstellige Nummern wie `20260852`. Diese Dateien sind gute Parser-Testmuster fuer die naechste Ausbaustufe.
- Rechnungsanalyse-Persistenz umgesetzt: Neue Migration `supabase/migrations/009_patient_invoice_analysis.sql` legt `bfs_invoice_import_batches`, `bfs_patient_invoices` und `bfs_patient_invoice_lines` inkl. Indizes, RLS und Standortleserechten an. `/api/invoices/parse` kann jetzt gespeicherte Rechnungen laden (`GET`), PDFs parsen (`POST`), den Rechnungsimport dauerhaft bestaetigen (`PUT`) und den Rechnungsdatenstand fuer Super-Admins zuruecksetzen (`DELETE`). Der Frontend-Reiter `Import-Center Rechnungen` laedt bestaetigte Rechnungen beim App-Start und hat jetzt `Rechnungsimport bestaetigen`; nach Bestaetigung speisen gespeicherte Kopf-/Leistungs-/Laborzeilen die Tabs Rechnungsuebersicht, Leistungsanalyse und Laboranalyse auch nach Reload. Hinweis: Supabase-CLI ist lokal nicht installiert; Migration wurde nach bestehendem Nummernschema angelegt und muss in Supabase angewendet sein, bevor Live-Speicherung funktioniert. Geprueft: `pnpm run typecheck`, `pnpm test`, `pnpm run lint`, `pnpm run build`, `git diff --check` erfolgreich.
- Nachpruefung Rechnungsupload mit 28 Beispielrechnungen: UI zeigte zunaechst 9 `Zu pruefen`, weil bei einigen BFS-Rechnungen ein einleitender `Rechnungsbetrag` vor der eigentlichen Leistungstabelle steht. Der Parser stoppte dadurch zu frueh. `parseServiceLines` startet jetzt bei erkannter Tabellenueberschrift `Datum Region Nr. Leistungsbeschreibung...` und beendet erst bei Zwischensumme/Laborabschnitt. Ergebnis auf denselben 28 PDFs: 0 Faelle ohne Leistungsposition, 217 erkannte Leistungspositionen statt 130. Nutzer soll diese Rechnungen nach Deployment/Hard-Reload noch einmal neu hochladen und dann erst `Rechnungsimport bestaetigen`.
- Live-Fix direkt danach: `Rechnungsimport bestaetigen` scheiterte, weil die neuen Tabellen zwar im Code/Migration lagen, aber in Supabase live noch nicht angewendet waren. Migration `patient_invoice_analysis` wurde per Supabase MCP auf Projekt `dozcaktodvogbkiomcqo` erfolgreich angewendet. Verifikation per Service-Client: `bfs_invoice_import_batches`, `bfs_patient_invoices`, `bfs_patient_invoice_lines` sind erreichbar und leer (`count=0`). Rechnungsimport kann nach Hard-Reload erneut bestaetigt werden.
- Weitere Live-Nachkorrektur Rechnungsimport: Nach Bestaetigung wurden nur 1 Rechnung/1 Position geladen und 28 Dateien als Dubletten gemeldet. Ursache: `parseInvoicePdfBytes` berechnete den Datei-Hash nach dem PDF.js-Textauslesen; der ArrayBuffer war dann leer/uebernommen, dadurch bekamen alle PDFs den leeren SHA-256 `e3b0...b855`. Fix: Hash wird jetzt vor PDF.js berechnet; Dublettenpruefung ignoriert den leeren SHA-256 als Hash-Basis. Der kaputte Teilimport wurde aus den drei neuen Rechnungsanalyse-Tabellen geloescht; Tabellen sind wieder leer. Lokale Hash-Pruefung der 28 Beispiel-PDFs: 28 eindeutige Hashes, 0 leere Hashes.
- Tab `BFS-Rechnungsanalyse > Leistungsanalyse` erweitert: Zeitraumfilter und Standortfilter ergaenzt. Bei `Alle Standorte` zeigt die Tabelle die konsolidierte Leistungsuebersicht. Bei Einzelstandort zeigt sie je Leistungsnummer die realen Standortfaelle, den realen Standort-Ø-Faktor, den Gruppendurchschnitt ohne diesen Standort und das Faktor-Delta. Dadurch verfaelscht der Zielstandort den Vergleich nicht mehr.
- Leistungsanalyse-Tabelle nachgezogen: Tabelle ist jetzt intern scrollbar mit Sticky Header und bleibt nach Haeufigkeit der abgerechneten Positionen absteigend sortiert, sodass die meistabgerechneten Positionen oben stehen.
- Standort-Verlaufsgrafiken (`YearComparisonLines`) schneiden bei der Monatsachse jetzt am letzten tatsaechlich importierten Monat der jeweiligen Standort-/Zeitraumauswahl ab. Dadurch wird z.B. bei Datenstand bis Mai 2026 kein kuenstlicher Juni-2026-Wert mit `0 EUR` mehr angezeigt.
- Die aktive Wertbox in der Verlaufsgrafik bleibt innerhalb des Chartkopfs und laeuft an linker/rechter Kante nicht mehr aus dem Container.
- Die SVG-Hoehe der Verlaufsgrafik ist responsiv gedeckelt (`clamp(230px, 28vw, 360px)`), damit breite Bildschirme die Grafik nicht mehr riesig leer aufziehen.
- Aufgeraeumt: zwei ungenutzte Variablen/Props in `components/monitor-app.tsx` entfernt.
- Pruefung am 29.06.2026: `pnpm run lint`, `pnpm run typecheck`, `pnpm test`, `pnpm run build`, `git diff --check` alle erfolgreich. Browser-Sichtpruefung geschuetzter Dashboard-Grafiken war ohne eingeloggte Sitzung nicht moeglich; lokale Route leitete korrekt auf `/login?next=/dashboard` weiter.
- Nachkorrektur Standortsteuerung: Die feste Standort-Tab-Leiste wurde vollstaendig aus dem Renderpfad entfernt. Standortwechsel laufen im Admin-Modus wieder ueber eigene Filter je Tab. Das Standort-Management-Cockpit hat jetzt einen eigenen Filter `Standort Management Cockpit` mit `Alle Standorte` und Einzelstandorten. Schnellantworten, Forderungsqualitaet, Geldfluss/Fallarbeit, Zahlung/Grund pruefen, Ohne-Schutz/Risiko, Patientenklassifizierung, Matching/Neueinreichung, Outcomes und Reports behalten bzw. nutzen ihre tab-eigenen Standortfilter. Standortleitungen bleiben auf zugewiesene Standorte begrenzt.
- Im Tab `Forderungen und Geldfluss` wurde oberhalb der bisherigen Standortkarten/Monats- und Quartalscharts eine `CashFlow-Herleitung` als Wasserfall-Diagramm ergaenzt. Eigene Filter: `Zeitraum CashFlow` und `Standort CashFlow` inkl. `Alle Standorte`. Kette: Umsatz eingereicht minus BFS-Gebuehr netto, MwSt, EWMA/Adresspruefung und Brutto Storno/Rueckgabe plus zurueckgeholt/bezahlt ergibt den wirtschaftlich verbleibenden Betrag. Zusaetzlich werden BFS-Auszahlung laut Import, offener Abzug, Anzahl zurueckgeholt/bezahlt und Differenz zur BFS-Auszahlung gezeigt. Responsive: Summary stapelt mobil, Wasserfall bleibt horizontal scrollbar mit stabiler Hoehe.
- Im Tab `Zusammenfassung` wurden die KPI-Kacheln auf die komplette CashFlow-/Storno-Logik erweitert: eingereichter Umsatz, BFS-Gebuehren, BFS-Gebuehr netto, MwSt, EWMA/Adresspruefung, ausgezahlter Umsatz, Brutto Storno/Rueckgabe, Storno-Grundmenge, davon zurueckgeholt inkl. Betrag, offener Abzug, Zahlung/Grund pruefen, Praxis nachfassen, wirtschaftlich verbleibend, eingereichte Rechnungen und Durchschnittswert je Forderung. Info-Texte erklaeren die Herleitung; Trends nutzen Monatswerte fuer die neuen Logikfelder.
- Im Bereich `Forderungen und Geldfluss` -> `Storno/Rueckgabe & Wiedereinholung` wurde die Restlogik komplett sichtbar gemacht: zusaetzlich zu Brutto-Abzug, Zurueckgeholt/bezahlt und Noch ungeklaert werden jetzt `Zahlung/Grund pruefen`, `Praxis nachfassen` und `Endgueltig storniert` als operative Restkategorien ausgewiesen. Damit ist im gleichen Ablauf sichtbar, wohin der offene Restbetrag fachlich geht.
- Nachpruefung der App-weiten Logik: `Offener Abzug`, `Noch ungeklaert`, Wasserfall-Rest und Management-Vergleich nutzen jetzt einheitlich die zentrale Herleitung `Brutto Storno/Rueckgabe minus zurueckgeholt/bezahlt`. `Zurueckgeholt/bezahlt` zaehlt echte Neueinreichungen/Ersatzrechnungen plus manuell als bezahlt markierte Faelle, jeweils bis maximal zur Hoehe des urspruenglichen Abzugs. Diese Logik ist in `Zusammenfassung`, `Forderungen und Geldfluss`, CashFlow-Wasserfall, Management Cockpit, Benchmark, Standort-Dashboard und Reports angebunden.
- Wichtig zur Lesart: `Storno-Grundmenge` und stornobezogene Kacheln bleiben bewusst eine Untermenge nur aus Storno-Bewegungen. Sie duerfen deshalb von `Brutto Storno/Rueckgabe` bzw. `Offener Abzug` abweichen, weil Rueckgaben/Rueckbelastungen dort zusaetzlich enthalten sind. Der Begriff `Offener Abzug` meint appweit nicht mehr "offene Stornos", sondern den wirtschaftlich noch nicht belegten Rest aus allen Abzugsbewegungen.
- Monats-Trends/Sparklines fuer `Offener Abzug` wurden auf dieselbe Logik umgestellt: monatlich wird erst der Brutto-Abzug aus Rueckgabe/Rueckbelastung/Storno aufgebaut und danach werden erkannte Neueinreichungen oder manuelle Zahlungen gegengerechnet. Dadurch laufen Kachelwert, Wasserfall und Trenddarstellung nicht mehr auseinander.
- Pruefung am 29.06.2026 nach der Vereinheitlichung: `pnpm run lint`, `pnpm run typecheck`, `pnpm test`, `pnpm run build` und `git diff --check` erfolgreich.
- Nachpruefung direkt danach: Auch die Management-/Antwort-Sparklines fuer `Davon zurueckgeholt` verwenden jetzt manuelle Zahlungen plus erkannte Neueinreichungen bis maximal zum Brutto-Abzug. Es bleibt kein alter Recovery-Trendpfad uebrig, der nur reine Matching-Kandidaten zaehlt. Erneut erfolgreich geprueft: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check`.
- Bedienhinweis: Nach Deployment/Codewechsel Browser hart neu laden. Fuer einen fachlich sauberen Datenstand die BFS-Abrechnungen und danach die BFS-Rechnungsstatus-/Saldo-Listen neu hochladen bzw. im Upload ersetzen, damit alle Kacheln mit der neuen Logik aus dem aktuellen Importzustand berechnet werden. Alte Browser-Vorschauen koennen noch alte Zahlen anzeigen, bis neu geladen/importiert wurde.
- Tab `Forderungsqualitaet` nachgezogen: Der obere Qualitaets-KPI-Block hat jetzt ebenfalls Zeitraum- und Standortfilter inkl. `Alle Standorte`. Die Kacheln wurden fachlich klar getrennt: `Brutto Storno/Rueckgabe` als Qualitaets-Grundmenge aus Rueckgaben/Rueckbelastungen plus Stornos, `Rueckgabe/Rueckbelastung` als Rueckgabe-Untermenge, `Stornoquote` als reine Storno-Untermenge und `Storno-Zeilen erledigt` als Storno-Quercheck. Info-Texte erklaeren explizit, dass der wirtschaftliche `Offener Abzug` weiter appweit in Zusammenfassung/Geldfluss als Brutto-Abzug minus zurueckgeholt/bezahlt hergeleitet wird. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check` erfolgreich.
- Layout-Nachzug `Forderungsqualitaet`: Die obere KPI-Gruppe nutzt nun ein gleichmaessiges 3-Spalten-Raster statt der alten 2-3-1-Sonderaufteilung. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `git diff --check` erfolgreich.
- Saldo-/Rechnungsstatus-Upload erneut geprueft mit den fuenf echten Saldolisten aus `/Users/svendneumann/Desktop/BFS Uploads/2. Saldolisten`: Direktparser erkennt alle Dateien korrekt (Essen 1.820 Zeilen, Kehl 3.603, Kirchberg 3.864, Krauhausen/Huettenberg 1.442, Ulmet 3.699; insgesamt 14.428 Zeilen und 5/6 aktive Standorte ohne Kassel). Fix: Wenn der Server-Upload nur einen Teil der Dokumente zurueckliefert, liest das Frontend fehlende Dateien lokal nach und merged die Dokumente. Dadurch wird der Fall `5 Dateien ausgewaehlt, 1 Liste gelesen` abgefangen. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check` erfolgreich.
- Nachkorrektur, weil Live weiterhin nur eine Saldoliste zeigte: Der Saldo-/Rechnungsstatus-Upload liest im Browser jetzt zuerst lokal ueber `parseInvoiceStatusUploadFiles`; der Serverpfad ist nur noch Fallback. Damit haengt die Vorschau nicht mehr an partiellen Server-Antworten. Erwartung fuer die fuenf Saldolisten: 14.428 Statuszeilen und 5/6 Standorte erkannt. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check` erfolgreich.
- Ordnerupload-Fix fuer Saldolisten nachgezogen: Der Rechnungsstatus-Upload verarbeitet die ausgewaehlten Dateien jetzt immer dateiweise. Jede Datei wird zuerst im Browser gelesen; nur die einzelne Datei faellt bei Fehler auf den Server-Fallback zurueck. Nicht lesbare Dateien erscheinen als `Zu pruefen` statt den Mehrfach-/Ordnerupload auf eine einzige Liste zu reduzieren. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check` erfolgreich.
- Saldolisten-Upload nochmal hart abgesichert: Nach dem Parserlauf wird die Ergebnisliste jetzt gegen jede ausgewaehlte Datei abgeglichen. Fehlende Dateien werden einzeln nachgelesen bzw. als `Zu pruefen` in der Dateikontrolle sichtbar gemacht. Die Statusmeldung zaehlt nun die tatsaechlich lesbaren Dokumente nach diesem Vollstaendigkeitsabgleich. Damit kann eine 5-Dateien-Auswahl nicht mehr still auf 1 Dokument zusammenschrumpfen. Pruefung: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`, `git diff --check` erfolgreich.

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
  - `Erledigt / bezahlt` fuer wirtschaftlich belegte Zahlung oder geklaerten Grund.
  - `Endgueltig storniert` fuer bewusst als Verlust/Endstorno entschiedene Faelle.
- Die Zeilen nutzen dieselbe persistente Fallentscheidungslogik wie `Praxis nachfassen` und `Neueinreichung Matching`.
- Bereits entschiedene Zahlung/Grund-Zeilen werden aus dem Prueftopf ausgeblendet und fliessen in die bestehenden Rueckhol-/Endstorno-Auswertungen.

## Update 2026-06-29: Filter in operativer Fallarbeit

- Die operativen Reiter `Praxis nachfassen`, `Zahlung / Grund pruefen` und `Neueinreichung / Matching` haben jetzt konsistente Standort-, Zeitraum- und Suchfilter.
- Die Suchfelder sind nicht mehr nur optisch: Patient, Standort, Rechnungsnummer, BFS-Nr., Betrag, Grund/Status und relevante Abrechnungs-/Datumsfelder filtern die jeweilige Tabelle wirklich.
- Kacheln, Tab-Auswertung, Summen, Charts und PDF-Export im operativen Bereich basieren auf den gefilterten Zeilen.
- Operative Beträge werden in Arbeitslisten, Entscheidungsdialogen und Exporten centgenau angezeigt. Management-Kacheln bleiben fuer schnelle Uebersicht weiterhin grob lesbar.
- Alle drei operativen Tabs haben einen filtergebundenen PDF-/Druckexport im A4-Querformat mit kompakter Zusammenfassung und druckbarer Arbeitsliste.
