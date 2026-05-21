"use client";

import React, { useEffect, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import mermaid from "mermaid";

let mermaidInitialized = false;
function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    fontFamily: "inherit",
    flowchart: { curve: "basis", padding: 12 },
  });
  mermaidInitialized = true;
}

function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(`m-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    let cancelled = false;
    initMermaid();
    mermaid
      .render(idRef.current, chart)
      .then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch((err) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre class="mermaid-error">Mermaid error: ${err?.message ?? String(err)}</pre>`;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return <div className="mermaid-container" ref={ref} />;
}

const components: Components = {
  pre({ children }) {
    const child = React.Children.toArray(children)[0];
    if (
      React.isValidElement(child) &&
      typeof (child.props as { className?: string }).className === "string" &&
      /\blanguage-mermaid\b/.test(
        (child.props as { className: string }).className,
      )
    ) {
      const raw = String(
        (child.props as { children?: unknown }).children ?? "",
      ).replace(/\n$/, "");
      return <MermaidBlock chart={raw} />;
    }
    return <pre>{children}</pre>;
  },
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
