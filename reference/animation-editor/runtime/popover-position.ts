export interface PopoverPosition {
  top: number;
  left: number;
  placement: "above" | "below";
}

export function calculatePopoverPosition(
  anchor: Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width" | "height">,
  viewport: { width: number; height: number },
  popover: { width: number; height: number },
): PopoverPosition {
  const gap = 8;
  const padding = 12;
  const availableWidth = Math.max(0, viewport.width - padding * 2);
  const safeWidth = Math.min(popover.width, availableWidth);
  const placement =
    anchor.bottom + gap + popover.height <= viewport.height - padding
      ? "below"
      : "above";
  const top =
    placement === "below"
      ? Math.max(padding, anchor.bottom + gap)
      : Math.max(padding, anchor.top - gap - popover.height);
  const left = Math.min(
    Math.max(padding, anchor.right - safeWidth),
    Math.max(padding, viewport.width - safeWidth - padding),
  );
  return { top, left, placement };
}
