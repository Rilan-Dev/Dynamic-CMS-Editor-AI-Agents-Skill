"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Add/rename-field dialog — replaces the blocking `window.prompt`
 * flows from the original DynamicFieldEditor (enhancement per
 * ARCHITECTURE.md §4.1).
 */

export type ValueKind = "string" | "number" | "boolean" | "object" | "array";
export const VALUE_KINDS: ValueKind[] = ["string", "number", "boolean", "object", "array"];

export interface FieldDialogRequest {
  mode: "add" | "rename";
  title: string;
  /** current key (rename) or suggested key (add) */
  initialKey?: string;
  /** show the type selector (add only) */
  withKind?: boolean;
  /** keys that already exist at this level (validated against) */
  existingKeys?: string[];
  onSubmit: (key: string, kind: ValueKind) => void;
}

export function FieldDialog({
  request,
  onClose,
}: {
  request: FieldDialogRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;

  const formKey = [
    request.mode,
    request.title,
    request.initialKey ?? "",
    request.withKind ? "kind" : "plain",
  ].join(":");

  return <FieldDialogForm key={formKey} request={request} onClose={onClose} />;
}

function FieldDialogForm({
  request,
  onClose,
}: {
  request: FieldDialogRequest;
  onClose: () => void;
}) {
  const [key, setKey] = useState(request.initialKey ?? "");
  const [kind, setKind] = useState<ValueKind>("string");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Field name is required");
      return;
    }
    if (
      request.existingKeys?.includes(trimmed) &&
      trimmed !== request.initialKey
    ) {
      setError(`"${trimmed}" already exists`);
      return;
    }
    request.onSubmit(trimmed, kind);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm" onKeyDown={(e) => e.key === "Enter" && submit()}>
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>
            {request.mode === "add"
              ? "Name the new field and choose its type."
              : "Enter the new name for this field."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field-key">Field name</Label>
            <Input
              id="field-key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError(null);
              }}
              autoFocus
            />
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          </div>
          {request.withKind && (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ValueKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{request.mode === "add" ? "Add field" : "Rename"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function createValueForKind(kind: ValueKind) {
  switch (kind) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "object":
      return {};
    case "array":
      return [];
    default:
      return "";
  }
}
