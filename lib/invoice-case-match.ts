type InvoiceIdentity = { bfsNo?: string; invoiceNo?: string; standortId?: string };

function reference(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function caseMatchesAusfallhonorarInvoice(fall: InvoiceIdentity, invoice: InvoiceIdentity) {
  const caseBfs = reference(fall.bfsNo);
  const invoiceBfs = reference(invoice.bfsNo);
  if (caseBfs && invoiceBfs) return caseBfs === invoiceBfs;
  const caseNumber = reference(fall.invoiceNo);
  return Boolean(caseNumber && caseNumber === reference(invoice.invoiceNo)
    && fall.standortId && invoice.standortId === fall.standortId);
}
