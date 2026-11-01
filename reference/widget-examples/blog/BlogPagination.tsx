"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function BlogPagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (next: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Blog pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      {Array.from({ length: pages }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onChange(index)}
          aria-current={index === page ? "page" : undefined}
          className={`h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
            index === page
              ? "bg-brand text-brand-contrast"
              : "border border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          {index + 1}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages - 1}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
