import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { storage } from "@/lib/storage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ResourceItemSchema = z.object({
  title: z.string().min(1).max(300),
  url: z.string().url(),
  description: z.string().max(500).optional(),
});
const ResourceListSchema = z.array(ResourceItemSchema).min(0).max(10);

const ALLOWED_DOMAINS = [
  "openstax.org",
  "libretexts.org",
  "ocw.mit.edu",
  "nptel.ac.in",
  "khanacademy.org",
  "archive.org",
  "wikipedia.org",
  "wikibooks.org",
  "gutenberg.org",
  "pearson.com",
  "mheducation.com",
  "wiley.com",
  "cambridge.org",
  "oup.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    if (hostname.endsWith(".edu")) return true;
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith("." + d),
    );
  } catch {
    return false;
  }
}

function inferSourceType(url: string): string {
  try {
    const h = new URL(url).hostname;
    if (h.includes("openstax")) return "openstax";
    if (h.includes("libretexts")) return "libretexts";
    if (h.includes("ocw.mit")) return "mit-ocw";
    if (h.includes("wikipedia") || h.includes("wikibooks")) return "wikipedia";
    if (h.includes("nptel")) return "nptel";
    if (h.includes("khanacademy")) return "khan";
    if (h.includes("archive.org")) return "archive";
    if (h.endsWith(".edu")) return "edu";
    if (
      h.includes("pearson") ||
      h.includes("mheducation") ||
      h.includes("wiley") ||
      h.includes("cambridge") ||
      h.includes("oup") ||
      h.includes("gutenberg")
    )
      return "publisher";
    return "other";
  } catch {
    return "other";
  }
}

export interface AssembleResourcesInput {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  topics: string[];
}

export interface AssembleResourcesResult {
  saved: number;
  resources: Array<{ title: string; url: string; sourceType: string }>;
}

export async function assembleResources(
  input: AssembleResourcesInput,
): Promise<AssembleResourcesResult> {
  const userMessage = `Find 3-5 high-quality, freely accessible educational resources for this university course.

Course: ${input.courseCode} — ${input.courseTitle}
Sample topics: ${input.topics.slice(0, 8).join("; ")}

Use the web_search tool. Prefer these trusted sources:
- OpenStax (openstax.org) — peer-reviewed free textbooks
- LibreTexts (libretexts.org)
- MIT OpenCourseWare (ocw.mit.edu)
- NPTEL (nptel.ac.in) — Indian govt-funded engineering courses
- Khan Academy (khanacademy.org)
- Wikipedia (wikipedia.org) — concept reference
- Internet Archive (archive.org)
- University .edu sites (lecture notes, syllabi)
- Publisher catalogue pages (pearson.com, mheducation.com, wiley.com, cambridge.org, oup.com)

Do NOT include:
- Pirated PDFs, sci-hub, libgen, z-library, file-sharing hosts
- Direct download links to copyrighted commercial textbooks
- Low-quality tutorial sites unless directly relevant

End your response with a single JSON code block containing the curated list:

\`\`\`json
[
  {
    "title": "OpenStax University Physics, Vol. 2",
    "url": "https://openstax.org/details/books/university-physics-volume-2",
    "description": "Free peer-reviewed textbook covering thermodynamics and electromagnetism."
  }
]
\`\`\`

Only include URLs you verified through search. Titles concise, descriptions one sentence.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlocks = response.content.filter(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  const lastText = textBlocks[textBlocks.length - 1]?.text ?? "";

  const jsonMatch = lastText.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    throw new Error("No JSON block found in resource search response");
  }

  const parsed = ResourceListSchema.parse(JSON.parse(jsonMatch[1]));

  const filtered = parsed.filter((r) => isAllowedUrl(r.url));
  const saved: Array<{ title: string; url: string; sourceType: string }> = [];

  for (const r of filtered) {
    const sourceType = inferSourceType(r.url);
    try {
      await storage.createResource({
        courseId: input.courseId,
        title: r.title.trim(),
        url: r.url,
        sourceType,
        description: r.description?.trim() ?? null,
      });
      saved.push({ title: r.title.trim(), url: r.url, sourceType });
    } catch (err) {
      console.error(`Failed to save resource ${r.url}`, err);
    }
  }

  return { saved: saved.length, resources: saved };
}
