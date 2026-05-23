import { prismaClient } from "./client";
import type {
  ConceptMasteryRecord,
  CourseRecord,
  StorageAdapter,
  StudentRecord,
  SubmissionRecord,
  TutorMessageRecord,
  WeekContent,
  WeekContentWithKey,
  ResourceRecord,
  CreateResourceInput,
} from "./adapter";

import {
  type BackgroundLevel,
  type CourseStatus,
  type GradedFeedback,
  type MasteryStatus,
  type ProblemSet,
  type SolutionKey,
  type TutorRole,
  statusFromScore,
} from "@/lib/state/schema";

// ---- JSON helpers ----
function parseJson<T>(s: string | null): T | null {
  if (s === null) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
function stringifyJson<T>(v: T): string {
  return JSON.stringify(v);
}

// ---- Competence-signal EMA ----
const ALPHA = 0.4;
function blendScore(prev: number | undefined, observation: number): number {
  if (prev === undefined) return observation;
  return prev * (1 - ALPHA) + observation * ALPHA;
}

export const prismaStorage: StorageAdapter = {
  // ---- Students ----
  async createStudent({ name, email, passwordHash, yearLevel }) {
    const r = await prismaClient.student.create({
      data: { name, email, passwordHash, yearLevel },
    });
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      yearLevel: r.yearLevel,
      profilePicture: r.profilePicture,
      createdAt: r.createdAt,
    };
  },
  async getStudent(id) {
    const r = await prismaClient.student.findUnique({ where: { id } });
    return r
      ? {
          id: r.id,
          name: r.name,
          email: r.email,
          yearLevel: r.yearLevel,
          profilePicture: r.profilePicture,
          createdAt: r.createdAt,
        }
      : null;
  },
  async getStudentByEmail(email) {
    const r = await prismaClient.student.findUnique({ where: { email } });
    return r
      ? {
          id: r.id,
          name: r.name,
          email: r.email,
          yearLevel: r.yearLevel,
          profilePicture: r.profilePicture,
          createdAt: r.createdAt,
          passwordHash: r.passwordHash,
        }
      : null;
  },

  // ---- Courses ----
  async createCourseFromCurriculum({
    studentId,
    courseCode,
    backgroundLevel,
    outline,
    curriculum,
  }) {
    const r = await prismaClient.course.create({
      data: {
        studentId,
        title: curriculum.courseTitle,
        courseCode,
        summary: curriculum.courseSummary,
        backgroundLevel,
        outline: outline ?? null,
        totalWeeks: curriculum.totalWeeks,
        weeks: {
          create: curriculum.weeks.map((w) => ({
            weekNumber: w.weekNumber,
            topic: w.topic,
            keyConcepts: stringifyJson(w.keyConcepts),
            deliverables: stringifyJson(w.deliverables),
          })),
        },
        learningState: { create: { currentWeek: 1 } },
      },
    });
    return mapCourse(r);
  },
  async getCourse(courseId) {
    const r = await prismaClient.course.findUnique({ where: { id: courseId } });
    return r ? mapCourse(r) : null;
  },
  async listCoursesForStudent(studentId) {
    const rows = await prismaClient.course.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapCourse);
  },
  async updateCourseStatus(courseId, status) {
    await prismaClient.course.update({
      where: { id: courseId },
      data: { status },
    });
  },

  // ---- Curriculum view ----
  async getCurriculum(courseId) {
    const course = await prismaClient.course.findUnique({
      where: { id: courseId },
      include: { weeks: { orderBy: { weekNumber: "asc" } } },
    });
    if (!course) return null;
    return {
      courseTitle: course.title,
      courseSummary: course.summary,
      totalWeeks: course.totalWeeks,
      weeks: course.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        topic: w.topic,
        keyConcepts: parseJson<string[]>(w.keyConcepts) ?? [],
        deliverables: parseJson<string[]>(w.deliverables) ?? [],
      })),
    };
  },

  // ---- Week content (Socratic gate) ----
  async getWeekForTutor(courseId, weekNumber) {
    const r = await prismaClient.week.findUnique({
      where: { courseId_weekNumber: { courseId, weekNumber } },
      select: {
        id: true,
        weekNumber: true,
        topic: true,
        keyConcepts: true,
        deliverables: true,
        lecture: true,
        problemSet: true,
      },
    });
    if (!r) return null;
    const out: WeekContent = {
      id: r.id,
      weekNumber: r.weekNumber,
      topic: r.topic,
      keyConcepts: parseJson<string[]>(r.keyConcepts) ?? [],
      deliverables: parseJson<string[]>(r.deliverables) ?? [],
      lecture: r.lecture,
      problemSet: parseJson<ProblemSet>(r.problemSet),
    };
    return out;
  },
  async getWeekWithKey(courseId, weekNumber) {
    const r = await prismaClient.week.findUnique({
      where: { courseId_weekNumber: { courseId, weekNumber } },
    });
    if (!r) return null;
    const out: WeekContentWithKey = {
      id: r.id,
      weekNumber: r.weekNumber,
      topic: r.topic,
      keyConcepts: parseJson<string[]>(r.keyConcepts) ?? [],
      deliverables: parseJson<string[]>(r.deliverables) ?? [],
      lecture: r.lecture,
      problemSet: parseJson<ProblemSet>(r.problemSet),
      solutionKey: parseJson<SolutionKey>(r.solutionKey),
    };
    return out;
  },
  async saveLecture(courseId, weekNumber, lecture) {
    await prismaClient.week.update({
      where: { courseId_weekNumber: { courseId, weekNumber } },
      data: { lecture },
    });
  },
  async saveProblemSet(courseId, weekNumber, problemSet) {
    await prismaClient.week.update({
      where: { courseId_weekNumber: { courseId, weekNumber } },
      data: { problemSet: stringifyJson(problemSet) },
    });
  },
  async saveSolutionKey(courseId, weekNumber, solutionKey) {
    await prismaClient.week.update({
      where: { courseId_weekNumber: { courseId, weekNumber } },
      data: { solutionKey: stringifyJson(solutionKey) },
    });
  },

  // ---- Submissions ----
  async createSubmission(weekId, content) {
    const r = await prismaClient.submission.create({
      data: { weekId, content },
    });
    return mapSubmission(r);
  },
  async saveGrade(submissionId, score, maxScore, feedback) {
    await prismaClient.submission.update({
      where: { id: submissionId },
      data: {
        score,
        maxScore,
        feedback: stringifyJson(feedback),
        gradedAt: new Date(),
      },
    });
  },
  async listSubmissions(weekId) {
    const rows = await prismaClient.submission.findMany({
      where: { weekId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapSubmission);
  },

  // ---- Learning state ----
  async getLearningStateView(courseId) {
    const [state, mastery] = await Promise.all([
      prismaClient.learningState.findUnique({ where: { courseId } }),
      prismaClient.conceptMastery.findMany({ where: { courseId } }),
    ]);
    return {
      currentWeek: state?.currentWeek ?? 1,
      masteredConcepts: mastery
        .filter((m) => m.status === "mastered")
        .map((m) => m.concept),
      struggleAreas: mastery
        .filter((m) => m.status === "struggling")
        .map((m) => m.concept),
      tutorAdjustments: state?.tutorAdjustments ?? "",
    };
  },
  async updateCurrentWeek(courseId, week) {
    await prismaClient.learningState.update({
      where: { courseId },
      data: { currentWeek: week },
    });
  },
  async setTutorAdjustments(courseId, adjustments) {
    await prismaClient.learningState.update({
      where: { courseId },
      data: { tutorAdjustments: adjustments },
    });
  },
  async recordConceptObservation({ courseId, concept, newScore }) {
    const existing = await prismaClient.conceptMastery.findUnique({
      where: { courseId_concept: { courseId, concept } },
    });
    const blended = blendScore(existing?.score, newScore);
    const status: MasteryStatus = statusFromScore(blended);
    if (existing) {
      await prismaClient.conceptMastery.update({
        where: { courseId_concept: { courseId, concept } },
        data: { score: blended, status, evidence: existing.evidence + 1 },
      });
    } else {
      await prismaClient.conceptMastery.create({
        data: { courseId, concept, score: blended, status, evidence: 1 },
      });
    }
  },
  async listConceptMastery(courseId): Promise<ConceptMasteryRecord[]> {
    const rows = await prismaClient.conceptMastery.findMany({
      where: { courseId },
    });
    return rows.map((r) => ({
      concept: r.concept,
      status: r.status as MasteryStatus,
      score: r.score,
      evidence: r.evidence,
    }));
  },

  // ---- Tutor messages ----
  async appendTutorMessage({ courseId, weekNumber, role, content }) {
    await prismaClient.tutorMessage.create({
      data: { courseId, weekNumber, role, content },
    });
  },
  async getTutorHistory(courseId, weekNumber, limit) {
    const rows = await prismaClient.tutorMessage.findMany({
      where: { courseId, weekNumber },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role as TutorRole,
      content: r.content,
      createdAt: r.createdAt,
    }));
  },

  // ---- Sessions ----
  async createSession(studentId, expiresAt) {
    const r = await prismaClient.session.create({
      data: { studentId, expiresAt },
    });
    return {
      id: r.id,
      studentId: r.studentId,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    };
  },
  async getSessionWithStudent(sessionId) {
    const r = await prismaClient.session.findUnique({
      where: { id: sessionId },
      include: { student: true },
    });
    if (!r) return null;
    if (r.expiresAt < new Date()) {
      await prismaClient.session
        .delete({ where: { id: sessionId } })
        .catch(() => {});
      return null;
    }
    return {
      session: {
        id: r.id,
        studentId: r.studentId,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      },
      student: {
        id: r.student.id,
        name: r.student.name,
        email: r.student.email,
        yearLevel: r.student.yearLevel,
        profilePicture: r.student.profilePicture,
        createdAt: r.student.createdAt,
      },
    };
  },
  async deleteSession(sessionId) {
    await prismaClient.session
      .delete({ where: { id: sessionId } })
      .catch(() => {});
  },
  async deleteExpiredSessions() {
    await prismaClient.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },

  // ---- Daily check-ins ----
  async upsertCheckIn({ studentId, date, reflection }) {
    const r = await prismaClient.dailyCheckIn.upsert({
      where: { studentId_date: { studentId, date } },
      create: { studentId, date, reflection: reflection ?? null },
      update: { reflection: reflection ?? null },
    });
    return {
      id: r.id,
      date: r.date,
      reflection: r.reflection,
      createdAt: r.createdAt,
    };
  },
  async getCheckIn(studentId, date) {
    const r = await prismaClient.dailyCheckIn.findUnique({
      where: { studentId_date: { studentId, date } },
    });
    return r
      ? {
          id: r.id,
          date: r.date,
          reflection: r.reflection,
          createdAt: r.createdAt,
        }
      : null;
  },
  async listCheckIns(studentId, limit) {
    const rows = await prismaClient.dailyCheckIn.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      reflection: r.reflection,
      createdAt: r.createdAt,
    }));
  },

  async createResource(input: CreateResourceInput): Promise<ResourceRecord> {
    const resource = await prismaClient.resource.upsert({
      where: {
        courseId_url: { courseId: input.courseId, url: input.url },
      },
      create: {
        courseId: input.courseId,
        title: input.title,
        url: input.url,
        sourceType: input.sourceType,
        description: input.description ?? null,
      },
      update: {
        title: input.title,
        sourceType: input.sourceType,
        description: input.description ?? null,
      },
    });
    return {
      id: resource.id,
      courseId: resource.courseId,
      title: resource.title,
      url: resource.url,
      sourceType: resource.sourceType,
      description: resource.description,
      createdAt: resource.createdAt,
    };
  },

  async listResources(courseId: string): Promise<ResourceRecord[]> {
    const resources = await prismaClient.resource.findMany({
      where: { courseId },
      orderBy: { createdAt: "asc" },
    });
    return resources.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      title: r.title,
      url: r.url,
      sourceType: r.sourceType,
      description: r.description,
      createdAt: r.createdAt,
    }));
  },

  async deleteResource(resourceId: string, courseId: string): Promise<void> {
    await prismaClient.resource.deleteMany({
      where: { id: resourceId, courseId },
    });
  },

  async clearResourcesForCourse(courseId: string): Promise<void> {
    await prismaClient.resource.deleteMany({
      where: { courseId },
    });
  },
};

// ---- Row-to-DTO mappers ----
function mapCourse(r: {
  id: string;
  studentId: string;
  title: string;
  courseCode: string;
  summary: string;
  backgroundLevel: string;
  outline: string | null;
  totalWeeks: number;
  status: string;
  createdAt: Date;
}): CourseRecord {
  return {
    id: r.id,
    studentId: r.studentId,
    title: r.title,
    courseCode: r.courseCode,
    summary: r.summary,
    backgroundLevel: r.backgroundLevel as BackgroundLevel,
    outline: r.outline,
    totalWeeks: r.totalWeeks,
    status: r.status as CourseStatus,
    createdAt: r.createdAt,
  };
}

function mapSubmission(r: {
  id: string;
  weekId: string;
  content: string;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  gradedAt: Date | null;
  createdAt: Date;
}): SubmissionRecord {
  return {
    id: r.id,
    weekId: r.weekId,
    content: r.content,
    score: r.score,
    maxScore: r.maxScore,
    feedback: parseJson<GradedFeedback>(r.feedback),
    gradedAt: r.gradedAt,
    createdAt: r.createdAt,
  };
}
