import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { fetchTelegramFile } from "@/lib/telegram";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const auth = await requireRole(req, ["sys_custodian", "fld_coord"]);
  if ("error" in auth) return auth.error;

  const { fileId } = await context.params;
  if (!fileId) {
    return NextResponse.json({ error: "fileId wajib diisi." }, { status: 400 });
  }

  try {
    const { buffer, contentType } = await fetchTelegramFile(fileId);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat foto.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
