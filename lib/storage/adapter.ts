import type {
  BackgroundLevel,
  CourseStatus,
  CurriculumMap,
  GradedFeedback,
  LearningStateView,
  MasteryStatus,
  ProblemSet,
  SolutionKey,
  TutorRole,
} from "@/lib/state/schema";

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  yearLevel: number;
  profilePicture: string | null;
  createdAt: Date;
}

export interface StudentWithCredentials extends StudentRecord {
  passwordHash: string;
}

export interface CourseRecord {
  id: string;
  studentId: string;
  title: string;
  courseCode: string;
  summary: string;
  backgroundLevel: BackgroundLevel;
  outline: string | null;
  totalWeeks: number;
  status: CourseStatus;
  createdAt: Date;
}

export interface WeekContent {
  id: string;
  weekNumber: number;
  topic: string;
  keyConcepts: string[];
  deliverables: string[];
  lecture: string | null;
  problemSet: ProblemSet | null;
}

export interface WeekContentWithKey extends WeekContent {
  solutionKey: SolutionKey | null;
}

export interface SubmissionRecord {
  id: string;
  weekId: string;
  content: string;
  score: number | null;
  maxScore: number | null;
  feedback: GradedFeedback | null;
  gradedAt: Date | null;
  createdAt: Date;
}

export interface ConceptMasteryRecord {
  concept: string;
  status: MasteryStatus;
  score: number;
  evidence: number;
}

export interface CheckInRecord {
  id: string;
  date: string;
  reflection: string | null;
  createdAt: Date;
}

export interface TutorMessageRecord {
  id: string;
  role: TutorRole;
  content: string;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  studentId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface StorageAdapter {
  // Students
  createStudent(input: {
    name: string;
    email: string;
    passwordHash: string;
    yearLevel: number;
  }): Promise<StudentRecord>;
  getStudent(id: string): Promise<StudentRecord | null>;
  getStudentByEmail(email: string): Promise<StudentWithCredentials | null>;

  // Courses
  createCourseFromCurriculum(input: {
    studentId: string;
    courseCode: string;
    backgroundLevel: BackgroundLevel;
    outline?: string | null;
    curriculum: CurriculumMap;
  }): Promise<CourseRecord>;
  getCourse(courseId: string): Promise<CourseRecord | null>;
  listCoursesForStudent(studentId: string): Promise<CourseRecord[]>;
  updateCourseStatus(courseId: string, status: CourseStatus): Promise<void>;

  // Curriculum view
  getCurriculum(courseId: string): Promise<CurriculumMap | null>;

  // Week content — Socratic gate
  getWeekForTutor(
    courseId: string,
    weekNumber: number,
  ): Promise<WeekContent | null>;
  getWeekWithKey(
    courseId: string,
    weekNumber: number,
  ): Promise<WeekContentWithKey | null>;
  saveLecture(
    courseId: string,
    weekNumber: number,
    lecture: string,
  ): Promise<void>;
  saveProblemSet(
    courseId: string,
    weekNumber: number,
    problemSet: ProblemSet,
  ): Promise<void>;
  saveSolutionKey(
    courseId: string,
    weekNumber: number,
    solutionKey: SolutionKey,
  ): Promise<void>;

  // Submissions
  createSubmission(weekId: string, content: string): Promise<SubmissionRecord>;
  saveGrade(
    submissionId: string,
    score: number,
    maxScore: number,
    feedback: GradedFeedback,
  ): Promise<void>;
  listSubmissions(weekId: string): Promise<SubmissionRecord[]>;

  // Learning state
  getLearningStateView(courseId: string): Promise<LearningStateView>;
  updateCurrentWeek(courseId: string, week: number): Promise<void>;
  setTutorAdjustments(courseId: string, adjustments: string): Promise<void>;
  recordConceptObservation(input: {
    courseId: string;
    concept: string;
    newScore: number;
  }): Promise<void>;
  listConceptMastery(courseId: string): Promise<ConceptMasteryRecord[]>;

  // Tutor messages
  appendTutorMessage(input: {
    courseId: string;
    weekNumber: number;
    role: TutorRole;
    content: string;
  }): Promise<void>;
  getTutorHistory(
    courseId: string,
    weekNumber: number,
    limit?: number,
  ): Promise<TutorMessageRecord[]>;

  // Sessions
  createSession(studentId: string, expiresAt: Date): Promise<SessionRecord>;
  getSessionWithStudent(
    sessionId: string,
  ): Promise<{ session: SessionRecord; student: StudentRecord } | null>;
  deleteSession(sessionId: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;

  // Daily check-ins
  upsertCheckIn(input: {
    studentId: string;
    date: string;
    reflection?: string;
  }): Promise<CheckInRecord>;
  getCheckIn(studentId: string, date: string): Promise<CheckInRecord | null>;
  listCheckIns(studentId: string, limit?: number): Promise<CheckInRecord[]>;
}
