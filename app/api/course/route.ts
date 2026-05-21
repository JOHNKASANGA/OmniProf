import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/storage";
import { mapCurriculum } from "@/lib/modes/curriculum";
import {
  YearLevelSchema,
  yearLevelToBackgroundLevel,
  type YearLevel,
} from "@/lib/state/schema";
import { requireStudent } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  courseCode: z.string().min(1).max(20),
  title: z.string().min(1).max(200),
  outline: z.string().max(20000).optional(),
});

export async function GET() {
  let student;
  try {
    student = await requireStudent();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const courses = await storage.listCoursesForStudent(student.id);
  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  let student;
  try {
    student = await requireStudent();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  const yearLevel = YearLevelSchema.parse(student.yearLevel) as YearLevel;
  const backgroundLevel = yearLevelToBackgroundLevel(yearLevel);

  let curriculum;
  try {
    curriculum = await mapCurriculum({
      courseCode: parsed.courseCode,
      title: parsed.title,
      yearLevel,
      backgroundLevel,
      outline: parsed.outline ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Curriculum generation failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const course = await storage.createCourseFromCurriculum({
    studentId: student.id,
    courseCode: parsed.courseCode,
    backgroundLevel,
    outline: parsed.outline,
    curriculum,
  });

  return NextResponse.json(
    { courseId: course.id, course, curriculum },
    { status: 201 },
  );
}
