"use client";

/**
 * JSON-path content editor (port of EquiTenant DynamicFieldEditor with
 * the ARCHITECTURE.md §4 enhancements):
 *  - add/rename field via shadcn Dialog instead of window.prompt
 *  - drag-to-reorder array items (dnd-kit)
 *  - asset URL fields inferred by key name → AssetField with preview
 *  - `{name, color}` objects → icon picker
 */

import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronUp, Copy, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AssetField } from "./AssetField";
import { IconSelector } from "./IconSelector";
import { SectionEditor } from "./SectionEditor";
import { FieldDialog, createValueForKind, type FieldDialogRequest } from "./FieldDialog";
import { cn } from "@/lib/cn";
import type { JsonArray, JsonObject, JsonValue, PathSegment } from "./json";

type FieldChangeHandler = (path: PathSegment[], value: JsonValue) => void;
type FieldGetter = (path: PathSegment[]) => JsonValue | undefined;
type DialogRequester = (req: FieldDialogRequest) => void;

const capitalize = (label: string) =>
  label.length ? label.charAt(0).toUpperCase() + label.slice(1) : label;

const inferAssetKind = (
  label: string,
  path: PathSegment[],
  getValue: FieldGetter
): "image" | "video" | null => {
  const key = label.toLowerCase();
  if (key.includes("video")) return "video";
  if (key.includes("image") || key.includes("thumbnail") || key.includes("logo")) return "image";
  if (key === "src" || key === "url" || key === "fallback") {
    const siblingType = getValue([...path.slice(0, -1), "type"]);
    if (typeof siblingType === "string") {
      if (siblingType === "video") return "video";
      if (siblingType === "image") return "image";
    }
    const parentKey =
      path.length > 1 && typeof path[path.length - 2] === "string"
        ? String(path[path.length - 2]).toLowerCase()
        : "";
    if (parentKey.includes("video") || parentKey.includes("media")) return "video";
    return "image";
  }
  return null;
};

const createDefaultValue = (sample: JsonValue | undefined): JsonValue => {
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === "object") {
    const result: JsonObject = {};
    Object.entries(sample).forEach(([k, v]) => {
      if (/^\d+$/.test(k)) return;
      result[k] = createDefaultValue(v as JsonValue);
    });
    return result;
  }
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  return "";
};

const formatArrayItemLabel = (value: JsonValue, index: number) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["title", "label", "name", "heading"]) {
      const v = (value as JsonObject)[key];
      if (typeof v === "string" && v) return v;
    }
  }
  if (typeof value === "string" && value) return value.slice(0, 40);
  return `Item ${index + 1}`;
};

const removeNumericLeakage = (entries: [string, JsonValue][]) => {
  const numericOnly = entries.every(([key]) => /^\d+$/.test(key));
  if (numericOnly) return entries;
  return entries.filter(([key]) => !/^\d+$/.test(key));
};

interface FieldProps {
  label: string;
  path: PathSegment[];
  value: JsonValue;
  onChange: FieldChangeHandler;
  onRemove?: () => void;
  getValue: FieldGetter;
  requestDialog: DialogRequester;
  depth: number;
}

function RemoveButton({ onRemove, what }: { onRemove?: () => void; what: string }) {
  if (!onRemove) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onRemove}
      aria-label={`Remove ${what}`}
      className="h-7 w-7 text-muted-foreground hover:text-red-600"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function BooleanField({ label, value, onChange, path, onRemove }: FieldProps) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
      <div className="flex flex-col">
        <Label className="text-sm font-medium">{capitalize(label)}</Label>
        <span className="text-xs text-muted-foreground">{value ? "Enabled" : "Disabled"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(path, checked)} />
        <RemoveButton onRemove={onRemove} what={label} />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, path, onRemove }: FieldProps) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length
        ? Number(value)
        : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>{capitalize(label)}</Label>
        <RemoveButton onRemove={onRemove} what={label} />
      </div>
      <Input
        type="number"
        value={Number.isFinite(numericValue) ? numericValue : 0}
        onChange={(e) => onChange(path, Number(e.target.value))}
      />
    </div>
  );
}

function StringField({ label, value, onChange, path, getValue, onRemove }: FieldProps) {
  const stringValue =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? ""
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
  const isLong = stringValue.length > 120 || stringValue.includes("\n");

  const assetKind = inferAssetKind(label, path, getValue);
  if (assetKind) {
    return (
      <AssetField
        label={capitalize(label)}
        value={stringValue}
        onChange={(next) => onChange(path, next)}
        kind={assetKind}
      />
    );
  }

  const lowerLabel = label.toLowerCase();
  if (lowerLabel === "icon" || lowerLabel.endsWith("icon") || lowerLabel === "badge") {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>{capitalize(label)}</Label>
          <RemoveButton onRemove={onRemove} what={label} />
        </div>
        <div className="flex items-center gap-2">
          <IconSelector
            value={stringValue}
            onChange={(nextName) => onChange(path, nextName)}
            showColor={false}
            allowUpload
            allowText
          />
          <Input
            value={stringValue}
            onChange={(e) => onChange(path, e.target.value)}
            placeholder="Icon name or text badge"
            className="flex-1"
          />
        </div>
      </div>
    );
  }

  const InputComponent = isLong ? Textarea : Input;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>{capitalize(label)}</Label>
        <RemoveButton onRemove={onRemove} what={label} />
      </div>
      <InputComponent value={stringValue} onChange={(e) => onChange(path, e.target.value)} />
    </div>
  );
}

