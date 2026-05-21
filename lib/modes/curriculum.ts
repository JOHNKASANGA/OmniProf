import { llm } from "@/lib/llm";
import {
  CurriculumMapSchema,
  type BackgroundLevel,
  type CurriculumMap,
} from "@/lib/state/schema";
import {
  CURRICULUM_SYSTEM_PROMPT,
  curriculumUserMessage,
} from "@/lib/prompts/curriculum";

export async function mapCurriculum(input: {
  courseCode: string;
  title: string;
  yearLevel: number;
  backgroundLevel: BackgroundLevel;
  outline?: string | null;
}): Promise<CurriculumMap> {
  return llm.generateStructured({
    system: CURRICULUM_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: curriculumUserMessage({
          courseCode: input.courseCode,
          title: input.title,
          yearLevel: input.yearLevel,
          outline: input.outline,
        }),
      },
    ],
    schema: CurriculumMapSchema,
    schemaName: "submit_curriculum_map",
    schemaDescription:
      "Submit the 12-16 week curriculum map for the given course.",
    temperature: 0.4,
    maxTokens: 4096,
  });
}
