"use client";

import { useState } from "react";
import { EAdd, ERemove } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject, PathSegment } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { BLOCK_TYPES, type BlogBlock, type BlogBlockType } from "./blogModel";
import { BlogBlockView } from "./blocks/BlogBlock";

const BLANK: Record<BlogBlockType, JsonObject> = {
  heading: { text: "Section heading" },
  paragraph: { text: "Write the next paragraph here." },
  bulletList: { items: ["First point", "Second point"] },
  checklist: { items: ["First benefit", "Second benefit"] },
  quote: { text: "A quote worth pulling out.", attribution: "Source" },
  image: { src: "/placeholder.svg", alt: "", caption: "" },
  callout: {
    title: "Ready to start?",
    body: "Tell us about your project.",
    buttonLabel: "Contact Us",
    buttonHref: "/contact",
  },
};

const LABELS: Record<BlogBlockType, string> = {
  heading: "heading",
  paragraph: "paragraph",
  bulletList: "bullet list",
  checklist: "checklist",
  quote: "quote",
  image: "image",
  callout: "call to action",
};

export function BlogBody({
  blocks,
  basePath,
}: {
  blocks: BlogBlock[];
  basePath: PathSegment[];
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const [picking, setPicking] = useState(false);

  const update = (next: JsonObject[]) => setPath(basePath, next);

  const addBlock = (type: BlogBlockType) => {
    update([
      ...blocks,
      { id: createCmsItemId(type), type, visible: true, ...BLANK[type] },
    ]);
    setPicking(false);
  };

  return (
    <div>
      {blocks.map((block, index) => (
        <div key={block.id} className="relative">
          {editActive && (
            <ERemove
              onRemove={() => update(blocks.filter((_, position) => position !== index))}
              label={`${LABELS[block.type]} block`}
            />
          )}
          <BlogBlockView block={block} basePath={basePath} index={index} />
        </div>
      ))}

      {editActive && (
        <div className="mt-8 border-t border-dashed border-border pt-4">
          {picking ? (
            <div className="flex flex-wrap gap-2">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  data-cms-ui
                  onClick={() => addBlock(type)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  {LABELS[type]}
                </button>
              ))}
            </div>
          ) : (
            <EAdd onAdd={() => setPicking(true)} label="Add block" />
          )}
        </div>
      )}
    </div>
  );
}
