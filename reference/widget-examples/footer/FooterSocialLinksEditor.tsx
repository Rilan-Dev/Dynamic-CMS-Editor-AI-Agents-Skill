"use client";

import { useEffect, useMemo, useState } from "react";
import { InlineAddIcon } from "@/components/cms/InlineAddIcon";
import {
  createCmsItemId,
  InlineListControls,
  moveListItem,
} from "@/components/cms/InlineListControls";
import { useCmsEditing } from "@/components/cms/store";
import styles from "./FooterInlineCms.module.css";
import { SocialPlatformIcon } from "./SocialPlatformIcon";
import {
  SOCIAL_PLATFORM_META,
  availableSocialPlatforms,
  isSocialPlatform,
  validateSocialHref,
  type SocialPlatform,
  type StoredFooterSocialLink,
} from "./socialLinks";

interface FooterSocialLinksEditorProps {
  entries: StoredFooterSocialLink[];
  onChange: (next: StoredFooterSocialLink[]) => void;
}

function SupportedSocialItem({
  entry,
  index,
  count,
  duplicate,
  onReplace,
  onMove,
  onRemove,
}: {
  entry: StoredFooterSocialLink & { platform: SocialPlatform };
  index: number;
  count: number;
  duplicate: boolean;
  onReplace: (
    index: number,
    patch: Partial<StoredFooterSocialLink>,
  ) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}) {
  const meta = SOCIAL_PLATFORM_META[entry.platform];
  const [href, setHref] = useState(entry.href);
  const [error, setError] = useState("");
  const inputId = `footer-social-${index}-${entry.platform}`;

  useEffect(() => {
    setHref(entry.href);
    setError("");
  }, [entry.href]);

  const saveHref = (): boolean => {
    const trimmed = href.trim();
    if (!trimmed && !entry.enabled) {
      setError("");
      return true;
    }

    const result = validateSocialHref(entry.platform, trimmed);
    if (!result.valid) {
      setError(result.message);
      return false;
    }

    setError("");
    if (trimmed !== entry.href) onReplace(index, { href: trimmed });
    return true;
  };

  const toggleEnabled = () => {
    if (entry.enabled) {
      onReplace(index, { enabled: false });
      return;
    }

    const trimmed = href.trim();
    const result = validateSocialHref(entry.platform, trimmed);
    if (!result.valid) {
      setError(result.message);
      return;
    }

    setError("");
    onReplace(index, { href: trimmed, enabled: true });
  };

  return (
    <div
      className={`cms-footer-social-card ${
        entry.enabled ? "" : "cms-footer-social-card--disabled"
      } ${duplicate || error ? "cms-footer-social-card--error" : ""}`}
      data-cms-ui
    >
      <div className="cms-footer-social-card-head">
        <span className="cms-footer-social-brand" aria-hidden="true">
          <SocialPlatformIcon
            platform={entry.platform}
            className="h-5 w-5"
          />
        </span>
        <label htmlFor={inputId} className="cms-footer-social-label">
          {meta.label}
        </label>
        <InlineListControls
          label={meta.label}
          index={index}
          count={count}
          visible={entry.enabled}
          axis="horizontal"
          placement="inline"
          showPosition={false}
          onMove={(to) => onMove(index, to)}
          onToggleVisibility={toggleEnabled}
          onRemove={() => onRemove(index)}
        />
      </div>

      <input
        id={inputId}
        className="cms-footer-inline-input"
        value={href}
        placeholder={meta.placeholder}
        aria-invalid={duplicate || !!error}
        aria-describedby={duplicate || error ? `${inputId}-error` : undefined}
        onChange={(event) => {
          setHref(event.currentTarget.value);
          if (error) setError("");
        }}
        onBlur={saveHref}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />

      {(duplicate || error) && (
        <p id={`${inputId}-error`} className="cms-footer-inline-error">
          {duplicate
            ? `${meta.label} is configured more than once. Remove the duplicate before publishing.`
            : error}
        </p>
      )}
    </div>
  );
}

export function FooterSocialLinksEditor({
  entries,
  onChange,
}: FooterSocialLinksEditorProps) {
  const { editing, ready } = useCmsEditing();
  const [addOpen, setAddOpen] = useState(false);
  const available = availableSocialPlatforms(entries);
  const platformCounts = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      counts.set(entry.platform, (counts.get(entry.platform) ?? 0) + 1);
    });
    return counts;
  }, [entries]);

  useEffect(() => {
    if (available.length === 0) setAddOpen(false);
  }, [available.length]);

  if (!editing || !ready) return null;

  const replaceAt = (
    index: number,
    patch: Partial<StoredFooterSocialLink>,
  ) =>
    onChange(
      entries.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, ...patch } : entry,
      ),
    );

  const move = (from: number, to: number) =>
    onChange(moveListItem(entries, from, to));

  const removeAt = (index: number) =>
    onChange(entries.filter((_, itemIndex) => itemIndex !== index));

  const add = (platform: SocialPlatform) => {
    onChange([
      ...entries,
      {
        id: createCmsItemId(`social-${platform}`),
        platform,
        href: "",
        enabled: false,
      },
    ]);
    setAddOpen(false);
  };

  return (
    <div
      className={`${styles.scope} ${styles.socialScope} cms-footer-inline-editor`}
      data-cms-ui
    >
      <div className="cms-footer-social-grid">
        {entries.map((entry, index) => {
          if (!isSocialPlatform(entry.platform)) {
            return (
              <div
                key={`${index}:${entry.id}`}
                className="cms-footer-social-card cms-footer-social-card--error"
              >
                <div className="cms-footer-social-card-head">
                  <span className="cms-footer-social-label">
                    Unsupported platform
                  </span>
                  <InlineListControls
                    label="unsupported social platform"
                    index={index}
                    count={entries.length}
                    axis="horizontal"
                    placement="inline"
                    showPosition={false}
                    onMove={(to) => move(index, to)}
                    onRemove={() => removeAt(index)}
                  />
                </div>
                <p className="cms-footer-inline-error">
                  “{entry.platform || "unknown"}” is not supported. Remove
                  this row before publishing.
                </p>
              </div>
            );
          }

          return (
            <SupportedSocialItem
              key={`${index}:${entry.id}`}
              entry={{ ...entry, platform: entry.platform }}
              index={index}
              count={entries.length}
              duplicate={(platformCounts.get(entry.platform) ?? 0) > 1}
              onReplace={replaceAt}
              onMove={move}
              onRemove={removeAt}
            />
          );
        })}
      </div>

      <div className="cms-footer-inline-add-row">
        <InlineAddIcon
          onAdd={() => setAddOpen((open) => !open)}
          label={
            available.length
              ? "Add social platform"
              : "All supported platforms are configured"
          }
          disabled={available.length === 0}
          expanded={addOpen}
          controls="cms-footer-social-add-tray"
        />
      </div>

      {addOpen && available.length > 0 && (
        <div
          id="cms-footer-social-add-tray"
          className="cms-footer-inline-tray cms-footer-social-add-tray"
        >
          {available.map((platform) => (
            <button
              key={platform}
              type="button"
              className="cms-footer-platform-chip"
              aria-label={`Add ${SOCIAL_PLATFORM_META[platform].label}`}
              title={`Add ${SOCIAL_PLATFORM_META[platform].label}`}
              onClick={() => add(platform)}
            >
              <SocialPlatformIcon platform={platform} className="h-5 w-5" />
              <span>{SOCIAL_PLATFORM_META[platform].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
