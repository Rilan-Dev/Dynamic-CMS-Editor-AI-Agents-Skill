"use client";

import { Plus } from "lucide-react";
import { useCmsEditing } from "./store";

export function InlineAddIcon({
  onAdd,
  label,
  disabled = false,
  expanded,
  controls,
}: {
  onAdd: () => void;
  label: string;
  disabled?: boolean;
  expanded?: boolean;
  controls?: string;
}) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return null;

  return (
    <button
      type="button"
      className="cms-add cms-add--icon-only"
      data-cms-ui
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      aria-controls={controls}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) onAdd();
      }}
    >
      <Plus size={13} strokeWidth={3} />
    </button>
  );
}
