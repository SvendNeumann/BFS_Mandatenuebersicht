import { NextRequest, NextResponse } from "next/server";
import { parseInvoicePdfBytes } from "@/lib/invoice-parser";
import { requireSuperAdmin } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const paths = formData.getAll("paths").map((entry) => String(entry));

  if (!files.length) {
    return NextResponse.json({ error: "Keine Rechnungs-PDFs im Upload gefunden." }, { status: 400 });
  }

  const rows = [];
  const errors: Array<{ file: string; message: string }> = [];

  for (const [index, file] of files.entries()) {
    const filePath = paths[index] || file.name;
    try {
      const bytes = await file.arrayBuffer();
      rows.push(await parseInvoicePdfBytes(bytes, {
        file: filePath,
        fileSizeBytes: file.size
      }));
    } catch (error) {
      errors.push({
        file: filePath,
        message: error instanceof Error ? error.message : "Rechnung konnte nicht gelesen werden."
      });
    }
  }

  return NextResponse.json({
    rows,
    persistence: {
      parsed: rows.length,
      failed: errors.length,
      errors
    }
  });
}
