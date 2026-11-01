"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { InlineAddIcon } from "@/components/cms/InlineAddIcon";
import {
  InlineListControls,
  moveListItem,
} from "@/components/cms/InlineListControls";
import { ReadOnlyIcon } from "@/components/cms/ReadOnlyIcon";
import { useCmsEditing } from "@/components/cms/store";
import {
  MAX_FOOTER_SERVICES,
  resolveSelectedServices,
  type ResolvedFooterService,
  type ServiceCatalogItem,
} from "@/components/services/serviceCatalog";
import styles from "./FooterInlineCms.module.css";

interface FooterServicePickerProps {
  catalogue: ServiceCatalogItem[];
  selectedIds: unknown[];
  onChange: (next: unknown[]) => void;
}

function storedReferenceLabel(value: unknown): string {
  let rendered: string;
  if (typeof value === "string") {
    rendered = value || "empty string";
  } else {
    try {
      rendered = JSON.stringify(value) || String(value);
    } catch {
      rendered = String(value);
    }
  }
  return rendered.length > 90 ? `${rendered.slice(0, 87)}…` : rendered;
}

function SelectedServiceRow({
  item,
  index,
  count,
  duplicate,
  onMove,
  onRemove,
}: {
  item: ResolvedFooterService;
  index: number;
  count: number;
  duplicate: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const available = item.available && !!item.service && !duplicate;
  const title =
    item.available && item.service
      ? item.service.title
      : "Service unavailable";
  const detail = duplicate
    ? "This service is selected more than once. Remove one duplicate before publishing."
    : item.available
      ? `Footer position ${index + 1}`
      : item.validId
        ? `Reference: ${item.service?.title ?? item.id}. Remove or replace it before publishing.`
        : `Invalid stored value: ${storedReferenceLabel(item.rawValue)}.`;

  return (
    <li
      className={`cms-footer-service-row ${
        available ? "" : "cms-footer-service-row--error"
      }`}
      data-cms-ui
    >
      <ReadOnlyIcon
        value={item.service?.icon}
        fallback="Wrench"
        className="h-5 w-5 shrink-0 object-contain"
      />
      <span className="cms-footer-service-copy">
        <span className="cms-footer-service-title">{title}</span>
        <span className="cms-footer-service-detail">{detail}</span>
      </span>
      <InlineListControls
        label={title}
        index={index}
        count={count}
        axis="vertical"
        placement="inline"
        showPosition={false}
        onMove={onMove}
        onRemove={onRemove}
      />
    </li>
  );
}

export function FooterServicePicker({
  catalogue,
  selectedIds,
  onChange,
}: FooterServicePickerProps) {
  const { editing, ready } = useCmsEditing();
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => resolveSelectedServices(selectedIds, catalogue),
    [selectedIds, catalogue],
  );
  const selectedSet = useMemo(
    () =>
      new Set(
        selectedIds.filter(
          (value): value is string =>
            typeof value === "string" && !!value.trim(),
        ),
      ),
    [selectedIds],
  );
  const duplicateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    selectedIds.forEach((value) => {
      if (typeof value !== "string" || !value.trim()) return;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
    return counts;
  }, [selectedIds]);
  const unselectedServices = useMemo(
    () =>
      catalogue.filter(
        (service) => service.visible && !selectedSet.has(service.id),
      ),
    [catalogue, selectedSet],
  );
  const needle = query.trim().toLowerCase();
  const filteredServices = useMemo(
    () =>
      unselectedServices.filter(
        (service) =>
          !needle || service.title.toLowerCase().includes(needle),
      ),
    [needle, unselectedServices],
  );
  const atLimit = selectedIds.length >= MAX_FOOTER_SERVICES;

  useEffect(() => {
    if (atLimit || unselectedServices.length === 0) setAddOpen(false);
  }, [atLimit, unselectedServices.length]);

  if (!editing || !ready) return null;

  const move = (from: number, to: number) =>
    onChange(moveListItem(selectedIds, from, to));

  const removeAt = (index: number) =>
    onChange(selectedIds.filter((_, itemIndex) => itemIndex !== index));

  const addService = (serviceId: string) => {
    onChange([...selectedIds, serviceId]);
    setQuery("");
    setAddOpen(false);
  };

  const addDisabled = atLimit || unselectedServices.length === 0;
  const addLabel = atLimit
    ? "Seven services are already selected"
    : unselectedServices.length === 0
      ? "No additional services are available"
      : "Add existing service";

  return (
    <div
      className={`${styles.scope} ${styles.serviceScope} cms-footer-inline-editor`}
      data-cms-ui
    >
      <ul className="cms-footer-service-edit-list">
        {selected.map((item, index) => (
          <SelectedServiceRow
            key={item.selectionKey}
            item={item}
            index={index}
            count={selected.length}
            duplicate={
              item.validId && (duplicateCounts.get(item.id) ?? 0) > 1
            }
            onMove={(to) => move(index, to)}
            onRemove={() => removeAt(index)}
          />
        ))}
      </ul>

      {selected.length === 0 && (
        <p className="cms-footer-inline-empty">
          No footer services are selected.
        </p>
      )}

      <div className="cms-footer-inline-add-row">
        <InlineAddIcon
          onAdd={() => setAddOpen((open) => !open)}
          label={addLabel}
          disabled={addDisabled}
          expanded={addOpen}
          controls="cms-footer-service-add-tray"
        />
        <span className="cms-footer-inline-count" aria-live="polite">
          {selectedIds.length} of {MAX_FOOTER_SERVICES}
        </span>
      </div>

      {addOpen && !atLimit && (
        <div
          id="cms-footer-service-add-tray"
          className="cms-footer-inline-tray cms-footer-service-add-tray"
        >
          <label className="cms-footer-service-search">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Search existing services</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search existing services"
              aria-label="Search existing services"
            />
          </label>

          <div className="cms-footer-service-options">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                type="button"
                className="cms-footer-service-option"
                onClick={() => addService(service.id)}
              >
                <ReadOnlyIcon
                  value={service.icon}
                  fallback="Wrench"
                  className="h-5 w-5 shrink-0 object-contain"
                />
                <span>{service.title}</span>
              </button>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <p className="cms-footer-inline-empty">
              No existing services match this search.
            </p>
          )}
        </div>
      )}

      {atLimit && (
        <p className="cms-footer-inline-limit" role="status">
          Seven services are selected. Remove one before adding another.
        </p>
      )}
    </div>
  );
}
