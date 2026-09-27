"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageOff, Upload } from "lucide-react";
import { uploadAsset } from "./uploadAsset";

/**
 * Asset URL field with live preview (adapted from EquiTenant's
 * AssetField). This project's content documents reference assets by
 * URL (`{src, fallback, alt}`), so the field edits a URL string and
 * previews it. Uploads use the same authenticated /api/assets endpoint
 * as the inline image and icon editors.
 */

export function AssetField({
  label,
  value,
  onChange,
  kind = "image",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  kind?: "image" | "video";
  placeholder?: string;
}) {
  const [broken, setBroken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          placeholder={placeholder ?? `${kind} URL`}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={`Upload ${kind}`}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={
            kind === "video"
              ? "video/mp4,video/webm,.mp4,.webm"
              : "image/*,.svg,.gif"
          }
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const url = await uploadAsset(file);
              setBroken(false);
              onChange(url);
              const { toast } = await import("sonner");
              toast.success("Upload complete");
            } catch (error) {
              const { toast } = await import("sonner");
              toast.error("Upload failed", {
                description: (error as Error).message,
              });
            } finally {
              setUploading(false);
              event.target.value = "";
            }
          }}
        />
      </div>
      {kind === "image" && value && (
        <div className="overflow-hidden rounded-md border bg-muted/30">
          {broken ? (
            <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted-foreground">
              <ImageOff className="h-4 w-4" /> Preview unavailable
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-28 w-full object-cover"
              onError={() => setBroken(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
