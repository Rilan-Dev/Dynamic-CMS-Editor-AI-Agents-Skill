"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { JsonObject, JsonValue } from "./json";
import { LinkField } from "./LinkField";
import { setPath } from "./store";

const asObject = (value: JsonValue | undefined): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring";

export function SiteNavigationEditor({ document }: { document: JsonObject }) {
  const navbar = asObject(document.navbar);
  const brand = asObject(navbar.brand);
  const quoteButton = asObject(navbar.quoteButton);
  const links = Array.isArray(navbar.links) ? (navbar.links as JsonObject[]) : [];

  return (
    <div className="mb-6 space-y-5 rounded-xl border bg-muted/10 p-4">
      <div>
        <h3 className="font-semibold">Navigation quick editor</h3>
        <p className="text-sm text-muted-foreground">
          Edit the exact labels and destinations shown in desktop and mobile navigation.
          Use the full Fields tree below to add, remove, duplicate or drag-reorder links.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LinkField
          label="Brand / logo destination"
          value={String(brand.href ?? "/")}
          onChange={(value) => setPath(["navbar", "brand", "href"], value, "site")}
        />
        <div className="space-y-1.5">
          <Label>Phone number</Label>
          <Input
            value={String(navbar.phone ?? "")}
            onChange={(event) =>
              setPath(["navbar", "phone"], event.target.value, "site")
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Quote button label</Label>
          <Input
            value={String(quoteButton.label ?? "")}
            onChange={(event) =>
              setPath(["navbar", "quoteButton", "label"], event.target.value, "site")
            }
          />
        </div>
        <LinkField
          label="Quote button destination"
          value={String(quoteButton.href ?? "/contact")}
          onChange={(value) =>
            setPath(["navbar", "quoteButton", "href"], value, "site")
          }
        />
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={String(link.id ?? index)} className="space-y-3 rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Navigation item {index + 1}</div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Visible
                <Switch
                  checked={link.visible !== false}
                  onCheckedChange={(checked) =>
                    setPath(["navbar", "links", index, "visible"], checked, "site")
                  }
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={String(link.name ?? "")}
                  onChange={(event) =>
                    setPath(["navbar", "links", index, "name"], event.target.value, "site")
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Open link</Label>
                <select
                  className={selectClass}
                  value={String(link.target ?? "_self")}
                  onChange={(event) =>
                    setPath(["navbar", "links", index, "target"], event.target.value, "site")
                  }
                >
                  <option value="_self">Same tab</option>
                  <option value="_blank">New tab</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <LinkField
                  label="Navigation destination"
                  value={String(link.href ?? "/")}
                  onChange={(value) =>
                    setPath(["navbar", "links", index, "href"], value, "site")
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
