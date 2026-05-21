import { NextResponse } from "next/server";
import { signOutCurrent } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await signOutCurrent();
  return NextResponse.json({ ok: true });
}
