export interface PromptResource {
  title: string;
  url: string;
  sourceType: string;
  description: string | null;
}

export function formatResourcesBlock(resources: PromptResource[]): string {
  if (resources.length === 0) return "";
  const list = resources
    .map(
      (r, i) =>
        `${i + 1}. [${r.title}](${r.url})${r.description ? ` — ${r.description}` : ""}`,
    )
    .join("\n");
  return `

---
Reference materials available for this course:

${list}

When you make a substantive claim that one of these resources supports, cite it inline as a markdown link to the resource's URL. Only cite from this list — never invent URLs. If you don't know the specific section, link to the resource root. Citations should support the explanation, not interrupt it. Limit yourself to at most 4–5 citations across the whole response.`;
}
