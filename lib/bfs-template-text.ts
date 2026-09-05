export function withoutObsoleteBfsTemplate<T extends { str?: string }>(items: T[]): T[] {
  const footer = items.findIndex((item) => /^Kontoinhaber:\s*BFS health finance/i.test(item.str?.trim() ?? ""));
  if (footer < 0) return items;
  const prefix = items.slice(0, footer + 1).map((item) => item.str ?? "").join(" ");
  const actualItems = items.slice(footer + 1);
  const actualText = actualItems.map((item) => item.str ?? "").join(" ");
  // Some BFS PDFs paint a real invoice over this embedded 2012 sample form.
  if (/Musterarzt/.test(prefix) && /Musterstadt/.test(prefix) && /00-00000-0000000/.test(prefix)
    && /\b5-\d{5}-\d{6,10}\b/.test(actualText) && /Rechnungsnummer:/.test(actualText)) {
    return actualItems;
  }
  return items;
}
