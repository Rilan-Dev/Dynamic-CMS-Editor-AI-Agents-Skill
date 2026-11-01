"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Crosshair, ExternalLink, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  cmsPathKey,
  groupIssues,
  issueLocation,
  issueScope,
  removableFooterSelection,
} from "./cmsIssues";
import type { CmsValidationError } from "./documentValidation";
import type { JsonObject } from "./json";
import {
  collectValidationErrors,
  getEditingDoc,
  getPageSlug,
  setPath,
  useCmsDocsVersion,
} from "./store";

/** Scrolls to the editable field an issue is about and highlights it. */
function revealField(error: CmsValidationError): boolean {
  // The exact field first, then the nearest marked ancestor area — e.g. a
  // footer service selection resolves to the footer's service picker.
  let field: HTMLElement | null = null;
  for (let length = error.path.length; length > 0 && !field; length -= 1) {
    const key = cmsPathKey(issueScope(error), error.path.slice(0, length));
    field = document.querySelector<HTMLElement>(`[data-cms-path="${CSS.escape(key)}"]`);
  }
  if (!field) return false;
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  field.focus({ preventScroll: true });
  field.animate(
    [
      { boxShadow: "0 0 0 0 hsl(var(--destructive) / 0.7)" },
      { boxShadow: "0 0 0 8px hsl(var(--destructive) / 0)" },
    ],
    { duration: 900, iterations: 3 },
  );
  return true;
}

/**
 * Everything blocking Publish, in plain words, with where it is and what
 * to do about it. The list is re-checked live as the draft changes, so it
 * shrinks as issues are fixed; publishing is still the final gate.
 */
export function IssuesPanel({
  onClose,
  onOpenFields,
}: {
  onClose: () => void;
  onOpenFields: () => void;
}) {
  const version = useCmsDocsVersion();
  const pageSlug = getPageSlug();
  // `version` changes on every edit, so the list follows the draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const errors = useMemo(() => collectValidationErrors(), [version]);
  const groups = groupIssues(errors, pageSlug);

  const show = (error: CmsValidationError) => {
    if (revealField(error)) return;
    toast("This field isn't shown on this page", {
      description: "Opening the Fields panel, where every value can be edited.",
    });
    onOpenFields();
  };

  const removeFooterSelection = (index: number) => {
    const site = getEditingDoc("site");
    const footer = (site?.footer ?? {}) as JsonObject;
    const selected = Array.isArray(footer.selectedServiceIds) ? footer.selectedServiceIds : [];
    setPath(
      ["footer", "selectedServiceIds"],
      selected.filter((_, position) => position !== index),
      "site",
    );
    toast.success("Removed from the footer's service list");
  };

  return (
    <aside
      data-cms-ui
      aria-label="Publishing issues"
      className="fixed right-3 top-20 z-[1295] flex max-h-[calc(100vh-11rem)] w-[min(26rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover font-sans text-popover-foreground shadow-2xl [&_h2]:font-sans [&_h3]:font-sans"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {errors.length ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-brand" />
            )}
            {errors.length
              ? `${errors.length} issue${errors.length === 1 ? "" : "s"} blocking Publish`
              : "No issues"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {errors.length
              ? "Your draft is saved. Fix these, then press Publish again."
              : "Everything checks out — you can publish."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          onClick={onClose}
          aria-label="Close issues"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <ul className="space-y-2">
              {group.items.map((error, position) => {
                const removable = removableFooterSelection(error);
                return (
                  <li
                    key={`${error.code}-${error.path.join(".")}-${position}`}
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {error.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Where: {issueLocation(error.path)}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 rounded-full px-3 text-xs"
                        onClick={() => show(error)}
                      >
                        <Crosshair className="h-3.5 w-3.5" /> Show me
                      </Button>
                      {removable !== null && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 rounded-full px-3 text-xs"
                          onClick={() => removeFooterSelection(removable)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove from footer
                        </Button>
                      )}
                      {error.code === "unpublished-service-reference" && pageSlug !== "services" && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 rounded-full px-3 text-xs"
                        >
                          <Link href="/services">
                            <ExternalLink className="h-3.5 w-3.5" /> Open Services page
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {!errors.length && (
          <p className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            All issues are resolved.
          </p>
        )}
      </div>
    </aside>
  );
}
