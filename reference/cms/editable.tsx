"use client";

/**
 * Inline editing primitives. In view mode they render exactly what the
 * server rendered — same tags, same classes, zero overhead. When edit
 * mode is toggled on, they switch in place:
 *   <E>       text of any tag → contentEditable, bound to a JSON path
 *   <EImg>    image → hover overlay with inline URL + alt + upload
 *   <EIcon>   icon/badge → anchored picker (search, suggestions, SVG upload)
 *   <ERemove> / <EAdd>  inline list controls (small, on the element)
 * No dialogs, no side panels — the page is the editor.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Minus, Plus } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { IconSelector } from "./IconSelector";
import { useCmsEditing, setPath as storeSetPath, type DocScope } from "./store";
import type { ImageRef } from "@/content/types";
import type { PathSegment } from "./json";
import { cn } from "@/lib/cn";
import { uploadAsset } from "./uploadAsset";

/* ---------------- text ---------------- */

export function E({
  path,
  value,
  as: Tag = "span" as ElementType,
  className,
  style,
  display,
  multilineBreaks = false,
  numeric = false,
  scope = "page",
}: {
  path: PathSegment[];
  value: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** richer view-mode rendering (e.g. gradient <em> words) */
  display?: ReactNode;
  /** keep newlines when reading edited text */
  multilineBreaks?: boolean;
  /** store the edited text as a number (stat values etc.) */
  numeric?: boolean;
  /** which document the path belongs to (page doc or site chrome) */
  scope?: DocScope;
}) {
  const { editing, epoch, ready } = useCmsEditing();

  if (!editing || !ready) {
    return (
      <Tag className={className} style={style}>
        {display ?? value}
      </Tag>
    );
  }

  return (
    <EditableTextLeaf
      key={epoch}
      path={path}
      initial={value}
      as={Tag}
      className={className}
      style={style}
      multilineBreaks={multilineBreaks}
      numeric={numeric}
      scope={scope}
    />
  );
}

