export type ParsedBfsDocument = {
  mandantNo?: string;
  mandantName?: string;
  statementNo?: string;
  statementDate?: string;
  claims: ParsedClaim[];
  movements: ParsedMovement[];
  rawText: string;
};

export type ParsedClaim = {
  patientName: string;
  invoiceNo?: string;
  bfsNo?: string;
  amount: number;
  marker?: string;
  protectionStatus: "mit_ausfallschutz" | "ohne_ausfallschutz" | "unbekannt";
};

export type ParsedMovement = {
  date?: string;
  type: "abr_umsatz" | "regulierung_ueberweisung" | "storno_liquidation_praxis" | "storno_fehlerhafte_rechnung" | "rueckgabe_ohne_ausfallschutz" | "sonstige_rueckbelastung" | "unbekannt";
  patientName?: string;
  invoiceNo?: string;
  bfsNo?: string;
  amount?: number;
  rawText: string;
};

export interface BfsParser {
  parse(buffer: ArrayBuffer, filename: string): Promise<ParsedBfsDocument>;
}

export class PlaceholderBfsPdfParser implements BfsParser {
  async parse(_buffer: ArrayBuffer, filename: string): Promise<ParsedBfsDocument> {
    return {
      mandantNo: filename.match(/\d{5}/)?.[0],
      statementNo: filename.match(/_(\d{2,4})\./)?.[1],
      claims: [],
      movements: [],
      rawText: ""
    };
  }
}