function IconField({ label, value, onChange, path, onRemove }: FieldProps) {
  const iconValue =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonObject)
      : ({} as JsonObject);
  return (
    <div className="space-y-2 rounded-md border bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{capitalize(label)} (icon)</Label>
        <RemoveButton onRemove={onRemove} what={label} />
      </div>
      <IconSelector
        value={typeof iconValue.name === "string" ? iconValue.name : ""}
        color={typeof iconValue.color === "string" ? iconValue.color : "#0b8a4e"}
        onChange={(name, color) => onChange(path, { ...iconValue, name, color })}
        onColorChange={(color) => onChange(path, { ...iconValue, color })}
        allowUpload
      />
    </div>
  );
}

function ObjectField(props: FieldProps) {
  const { label, value, path, onChange, onRemove, requestDialog, depth } = props;
  const objectValue =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonObject)
      : ({} as JsonObject);
  const entries = removeNumericLeakage(Object.entries(objectValue));
  const [open, setOpen] = useState(depth < 2);

  const isIconObject =
    ("name" in objectValue || "color" in objectValue) &&
    Object.keys(objectValue).every((k) => ["name", "color"].includes(k));
  if (isIconObject) return <IconField {...props} />;

  const handleAddField = () =>
    requestDialog({
      mode: "add",
      title: `Add field to ${capitalize(label)}`,
      withKind: true,
      existingKeys: Object.keys(objectValue),
      onSubmit: (key, kind) =>
        onChange(path, { ...objectValue, [key]: createValueForKind(kind) }),
    });

  const handleRemoveField = (key: string) => {
    const next: JsonObject = { ...objectValue };
    delete next[key];
    onChange(path, next);
  };

  return (
    <Card className="space-y-3 py-0 gap-0">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <div className="text-sm font-medium">{capitalize(label)}</div>
          <div className="text-xs text-muted-foreground">
            Object • {entries.length} field{entries.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add field
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle collapse"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <RemoveButton onRemove={onRemove} what={label} />
        </div>
      </div>
      <div className={cn("space-y-4 px-4 pb-4 pt-2", !open && "hidden")}>
        {entries.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No fields yet. Use &quot;Add field&quot; to define keys.
          </div>
        )}
        {entries.map(([childKey, childValue]) => (
          <FieldRenderer
            key={childKey}
            {...props}
            label={childKey}
            value={childValue}
            path={[...path, childKey]}
            onRemove={() => handleRemoveField(childKey)}
            depth={depth + 1}
          />
        ))}
      </div>
    </Card>
  );
}

/* ---------- sortable array items (dnd-kit enhancement) ---------- */

function SortableItem({
  id,
  children,
  depth,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
  depth: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const handle = (
    <button
      type="button"
      className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "z-10 opacity-80", depth > 0 && "bg-muted/10")}
    >
      {children(handle)}
    </div>
  );
}

