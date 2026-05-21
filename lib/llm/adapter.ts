import type { ZodType } from "zod";

export type LLMMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface GenerateTextInput {
  system?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface GenerateStructuredInput<T> {
  system?: string;
  messages: LLMMessage[];
  schema: ZodType<T>;
  schemaName: string; // used as the forced tool name
  schemaDescription: string; // explains what the structured output represents
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMAdapter {
  generateText(input: GenerateTextInput): Promise<string>;
  streamText(input: GenerateTextInput): AsyncIterable<string>;
  generateStructured<T>(input: GenerateStructuredInput<T>): Promise<T>;
}
