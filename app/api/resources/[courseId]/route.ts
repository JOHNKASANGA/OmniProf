import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { requireOwnedCourse } from "@/lib/auth";
import { assembleResources } from "@/lib/resources/assemble";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Params { courseId: string }

function authFail(err: unknown) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (msg === "Course not found") return NextResponse.json({ error: "Course not found" }, { status: 404 });
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { courseId } = await params;
  try { await requireOwnedCourse(courseId); } catch (err) {
    const r = authFail(err); if (r) return r; throw err;
  }
  const resources = await storage.listResources(courseId);
  return NextResponse.json({ resources });
}

export async function POST(_req: Request, { params }: { params: Promise<Params> }) {
  const { courseId } = await params;
  let course;
  try { ({ course } = await requireOwnedCourse(courseId)); } catch (err) {
    const r = authFail(err); if (r) return r; throw err;
  }
  const curriculum = await storage.getCurriculum(courseId);
  if (!curriculum) {
    return NextResponse.json({ error: "No curriculum found" }, { status: 404 });
  }
  const topics = curriculum.weeks.flatMap(w => [w.topic, ...w.keyConcepts]).slice(0, 12);
  try {
    const result = await assembleResources({
      courseId,
      courseCode: course.courseCode,
      courseTitle: course.title,
      topics,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Resource assembly failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
