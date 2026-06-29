import { NextRequest, NextResponse } from "next/server";
import { parseInvoiceStatusPdfBytes } from "@/lib/invoice-status-parser";
import { requireSuperAdmin } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const paths = formData.getAll("paths").map((entry) => String(entry));

  if (!files.length) {
    return NextResponse.json({ error: "Keine Rechnungsstatus-PDFs im Upload gefunden." }, { status: 400 });
  }

  const documents = [];
  const errors: Array<{ file: string; message: string }> = [];

  for (const [index, file] of files.entries()) {
    const filePath = paths[index] || file.name;
    try {
      const bytes = await file.arrayBuffer();
      documents.push(await parseInvoiceStatusPdfBytes(bytes, {
        file: filePath,
        fileSizeBytes: file.size
      }));
    } catch (error) {
      errors.push({
        file: filePath,
        message: error instanceof Error ? error.message : "Rechnungsstatus-Liste konnte nicht gelesen werden."
      });
    }
  }

  return NextResponse.json({
    documents,
    persistence: {
      parsed: documents.reduce((sum, document) => sum + document.rows.length, 0),
      failed: errors.length,
      errors
    }
  });
}