function ArrayField(props: FieldProps) {
  const { label, value, path, onChange, onRemove, requestDialog, depth } = props;
  const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // stable-enough ids for the current render pass
  const ids = items.map((_, i) => `item-${i}`);

  const template = items.find((item) => item !== undefined);
  const addItem = () => {
    if (template !== undefined) {
      onChange(path, [...items, createDefaultValue(template)] as JsonArray);
      return;
    }
    requestDialog({
      mode: "add",
      title: `First item in ${capitalize(label)}`,
      initialKey: "item",
      withKind: true,
      onSubmit: (_key, kind) => onChange(path, [...items, createValueForKind(kind)] as JsonArray),
    });
  };

  const duplicateItem = (index: number) => {
    const item = items[index];
    const copy =
      item && typeof item === "object" ? (JSON.parse(JSON.stringify(item)) as JsonValue) : item;
    onChange(path, [...items.slice(0, index + 1), copy, ...items.slice(index + 1)] as JsonArray);
  };

  const removeItem = (index: number) => {
    onChange(path, items.filter((_, i) => i !== index) as JsonArray);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(path, arrayMove([...items], from, to) as JsonArray);
  };

  return (
    <Card className="space-y-3 py-0 gap-0">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <div className="text-sm font-medium">{capitalize(label)}</div>
          <div className="text-xs text-muted-foreground">
            Array • {items.length} item{items.length === 1 ? "" : "s"} · drag to reorder
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add item
          </Button>
          <RemoveButton onRemove={onRemove} what={label} />
        </div>
      </div>
      <div className="space-y-3 px-4 pb-4 pt-2">
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No items yet. Use &quot;Add item&quot; to get started.
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => (
              <SortableItem key={ids[index]} id={ids[index]} depth={depth}>
                {(dragHandle) => (
                  <Card className="space-y-3 p-4 gap-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {dragHandle}
                        <div className="text-sm font-medium">
                          {formatArrayItemLabel(item, index)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => duplicateItem(index)}
                          aria-label="Duplicate item"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => removeItem(index)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <FieldRenderer
                      {...props}
                      label={formatArrayItemLabel(item, index)}
                      value={item}
                      path={[...path, index]}
                      onRemove={undefined}
                      depth={depth + 1}
                    />
                  </Card>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </Card>
  );
}

function FieldRenderer(props: FieldProps) {
  const { value } = props;
  if (Array.isArray(value)) return <ArrayField {...props} />;
  if (value === null || value === undefined) return <StringField {...props} value={""} />;
  switch (typeof value) {
    case "boolean":
      return <BooleanField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "string":
      return <StringField {...props} />;
    case "object":
      return <ObjectField {...props} />;
    default:
      return <StringField {...props} value={String(value)} />;
  }
}

/* ---------- root editor ---------- */

export function DynamicContentEditor({
  value,
  onChange,
  onPathChange,
  title = "Content",
  description,
}: {
  value: JsonObject;
  onChange: (next: JsonObject) => void;
  onPathChange: FieldChangeHandler;
  title?: string;
  description?: string;
}) {
  const [dialog, setDialog] = useState<FieldDialogRequest | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getValue = useMemo<FieldGetter>(() => {
    return (path) =>
      path.reduce<JsonValue | undefined>((acc, segment) => {
        if (acc === null || acc === undefined) return undefined;
        if (Array.isArray(acc) && typeof segment === "number") return acc[segment];
        if (typeof acc === "object" && !Array.isArray(acc)) return (acc as JsonObject)[String(segment)];
        return undefined;
      }, value);
  }, [value]);

  const entries = Object.entries(value);

  const handleRemoveRootKey = (key: string) => {
    const next: JsonObject = { ...value };
    delete next[key];
    onChange(next);
  };

  const handleAddRootKey = () =>
    setDialog({
      mode: "add",
      title: "Add section",
      withKind: true,
      existingKeys: Object.keys(value),
      onSubmit: (key, kind) => onChange({ ...value, [key]: createValueForKind(kind) }),
    });

  const handleRenameRootKey = (key: string) =>
    setDialog({
      mode: "rename",
      title: `Rename "${key}"`,
      initialKey: key,
      existingKeys: Object.keys(value),
      onSubmit: (renamed) => {
        if (renamed === key) return;
        const next: JsonObject = {};
        // preserve key order while renaming in place
        Object.entries(value).forEach(([k, v]) => {
          next[k === key ? renamed : k] = v;
        });
        onChange(next);
      },
    });

  const handleAddItemToArray = (key: string, current: JsonValue) => {
    const items = Array.isArray(current) ? current : [];
    const template = items.find((item) => item !== undefined);
    if (template !== undefined) {
      onPathChange([key], [...items, createDefaultValue(template)] as JsonArray);
      return;
    }
    setDialog({
      mode: "add",
      title: `First item in ${capitalize(key)}`,
      initialKey: "item",
      withKind: true,
      onSubmit: (_k, kind) => onPathChange([key], [...items, createValueForKind(kind)] as JsonArray),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRootKey}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add section
        </Button>
      </div>

      {entries.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No fields yet. Use &quot;Add section&quot; to define the page structure.
        </div>
      )}

      <div className="space-y-4">
        {entries.map(([key, fieldValue]) => (
          <SectionEditor
            key={key}
            title={capitalize(key)}
            isEditing
            defaultOpen={false}
            onAdd={
              Array.isArray(fieldValue) ? () => handleAddItemToArray(key, fieldValue) : undefined
            }
            onDelete={() => setConfirmDelete(key)}
            actions={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                onClick={() => handleRenameRootKey(key)}
                aria-label={`Rename ${key}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          >
            <FieldRenderer
              label={key}
              value={fieldValue}
              path={[key]}
              onChange={onPathChange}
              onRemove={() => setConfirmDelete(key)}
              getValue={getValue}
              requestDialog={setDialog}
              depth={0}
            />
          </SectionEditor>
        ))}
      </div>

      <FieldDialog request={dialog} onClose={() => setDialog(null)} />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirmDelete}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the whole section from the draft. You can still discard the draft to
              undo before publishing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmDelete) handleRemoveRootKey(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
