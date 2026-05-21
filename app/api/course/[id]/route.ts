import { NextResponse } from "next/server";
import { requireOwnedCourse } from "@/lib/auth";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { course } = await requireOwnedCourse(id);
    const curriculum = await storage.getCurriculum(id);
    return NextResponse.json({ course, curriculum });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "Course not found")
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