function EditableTextLeaf({
  path,
  initial,
  as: Tag,
  className,
  style,
  multilineBreaks,
  numeric,
  scope,
}: {
  path: PathSegment[];
  initial: string;
  as: ElementType;
  className?: string;
  style?: CSSProperties;
  multilineBreaks: boolean;
  numeric?: boolean;
  scope: DocScope;
}) {
  const ref = useRef<HTMLElement>(null);

  // set text once on mount — the element is uncontrolled afterwards so
  // the caret never jumps while typing
  useEffect(() => {
    if (ref.current) ref.current.textContent = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const text = multilineBreaks ? el.innerText : (el.textContent ?? "");
    storeSetPath(
      path,
      numeric ? Number(text.replace(/[^\d.-]/g, "")) || 0 : text,
      scope,
    );
  };

  return (
    <Tag
      ref={ref}
      className={cn(className, "cms-e")}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={commit}
      onPaste={(e: React.ClipboardEvent) => {
        // always paste as PLAIN text — never the source formatting
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        sel.deleteFromDocument();
        sel.getRangeAt(0).insertNode(document.createTextNode(text));
        sel.collapseToEnd();
        commit();
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multilineBreaks) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
      onClick={(e: React.MouseEvent) => {
        // keep clicks from triggering parent links/buttons
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
}

/* ---------------- image ---------------- */

const VIDEO_URL_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

/** Only one media panel may be open at a time: opening one closes the
 *  previous (module-level singleton across every EImg on the page). */
let closeActivePanel: (() => void) | null = null;

/** Auto-close an untouched panel after this long. */
const PANEL_IDLE_MS = 3 * 60 * 1000;

export function EImg({
  path,
  image,
  height,
  radius,
  className = "ph",
  style,
  scope = "page",
  fit = "fill",
  storedAs = "object",
}: {
  /** path to the stored value (an ImageRef object, or a plain URL string) */
  path: PathSegment[];
  image: ImageRef;
  height?: number;
  radius?: string;
  className?: string;
  style?: CSSProperties;
  scope?: DocScope;
  /**
   * How the edit-mode wrapper sizes itself. "fill" (default) makes it
   * fill its parent — correct when the image already uses h-full/w-full
   * inside a sized box. "content" hugs the image's natural size — for
   * logos/icons sized by their own classes (e.g. `h-14 w-auto`).
   * Either way view mode renders the bare image, unchanged.
   */
  fit?: "fill" | "content";
  /**
   * Shape of the value at `path` in the document. "object" is a full
   * ImageRef ({src, alt, type}); "string" means the document stores just
   * the URL (services[].image, client logos, …). String fields MUST save
   * a plain string — writing {src} onto them turns the value into an
   * object and the page renders "[object Object]".
   */
  storedAs?: "object" | "string";
}) {
  const { editing, ready } = useCmsEditing();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
    null,
  );
  // Staged edits: the panel works on a local copy and writes to the
  // draft only when the user clicks Save (which also closes the panel).
  const [draftSrc, setDraftSrc] = useState("");
  const [draftAlt, setDraftAlt] = useState("");
  const [draftType, setDraftType] = useState<"image" | "video">("image");
  const [previewBroken, setPreviewBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef<() => void>(() => {});

  const savedIsVideo =
    image.type === "video" || VIDEO_URL_RE.test(image.src ?? "");
  const stagedIsVideo = draftType === "video" || VIDEO_URL_RE.test(draftSrc);

  const close = () => {
    setOpen(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
    if (closeActivePanel === closeRef.current) closeActivePanel = null;
  };
  closeRef.current = close;

  // any interaction inside the panel restarts the idle countdown
  const touch = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => closeRef.current(), PANEL_IDLE_MS);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // unmount safety: release the singleton slot and the timer
  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (closeActivePanel === closeRef.current) closeActivePanel = null;
    },
    [],
  );

  const img = (
    <SmartImage
      image={image}
      height={height}
      radius={radius}
      className={className}
      style={style}
    />
  );

  if (!editing || !ready) return img;

  // Anchor the panel to the badge in viewport coords; it renders in a
  // portal on <body> so no `overflow:hidden` card can clip it.
  const openPanel = () => {
    if (open) {
      close();
      return;
    }
    closeActivePanel?.(); // one panel at a time
    closeActivePanel = closeRef.current;
    // stage the current values
    setDraftSrc(image.src ?? "");
    setDraftAlt(image.alt ?? "");
    setDraftType(savedIsVideo ? "video" : "image");
    setPreviewBroken(false);
    const r = badgeRef.current?.getBoundingClientRect();
    if (r) {
      const width = Math.min(340, window.innerWidth - 24);
      setAnchor({
        top: Math.max(12, Math.min(r.bottom + 8, window.innerHeight - 430)),
        left: Math.min(
          Math.max(12, r.right - width),
          window.innerWidth - width - 12,
        ),
      });
    }
    setOpen(true);
    touch();
  };

  const dirty =
    draftSrc !== (image.src ?? "") ||
    (storedAs === "object" &&
      (draftAlt !== (image.alt ?? "") ||
        draftType !== (savedIsVideo ? "video" : "image")));

  const save = () => {
    if (storedAs === "string") {
      // plain string documents get a plain string back — this also
      // self-heals values corrupted into {src} by earlier versions
      storeSetPath(path, draftSrc, scope);
    } else {
      storeSetPath(
        path,
        { ...image, src: draftSrc, alt: draftAlt, type: draftType },
        scope,
      );
    }
    close();
  };

  return (
    <span
      className={cn("cms-img", fit === "content" && "cms-img--content")}
      style={{ borderRadius: radius }}
      data-cms-ui
    >
      {img}
      <button
        ref={badgeRef}
        type="button"
        className="cms-img-badge"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openPanel();
        }}
      >
        {open ? "Close" : savedIsVideo ? "Edit video" : "Edit image"}
      </button>
      {open &&
        anchor &&
        createPortal(
          <span
            className="cms-img-bar"
            style={{ top: anchor.top, left: anchor.left }}
            data-cms-ui
            onClick={(e) => {
              e.stopPropagation();
              touch();
            }}
            onInput={touch}
          >
            <span className="cms-bar-head">
              <span className="cms-bar-title">
                {stagedIsVideo ? "Edit video" : "Edit image"}
              </span>
              <button
                type="button"
                className="cms-bar-x"
                aria-label="Close"
                onClick={close}
              >
                ✕
              </button>
            </span>
            <span className="cms-bar-preview">
              {!draftSrc || previewBroken ? (
                <span className="cms-bar-preview-empty">
                  {previewBroken ? "Preview unavailable" : "No media yet"}
                </span>
              ) : stagedIsVideo ? (
                <video
                  src={draftSrc}
                  muted
                  loop
                  autoPlay
                  playsInline
                  onError={() => setPreviewBroken(true)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draftSrc}
                  alt=""
                  onError={() => setPreviewBroken(true)}
                />
              )}
            </span>
            <label>
              <span>URL</span>
              <input
                value={draftSrc}
                onChange={(e) => {
                  setDraftSrc(e.target.value);
                  setPreviewBroken(false);
                }}
                placeholder="https://…"
              />
            </label>
            {storedAs === "object" && (
              <>
                <label>
                  <span>Alt</span>
                  <input
                    value={draftAlt}
                    onChange={(e) => setDraftAlt(e.target.value)}
                    placeholder="Describe the media"
                  />
                </label>
                <label>
                  <span>Type</span>
                  <select
                    value={draftType}
                    onChange={(e) =>
                      setDraftType(e.target.value as "image" | "video")
                    }
                  >
                    <option value="image">Image / SVG / GIF</option>
                    <option value="video">Video (mp4 / webm)</option>
                  </select>
                </label>
              </>
            )}
            <button
              type="button"
              className="cms-upload"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading
                ? "Uploading…"
                : stagedIsVideo
                  ? "Upload video"
                  : "Upload image / SVG"}
            </button>
            <span className="cms-bar-actions">
              <button type="button" className="cms-cancel" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="cms-save"
                disabled={!dirty || uploading}
                onClick={save}
              >
                Save
              </button>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept={
                stagedIsVideo
                  ? "video/mp4,video/webm,.mp4,.webm"
                  : "image/*,.svg,.gif"
              }
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                touch();
                try {
                  const url = await uploadAsset(file);
                  // staged only — the page updates when Save is clicked
                  setDraftSrc(url);
                  setDraftType(VIDEO_URL_RE.test(url) ? "video" : "image");
                  setPreviewBroken(false);
                  const { toast } = await import("sonner");
                  toast.success("Upload complete", {
                    description: "Click Save to apply it.",
                  });
                } catch (err) {
                  const message = (err as Error).message;
                  const { toast } = await import("sonner");
                  toast.error(
                    message === "Unauthorized"
                      ? "Editor key required to upload"
                      : "Upload failed",
                    {
                      description:
                        message === "Unauthorized"
                          ? "Enter the editor key from the toolbar, then try again."
                          : message,
                    },
                  );
                } finally {
                  setUploading(false);
                  // allow re-picking the same file after a failure
                  e.target.value = "";
                }
              }}
            />
          </span>,
          document.body,
        )}
    </span>
  );
}

