"use client";

import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSafeCmsUrl } from "./documentValidation";

export function LinkField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = isSafeCmsUrl(value);
  const previewable =
    valid &&
    !!value.trim() &&
    !value.startsWith("#") &&
    !value.startsWith("javascript:");

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={!valid}
          placeholder="/page, https://…, mailto:…, or tel:…"
          className={!valid ? "border-red-500 focus-visible:ring-red-500" : undefined}
        />
        {previewable && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Open ${label}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      {!valid && (
        <p className="text-xs font-medium text-red-600">
          Use a relative path, http(s), mailto, tel, or hash link. Publishing is
          blocked until this value is fixed.
        </p>
      )}
    </div>
  );
}
