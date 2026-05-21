import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { storage } from "@/lib/storage";

export const SESSION_COOKIE = "omniprof_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function startSessionForStudent(studentId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await storage.createSession(studentId, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentStudent() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const result = await storage.getSessionWithStudent(sessionId);
  if (!result) return null;
  if (result.session.expiresAt.getTime() < Date.now()) return null;
  return result.student;
}

export async function requireStudent() {
  const student = await getCurrentStudent();
  if (!student) throw new Error("Unauthorized");
  return student;
}

export async function signOutCurrent() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) await storage.deleteSession(sessionId);
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireOwnedCourse(courseId: string) {
  const student = await requireStudent();
  const course = await storage.getCourse(courseId);
  if (!course || course.studentId !== student.id) {
    throw new Error("Course not found");
  }
  return { student, course };
}
