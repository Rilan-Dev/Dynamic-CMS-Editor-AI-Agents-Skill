"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarCheck,
  Clock,
  Compass,
  Eye,
  EyeOff,
  MapPin,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { E } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { factRows, type FactKey } from "./projectDetail";
import type { ProjectFacts as Facts } from "./projectModel";

const ICONS: Record<FactKey, LucideIcon> = {
  client: Building2,
  consultant: Compass,
  value: Banknote,
  location: MapPin,
  area: Ruler,
  duration: Clock,
  completedOn: CalendarCheck,
  projectStatus: BadgeCheck,
};

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** Labels belong to the projects index, not to this project. */
const INDEX = "doc:projects" as const;

/**
 * The at-a-glance card a tender reviewer scans first. Rows with nothing to
 * say are dropped for visitors, so a sparse project still reads as a tidy
 * card rather than a form with blanks. The contract value is a commercial
 * credential: hidden unless an editor deliberately shows it.
 */
export function ProjectFacts({
  facts,
  labels,
  enquireHref,
}: {
  facts: Facts;
  labels: JsonObject;
  enquireHref: string;
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const rows = factRows(facts, labels, editActive);
  const enquireLabel = text(labels.enquireLabel) || "Discuss a Similar Project";

  if (!rows.length && !editActive) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-brand-soft px-6 py-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
          <E
            scope={INDEX}
            path={["detail", "factsTitle"]}
            value={text(labels.factsTitle) || "Project Facts"}
            as="span"
          />
        </h2>
      </div>

      <dl className="divide-y divide-border px-6">
        {rows.map((row) => {
          const Icon = ICONS[row.key];
          return (
            <div key={row.key} className="flex items-start gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <E scope={INDEX} path={["detail", row.labelField]} value={row.label} as="span" />
                </dt>
                <dd className="mt-1 break-words text-base font-semibold leading-snug text-foreground">
                  <E path={["facts", row.key]} value={row.value} as="span" />
                </dd>
                {row.key === "value" && editActive && (
                  <button
                    type="button"
                    data-cms-ui
                    onClick={() => setPath(["facts", "valueVisible"], !facts.valueVisible)}
                    aria-pressed={facts.valueVisible}
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                      facts.valueVisible
                        ? "bg-brand-soft text-brand-strong hover:bg-brand-soft-strong"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {facts.valueVisible ? (
                      <Eye size={13} aria-hidden="true" />
                    ) : (
                      <EyeOff size={13} aria-hidden="true" />
                    )}
                    {facts.valueVisible
                      ? "Shown to visitors — click to hide"
                      : "Hidden from visitors — click to show"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </dl>

      <div className="border-t border-border p-6">
        <Link
          href={enquireHref}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-contrast transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <E scope={INDEX} path={["detail", "enquireLabel"]} value={enquireLabel} as="span" />
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>
  );
}