/* ---------------- icon / badge ---------------- */

export function EIcon({
  path,
  value,
  children,
  scope = "page",
  onPick,
  color,
  onColor,
  bg,
  onBg,
}: {
  /** path to the string icon/badge value (lucide name, text, or uploaded URL) */
  path: PathSegment[];
  value: string;
  /** view/edit-mode rendering (the resolved icon / badge) */
  children: ReactNode;
  scope?: DocScope;
  /**
   * custom write handler — used by list components that need to
   * restructure the item on pick (e.g. converting a plain-string
   * check item into `{ text, icon }` for a per-item icon)
   */
  onPick?: (icon: string) => void;
  /** current icon color; provide onColor to show the color row (null = inherit) */
  color?: string;
  onColor?: (color: string | null) => void;
  /** current chip background; provide onBg to show the background row (null = none) */
  bg?: string;
  onBg?: (color: string | null) => void;
}) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return <>{children}</>;
  // the rendered icon itself is the picker trigger — click it to change
  return (
    <IconSelector
      value={value}
      color={color}
      onChange={(icon) =>
        onPick ? onPick(icon) : storeSetPath(path, icon, scope)
      }
      showColor={!!onColor}
      onColorChange={onColor}
      bgColor={bg}
      onBgColorChange={onBg}
      allowUpload
      allowText
      trigger={children}
    />
  );
}

/* ---------------- list controls ---------------- */

export function ERemove({
  onRemove,
  label,
}: {
  onRemove: () => void;
  label: string;
}) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return null;
  return (
    <button
      type="button"
      className="cms-remove"
      data-cms-ui
      aria-label={`Remove ${label}`}
      title={`Remove ${label}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      }}
    >
      <Minus size={11} strokeWidth={3} />
    </button>
  );
}

export function EAdd({ onAdd, label }: { onAdd: () => void; label: string }) {
  const { editing, ready } = useCmsEditing();
  if (!editing || !ready) return null;
  return (
    <button
      type="button"
      className="cms-add"
      data-cms-ui
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onAdd();
      }}
    >
      <Plus size={12} strokeWidth={3} />
      <span>{label}</span>
    </button>
  );
}

/** Blocks navigation while editing (wrap around Link/anchor content). */
export function useEditingGuard() {
  const { editing, ready } = useCmsEditing();
  const active = editing && ready;
  return {
    editing: active,
    guard: (e: React.MouseEvent) => {
      if (active) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };
}
