const WORDS_PER_MINUTE = 200;

const textOf = (block: unknown): string => {
  if (!block || typeof block !== "object" || Array.isArray(block)) return "";
  const value = block as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["text", "title", "body", "attribution", "caption"]) {
    if (typeof value[key] === "string") parts.push(value[key] as string);
  }
  if (Array.isArray(value.items)) {
    for (const item of value.items) {
      if (typeof item === "string") parts.push(item);
    }
  }
  return parts.join(" ");
};

/** Whole minutes at 200 words per minute, rounded up, never below one. */
export function readingMinutes(blocks: unknown): number {
  if (!Array.isArray(blocks)) return 1;
  const words = blocks
    .map(textOf)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
