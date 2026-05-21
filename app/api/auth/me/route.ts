import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const student = await getCurrentStudent();
  return NextResponse.json({ student });
}
