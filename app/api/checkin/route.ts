import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/storage";
import { requireStudent } from "@/lib/auth";

export const runtime = "nodejs";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const aDate = new Date(`${a}T00:00:00`);
  const bDate = new Date(`${b}T00:00:00`);
  return Math.round((aDate.getTime() - bDate.getTime()) / 86_400_000);
}

async function computeStreak(studentId: string): Promise<number> {
  const checkins = await storage.listCheckIns(studentId, 365);
  if (checkins.length === 0) return 0;
  // Dates come back desc.
  const dates = checkins.map((c) => c.date);
  const today = todayKey();
  // If most recent is today or yesterday, count consecutive days back.
  if (daysBetween(today, dates[0]) > 1) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) streak++;
    else break;
  }
  return streak;
}

export async function GET() {
  let student;
  try {
    student = await requireStudent();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = todayKey();
  const [todayCheckin, streak] = await Promise.all([
    storage.getCheckIn(student.id, today),
    computeStreak(student.id),
  ]);
  return NextResponse.json({
    todayChecked: !!todayCheckin,
    reflection: todayCheckin?.reflection ?? null,
    streak,
    date: today,
  });
}

const PostSchema = z.object({
  reflection: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  let student;
  try {
    student = await requireStudent();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = PostSchema.parse(await req.json().catch(() => ({})));
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid request",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
  const today = todayKey();
  await storage.upsertCheckIn({
    studentId: student.id,
    date: today,
    reflection: body.reflection,
  });
  const streak = await computeStreak(student.id);
  return NextResponse.json({ todayChecked: true, streak, date: today });
}
