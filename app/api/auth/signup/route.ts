import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/storage";
import { hashPassword, startSessionForStudent } from "@/lib/auth";
import { YearLevelSchema } from "@/lib/state/schema";

export const runtime = "nodejs";

const RequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  yearLevel: YearLevelSchema,
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid request",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  const existing = await storage.getStudentByEmail(parsed.email);
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(parsed.password);
  const student = await storage.createStudent({
    name: parsed.name,
    email: parsed.email,
    passwordHash,
    yearLevel: parsed.yearLevel,
  });

  await startSessionForStudent(student.id);
  return NextResponse.json({ student }, { status: 201 });
}
