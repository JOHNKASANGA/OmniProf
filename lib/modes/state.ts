import { z } from "zod";
import { llm } from "@/lib/llm";
import { storage } from "@/lib/storage";
import { loadSafeContext } from "./router";
import {
  STATE_EXTRACTION_SYSTEM_PROMPT,
  stateExtractionUserMessage,
} from "@/lib/prompts/state";

const ConceptObservationSchema = z.object({
  concept: z.string().min(1),
  score: z.number().min(0).max(1),
  evidence: z.string().min(1).max(500),
});

const StateExtractionResultSchema = z.object({
  observations: z.array(ConceptObservationSchema).max(20),
  tutorAdjustments: z.string().max(1000).nullable(),
  summary: z.string().max(500),
});

export interface ExtractionResult {
  observationsApplied: number;
  adjustmentsUpdated: boolean;
  summary: string;
}

export async function extractStateFromTutorSession(input: {
  courseId: string;
  weekNumber: number;
  historyLimit?: number;
}): Promise<ExtractionResult> {
  const ctx = await loadSafeContext(
    "state-extract",
    input.courseId,
    input.weekNumber,
  );
  if (!ctx.course) throw new Error(`Course ${input.courseId} not found`);
  if (!ctx.week) throw new Error(`Week ${input.weekNumber} not found`);

  const history = await storage.getTutorHistory(
    input.courseId,
    input.weekNumber,
    input.historyLimit ?? 100,
  );

  if (history.length < 2) {
    return {
      observationsApplied: 0,
      adjustmentsUpdated: false,
      summary: "Not enough conversation to analyze.",
    };
  }

  const result = await llm.generateStructured({
    system: STATE_EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: stateExtractionUserMessage({
          weekNumber: ctx.week.weekNumber,
          topic: ctx.week.topic,
          keyConcepts: ctx.week.keyConcepts,
          history,
          currentAdjustments: ctx.state.tutorAdjustments,
        }),
      },
    ],
    schema: StateExtractionResultSchema,
    schemaName: "submit_state_observations",
    schemaDescription:
      "Submit pedagogical observations extracted from the tutor session.",
    temperature: 0.3,
    maxTokens: 2048,
  });

  // Apply each concept observation through the EMA-blending storage method.
  await Promise.all(
    result.observations.map((obs) =>
      storage.recordConceptObservation({
        courseId: input.courseId,
        concept: obs.concept,
        newScore: obs.score,
      }),
    ),
  );

  let adjustmentsUpdated = false;
  if (result.tutorAdjustments && result.tutorAdjustments.trim().length > 0) {
    await storage.setTutorAdjustments(input.courseId, result.tutorAdjustments);
    adjustmentsUpdated = true;
  }

  return {
    observationsApplied: result.observations.length,
    adjustmentsUpdated,
    summary: result.summary,
  };
}
