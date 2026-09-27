"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JsonObject } from "./json";
import { useCmsEditing } from "./store";

export function createCmsItemId(prefix = "item"): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

export function moveListItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  ) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function duplicateListItem<T extends JsonObject>(
  items: T[],
  index: number,
  nextId = createCmsItemId("item"),
): T[] {
  const source = items[index];
  if (!source) return [...items];
  const duplicate = JSON.parse(JSON.stringify(source)) as T;
  (duplicate as JsonObject).id = nextId;
  return [...items.slice(0, index + 1), duplicate, ...items.slice(index + 1)];
}

export function removeListItem<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function toggleListItemVisibility<T extends JsonObject>(
  items: T[],
  index: number,
): T[] {
  return items.map((item, itemIndex) =>
    itemIndex === index
      ? ({ ...item, visible: item.visible === false } as T)
      : item,
  );
}

export function InlineListControls({
  label,
  index,
  count,
  visible = true,
  axis = "vertical",
  placement = "overlay",
  showPosition = true,
  onMove,
  onDuplicate,
  onToggleVisibility,
  onRemove,
}: {
  label: string;
  index: number;
  count: number;
  visible?: boolean;
  axis?: "vertical" | "horizontal";
  placement?: "overlay" | "inline";
  showPosition?: boolean;
  onMove: (toIndex: number) => void;
  onDuplicate?: () => void;
  onToggleVisibility?: () => void;
  onRemove?: () => void;
}) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return null;

  const PreviousIcon = axis === "horizontal" ? ArrowLeft : ArrowUp;
  const NextIcon = axis === "horizontal" ? ArrowRight : ArrowDown;
  const previousWord = axis === "horizontal" ? "left" : "up";
  const nextWord = axis === "horizontal" ? "right" : "down";
  const iconButton =
    "h-7 w-7 rounded-full border border-white/20 bg-slate-900/85 p-0 text-white shadow hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-35";
  const containerClass =
    placement === "inline"
      ? "cms-inline-list-controls flex shrink-0 items-center gap-1 rounded-full bg-slate-950/80 p-1 shadow-xl backdrop-blur"
      : "cms-inline-list-controls absolute right-2 top-2 z-40 flex items-center gap-1 rounded-full bg-slate-950/80 p-1 shadow-xl backdrop-blur";

  return (
    <div
      className={containerClass}
      data-cms-ui
      aria-label={`${label} controls`}
    >
      {showPosition && (
        <span className="min-w-8 px-1 text-center text-[11px] font-bold text-white">
          {index + 1}/{count}
        </span>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={iconButton}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        title={`Move ${label} ${previousWord}`}
        aria-label={`Move ${label} ${previousWord}`}
      >
        <PreviousIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={iconButton}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
        title={`Move ${label} ${nextWord}`}
        aria-label={`Move ${label} ${nextWord}`}
      >
        <NextIcon className="h-3.5 w-3.5" />
      </Button>
      {onDuplicate && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={iconButton}
          onClick={onDuplicate}
          title={`Duplicate ${label}`}
          aria-label={`Duplicate ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
      {onToggleVisibility && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={iconButton}
          onClick={onToggleVisibility}
          title={visible ? `Hide ${label}` : `Show ${label}`}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={!visible}
        >
          {visible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
      {onRemove && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`${iconButton} hover:bg-red-600`}
          onClick={onRemove}
          title={`Remove ${label}`}
          aria-label={`Remove ${label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
