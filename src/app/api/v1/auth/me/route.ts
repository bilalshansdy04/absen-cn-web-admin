import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, ROLE_LABELS } from "@/lib/auth";
import { getWibIsoString } from "@/lib/time";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      ...user,
      role_label: ROLE_LABELS[user.role_code],
    },
    server_time_wib: getWibIsoString(),
  });
}
