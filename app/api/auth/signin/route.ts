import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/storage";
import { verifyPassword, startSessionForStudent } from "@/lib/auth";

export const runtime = "nodejs";

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
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

  const record = await storage.getStudentByEmail(parsed.email);
  if (!record) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.password, record.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await startSessionForStudent(record.id);

  // Strip the password hash before returning.
  const { passwordHash: _drop, ...student } = record;
  return NextResponse.json({ student });
}
