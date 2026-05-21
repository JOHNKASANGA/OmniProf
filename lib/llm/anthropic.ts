import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
  GenerateStructuredInput,
  GenerateTextInput,
  LLMAdapter,
} from "./adapter";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 8192;

const globalForAnthropic = globalThis as unknown as {
  anthropic?: Anthropic;
};

function getClient(): Anthropic {
  if (!globalForAnthropic.anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
    }
    globalForAnthropic.anthropic = new Anthropic({ apiKey });
  }
  return globalForAnthropic.anthropic;
}

export const anthropicLLM: LLMAdapter = {
  async generateText({
    system,
    messages,
    maxTokens,
    temperature,
    model,
  }: GenerateTextInput): Promise<string> {
    const client = getClient();
    const response = await client.messages.create({
      model: model ?? DEFAULT_MODEL,
      max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  },

  async *streamText({
    system,
    messages,
    maxTokens,
    temperature,
    model,
  }: GenerateTextInput): AsyncIterable<string> {
    const client = getClient();
    const stream = client.messages.stream({
      model: model ?? DEFAULT_MODEL,
      max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  },

  async generateStructured<T>({
    system,
    messages,
    schema,
    schemaName,
    schemaDescription,
    maxTokens,
    temperature,
    model,
  }: GenerateStructuredInput<T>): Promise<T> {
    const client = getClient();
    const jsonSchema = z.toJSONSchema(schema, { target: "openapi-3.0" });
    // Strip the $schema field; Anthropic's tool input_schema doesn't want it.
    const { $schema: _drop, ...inputSchema } = jsonSchema as Record<
      string,
      unknown
    >;

    const response = await client.messages.create({
      model: model ?? DEFAULT_MODEL,
      max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature,
      system,
      tools: [
        {
          name: schemaName,
          description: schemaDescription,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          input_schema: inputSchema as any,
        },
      ],
      tool_choice: { type: "tool", name: schemaName },
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const toolUseBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUseBlock) {
      throw new Error(
        `generateStructured: model produced no tool_use block for ${schemaName}`,
      );
    }

    const parsed = schema.safeParse(toolUseBlock.input);
    if (!parsed.success) {
      throw new Error(
        `generateStructured: ${schemaName} failed validation — ${parsed.error.message}`,
      );
    }
    return parsed.data;
  },
};
