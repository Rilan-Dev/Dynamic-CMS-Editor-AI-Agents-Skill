"use client";

import { useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Settings, Upload, type LucideIcon } from "lucide-react";
import { ALL_ICONS } from "./icons";
import { getPageSlug } from "./store";
import { cn } from "@/lib/cn";
import { uploadAsset } from "./uploadAsset";

/**
 * Icon picker for CMS icon/badge fields:
 *  - searchable Lucide library (domain-curated registry)
 *  - contextual suggestions for the current page
 *  - free text mode (badges like "01", "IN")
 *  - SVG / image upload → stored under /uploads, value becomes the URL
 */

const normalizeHex = (v: string) => {
  if (!v) return "#0b8a4e";
  let x = v.trim();
  if (!x.startsWith("#")) x = `#${x}`;
  if (/^#[0-9a-fA-F]{3}$/.test(x))
    x = `#${x[1]}${x[1]}${x[2]}${x[2]}${x[3]}${x[3]}`;
  return /^#[0-9a-fA-F]{6}$/.test(x) ? x : "#0b8a4e";
};

const PRESETS = [
  "#0b8a4e",
  "#12b76a",
  "#c9f158",
  "#0c1d14",
  "#2563eb",
  "#dc2626",
  "#facc15",
];

/** soft chip backgrounds for button/badge glyphs (first = brand default) */
const BG_PRESETS = [
  "rgba(18,183,106,0.16)",
  "rgba(201,241,88,0.45)",
  "#c9f158",
  "#12b76a",
  "#0c1d14",
  "#ffffff",
];

/** contextual suggestions per page (falls back to a general set) */
const SUGGESTIONS: Record<string, string[]> = {
  home: [
    "Leaf",
    "Sprout",
    "Sun",
    "Droplets",
    "Truck",
    "Globe",
    "Star",
    "Heart",
  ],
  plants: [
    "Leaf",
    "Flower",
    "Flower2",
    "Sun",
    "Heart",
    "Star",
    "Sprout",
    "TreePalm",
  ],
  farms: [
    "Tractor",
    "Sprout",
    "Sun",
    "Droplets",
    "Mountain",
    "Crop",
    "Trees",
    "Warehouse",
  ],
  technology: [
    "Cpu",
    "Wifi",
    "Gauge",
    "Thermometer",
    "Droplet",
    "LineChart",
    "Satellite",
    "Zap",
  ],
  products: [
    "Package",
    "Box",
    "Warehouse",
    "ShoppingCart",
    "Ruler",
    "Fan",
    "Droplets",
    "Sheet",
  ],
  projects: [
    "Trophy",
    "Medal",
    "MapPin",
    "Building2",
    "Hammer",
    "Award",
    "Star",
    "Target",
  ],
  services: [
    "HandHeart",
    "Wrench",
    "ShieldCheck",
    "Calendar",
    "HeartPulse",
    "Users",
    "BadgeCheck",
    "Clock",
  ],
  export: [
    "Globe",
    "Ship",
    "Plane",
    "Truck",
    "Container",
    "PackageCheck",
    "Map",
    "Flag",
  ],
  contact: [
    "Phone",
    "Mail",
    "MapPin",
    "MessageCircle",
    "Clock",
    "Send",
    "Building",
    "Users",
  ],
};
const GENERAL = [
  "Leaf",
  "Sprout",
  "Sun",
  "Star",
  "Heart",
  "Globe",
  "Truck",
  "Settings",
];

const isUrl = (v: string) => v.startsWith("/") || v.startsWith("http");

export function IconSelector({
  value,
  color = "#0b8a4e",
  onChange,
  onColorChange,
  showColor = true,
  bgColor,
  onBgColorChange,
  allowUpload = false,
  allowText = false,
  className,
  trigger,
}: {
  value?: string;
  color?: string;
  onChange: (icon: string, color: string) => void;
  /** null resets to "auto" (inherit surrounding text color) */
  onColorChange?: (color: string | null) => void;
  showColor?: boolean;
  /** chip background behind the icon; provide the handler to enable the row */
  bgColor?: string;
  /** null removes the chip (bare icon) */
  onBgColorChange?: (color: string | null) => void;
  allowUpload?: boolean;
  allowText?: boolean;
  className?: string;
  /**
   * Custom trigger: the rendered icon itself. Clicking it opens the
   * picker. Open state is toggled manually with preventDefault +
   * stopPropagation so parent links/buttons (bento cards, logo) never
   * navigate and Radix's own toggle doesn't double-fire.
   */
  trigger?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const SelectedIcon: LucideIcon = (value && ALL_ICONS[value]) || Settings;
  const filtered = Object.keys(ALL_ICONS).filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );
  const suggestions = (SUGGESTIONS[getPageSlug()] ?? GENERAL).filter(
    (n) => ALL_ICONS[n],
  );

  const triggerPreview = isUrl(value ?? "") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={value} alt="" className="h-4 w-4 object-contain" />
  ) : (
    <SelectedIcon className="h-4 w-4" style={{ color }} />
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          <span
            className="cms-icon-trigger"
            data-cms-ui
            role="button"
            tabIndex={0}
            title="Change icon"
            onClick={(e) => {
              // manual toggle: preventDefault keeps parent links/Next
              // router from navigating AND makes Radix skip its own
              // toggle (it checks defaultPrevented); stopPropagation
              // keeps card-level handlers quiet.
              e.preventDefault();
              e.stopPropagation();
              setIsOpen((o) => !o);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsOpen((o) => !o);
              }
            }}
          >
            {trigger}
          </span>
        ) : (
          <button
            type="button"
            data-cms-ui
            className={cn(
              "flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow-sm hover:bg-muted/50",
              className,
            )}
          >
            {triggerPreview}
            <span className="text-muted-foreground">
              {value ? (isUrl(value) ? "custom" : value) : "Pick icon"}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-2"
        data-cms-ui
        // The panel is portaled out of the DOM tree, but React synthetic
        // events still bubble through the COMPONENT tree — when the picker
        // sits inside a Next <Link> (buttons, cards, logo), a pick click
        // would reach Link's onClick and router.push. Stop it at the panel.
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Input
          placeholder="Search icons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm"
        />

        {!search && (
          <>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Suggested for this page
            </div>
            <div className="mt-1 grid grid-cols-8 gap-1">
              {suggestions.map((iconName) => {
                const IconComponent = ALL_ICONS[iconName];
                return (
                  <button
                    type="button"
                    key={`s-${iconName}`}
                    title={iconName}
                    onClick={() => {
                      onChange(iconName, color);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md transition hover:bg-muted",
                      value === iconName && "bg-muted ring-1 ring-ring",
                    )}
                  >
                    <IconComponent className="h-4 w-4" style={{ color }} />
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              All icons
            </div>
          </>
        )}

        <div className="mt-1 grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
          {filtered.slice(0, 180).map((iconName) => {
            const IconComponent = ALL_ICONS[iconName];
            return (
              <button
                type="button"
                key={iconName}
                title={iconName}
                onClick={() => {
                  onChange(iconName, color);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md transition hover:bg-muted",
                  value === iconName && "bg-muted ring-1 ring-ring",
                )}
              >
                <IconComponent className="h-4 w-4" style={{ color }} />
              </button>
            );
          })}
        </div>

        {(allowText || allowUpload) && <div className="my-2 border-t" />}

        {allowText && (
          <div className="flex items-center gap-2">
            <span className="w-14 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Text
            </span>
            <Input
              placeholder='Badge text (e.g. "01", "IN")'
              defaultValue={
                value && !ALL_ICONS[value] && !isUrl(value) ? value : ""
              }
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onChange((e.target as HTMLInputElement).value, color);
                  setIsOpen(false);
                }
              }}
            />
          </div>
        )}

        {allowUpload && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-14 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Custom
            </span>
            <button
              type="button"
              className="flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-dashed text-xs font-semibold text-muted-foreground hover:bg-muted/50"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload SVG / image icon"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/svg+xml,image/png,image/webp,image/jpeg"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const url = await uploadAsset(file);
                  onChange(url, color);
                  setIsOpen(false);
                } catch (error) {
                  const { toast } = await import("sonner");
                  toast.error("Icon upload failed", {
                    description: (error as Error).message,
                  });
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </div>
        )}

        {showColor && onColorChange && (
          <>
            <div className="my-2 border-t" />
            <div className="flex items-center gap-2">
              <span className="w-14 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Color
              </span>
              <input
                aria-label="Icon color"
                type="color"
                value={normalizeHex(color)}
                onChange={(e) => onColorChange(normalizeHex(e.target.value))}
                className="h-7 w-7 cursor-pointer rounded border"
              />
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    title={preset}
                    onClick={() => onColorChange(preset)}
                    className="h-5 w-5 rounded-full border"
                    style={{ backgroundColor: preset }}
                    aria-label={`Icon color ${preset}`}
                  />
                ))}
              </div>
              <button
                type="button"
                title="Inherit the button text color"
                onClick={() => onColorChange(null)}
                className="ml-auto rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted"
              >
                Auto
              </button>
            </div>
          </>
        )}

        {onBgColorChange && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-14 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Bg
            </span>
            <input
              aria-label="Icon background color"
              type="color"
              value={normalizeHex(bgColor ?? "")}
              onChange={(e) => onBgColorChange(normalizeHex(e.target.value))}
              className="h-7 w-7 cursor-pointer rounded border"
            />
            <div className="flex flex-wrap gap-1">
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  title={preset}
                  onClick={() => onBgColorChange(preset)}
                  className={cn(
                    "h-5 w-5 rounded-full border",
                    bgColor === preset && "ring-2 ring-ring ring-offset-1",
                  )}
                  style={{ backgroundColor: preset }}
                  aria-label={`Background ${preset}`}
                />
              ))}
            </div>
            <button
              type="button"
              title="No chip behind the icon"
              onClick={() => onBgColorChange(null)}
              className="ml-auto rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              None
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
