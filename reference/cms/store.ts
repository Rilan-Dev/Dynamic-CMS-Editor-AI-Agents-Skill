"use client";

import { useSyncExternalStore } from "react";
import { CmsService } from "@/lib/services/cms.service";
import { normalizeCmsDocument } from "./documentNormalization";
import {
  CmsDocumentValidationError,
  validateCmsDocuments,
  type CmsValidationError,
} from "./documentValidation";
import {
  getAtPath,
  setAtPath,
  type JsonObject,
  type JsonValue,
  type PathSegment,
} from "./json";

export const SITE_SLUG = "site";
const RELATED_DOCUMENT_SLUGS = ["services"] as const;

const relatedSlugsFor = (pageSlug: string): string[] =>
  RELATED_DOCUMENT_SLUGS.filter((slug) => slug !== pageSlug);

export function slugForPathname(pathname: string): string {
  if (pathname === "/") return "home";
  return pathname.replace(/^\//, "").split("/")[0];
}

export type DocScope = "page" | "site";
export type CmsViewMode = "draft" | "published";

interface CmsState {
  editing: boolean;
  loading: boolean;
  pageSlug: string;
  docs: Record<string, JsonObject | null>;
  publishedDocs: Record<string, JsonObject | null>;
  dirty: Record<string, boolean>;
  epoch: number;
  saving: boolean;
  authError: boolean;
  validationErrors: CmsValidationError[];
  viewMode: CmsViewMode;
}

let state: CmsState = {
  editing: false,
  loading: false,
  pageSlug: "home",
  docs: {},
  publishedDocs: {},
  dirty: {},
  epoch: 0,
  saving: false,
  authError: false,
  validationErrors: [],
  viewMode: "draft",
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function set(partial: Partial<CmsState>) {
  state = { ...state, ...partial };
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): CmsState {
  return state;
}

function slugForScope(scope: DocScope): string {
  return scope === "site" ? SITE_SLUG : state.pageSlug;
}

const draftKey = (slug: string) => `cms:draft:${slug}`;
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function scheduleSave(slug: string, doc: JsonObject) {
  try {
    localStorage.setItem(draftKey(slug), JSON.stringify(doc));
  } catch {
    // Storage may be blocked; server autosave still runs.
  }
  if (saveTimers[slug]) clearTimeout(saveTimers[slug]);
  saveTimers[slug] = setTimeout(async () => {
    set({ saving: true });
    try {
      await CmsService.saveDraft(slug, doc);
      if (state.authError) set({ authError: false });
    } catch (error) {
      if ((error as Error).message === "Unauthorized") set({ authError: true });
    } finally {
      set({ saving: false });
    }
  }, 1200);
}

export async function retrySave(): Promise<void> {
  Object.entries(state.dirty).forEach(([slug, dirty]) => {
    const doc = state.docs[slug];
    if (dirty && doc) scheduleSave(slug, doc);
  });
}

function deepMerge(fallback: JsonValue, stored: JsonValue): JsonValue {
  if (
    fallback === null ||
    stored === null ||
    typeof fallback !== "object" ||
    typeof stored !== "object" ||
    Array.isArray(fallback) ||
    Array.isArray(stored)
  ) {
    return stored;
  }
  const out: JsonObject = { ...(fallback as JsonObject) };
  for (const [key, value] of Object.entries(stored as JsonObject)) {
    const base = (fallback as JsonObject)[key];
    out[key] = base === undefined ? value : deepMerge(base, value);
  }
  return out;
}

async function registryFallback(slug: string): Promise<JsonObject | null> {
  const { CONTENT_REGISTRY } = await import("@/content/registry.extended");
  return (CONTENT_REGISTRY[slug] ?? null) as JsonObject | null;
}

const normalizeWithFallback = (
  slug: string,
  fallback: JsonObject | null,
  doc: JsonObject,
): JsonObject => {
  const merged = fallback ? (deepMerge(fallback, doc) as JsonObject) : doc;
  return normalizeCmsDocument(slug, merged);
};

async function resolveDraft(slug: string): Promise<JsonObject | null> {
  const fallback = await registryFallback(slug);
  try {
    const local = localStorage.getItem(draftKey(slug));
    if (local) {
      return normalizeWithFallback(slug, fallback, JSON.parse(local) as JsonObject);
    }
  } catch {
    // Corrupt or blocked local storage falls through to the server.
  }
  const entry = await CmsService.getEntry(slug).catch(() => null);
  if (entry?.draft) return normalizeWithFallback(slug, fallback, entry.draft);
  if (entry?.published) return normalizeWithFallback(slug, fallback, entry.published);
  return fallback
    ? normalizeCmsDocument(slug, structuredClone(fallback))
    : null;
}

async function resolvePublished(slug: string): Promise<JsonObject | null> {
  const fallback = await registryFallback(slug);
  const entry = await CmsService.getEntry(slug).catch(() => null);
  if (entry?.published) return normalizeWithFallback(slug, fallback, entry.published);
  return fallback
    ? normalizeCmsDocument(slug, structuredClone(fallback))
    : null;
}

export async function loadDraftFor(pageSlug: string): Promise<void> {
  set({ loading: true, pageSlug, validationErrors: [] });
  const [pageDoc, siteDoc, pagePublished, sitePublished] = await Promise.all([
    resolveDraft(pageSlug),
    state.docs[SITE_SLUG]
      ? Promise.resolve(state.docs[SITE_SLUG])
      : resolveDraft(SITE_SLUG),
    resolvePublished(pageSlug),
    state.publishedDocs[SITE_SLUG]
      ? Promise.resolve(state.publishedDocs[SITE_SLUG])
      : resolvePublished(SITE_SLUG),
  ]);

  const relatedEntries = await Promise.all(
    relatedSlugsFor(pageSlug).map(async (relatedSlug) => {
      const [draft, published] = await Promise.all([
        state.docs[relatedSlug]
          ? Promise.resolve(state.docs[relatedSlug])
          : resolveDraft(relatedSlug),
        state.publishedDocs[relatedSlug]
          ? Promise.resolve(state.publishedDocs[relatedSlug])
          : resolvePublished(relatedSlug),
      ]);
      return { slug: relatedSlug, draft, published };
    }),
  );
  const relatedDrafts = Object.fromEntries(
    relatedEntries.map((entry) => [entry.slug, entry.draft]),
  );
  const relatedPublished = Object.fromEntries(
    relatedEntries.map((entry) => [entry.slug, entry.published]),
  );

  set({
    loading: false,
    docs: {
      ...state.docs,
      ...relatedDrafts,
      [pageSlug]: pageDoc,
      [SITE_SLUG]: siteDoc,
    },
    publishedDocs: {
      ...state.publishedDocs,
      ...relatedPublished,
      [pageSlug]: pagePublished,
      [SITE_SLUG]: sitePublished,
    },
    epoch: state.epoch + 1,
  });
  document.body.classList.toggle(
    "cms-editing",
    state.editing && state.viewMode === "draft" && !!pageDoc,
  );
}

export async function startEditing(pageSlug: string): Promise<void> {
  set({ editing: true, viewMode: "draft" });
  await loadDraftFor(pageSlug);
}

export function stopEditing(): void {
  Object.values(saveTimers).forEach(clearTimeout);
  set({
    editing: false,
    docs: {},
    publishedDocs: {},
    dirty: {},
    validationErrors: [],
    viewMode: "draft",
    epoch: state.epoch + 1,
  });
  document.body.classList.remove("cms-editing");
}

export function setCmsViewMode(viewMode: CmsViewMode): void {
  if (!state.editing || state.viewMode === viewMode) return;
  set({ viewMode, epoch: state.epoch + 1 });
  document.body.classList.toggle("cms-editing", viewMode === "draft");
}

export function getCmsViewMode(): CmsViewMode {
  return state.viewMode;
}

export function setPath(
  path: PathSegment[],
  value: JsonValue,
  scope: DocScope = "page",
): void {
  const slug = slugForScope(scope);
  const doc = state.docs[slug];
  if (!doc) return;
  const changed = setAtPath(doc, path, value);
  const next = Array.isArray(value)
    ? normalizeCmsDocument(slug, changed)
    : changed;
  set({
    docs: { ...state.docs, [slug]: next },
    dirty: { ...state.dirty, [slug]: true },
    validationErrors: [],
  });
  scheduleSave(slug, next);
}

export function replaceDoc(next: JsonObject, scope: DocScope = "page"): void {
  const slug = slugForScope(scope);
  const normalized = normalizeCmsDocument(slug, next);
  set({
    docs: { ...state.docs, [slug]: normalized },
    dirty: { ...state.dirty, [slug]: true },
    validationErrors: [],
  });
  scheduleSave(slug, normalized);
}

export function replacePageDoc(next: JsonObject): void {
  replaceDoc(next, "page");
}

export async function publishDraft(): Promise<void> {
  Object.values(saveTimers).forEach(clearTimeout);
  const publishingServices =
    state.pageSlug === "services" || state.dirty.services === true;
  const errors = validateCmsDocuments(
    state.docs[state.pageSlug] ?? null,
    state.docs[SITE_SLUG] ?? null,
    {
      servicesDraft: state.docs.services ?? null,
      servicesPublished: state.publishedDocs.services ?? null,
      publishingServices,
    },
  );
  if (errors.length) {
    set({ validationErrors: errors });
    throw new CmsDocumentValidationError(errors);
  }

  set({ saving: true, validationErrors: [] });
  try {
    const slugs = new Set<string>([state.pageSlug]);
    Object.keys(state.dirty).forEach((slug) => state.dirty[slug] && slugs.add(slug));
    const publishedDocs = { ...state.publishedDocs };
    for (const slug of slugs) {
      const doc = state.docs[slug];
      if (!doc) continue;
      await CmsService.saveDraft(slug, doc);
      await CmsService.publish(slug);
      localStorage.removeItem(draftKey(slug));
      publishedDocs[slug] = structuredClone(doc);
    }
    set({ dirty: {}, publishedDocs });
  } finally {
    set({ saving: false });
  }
}

export async function discardDraft(): Promise<void> {
  Object.values(saveTimers).forEach(clearTimeout);
  const slugs = new Set<string>([state.pageSlug, SITE_SLUG]);
  Object.entries(state.dirty).forEach(([slug, dirty]) => {
    if (dirty) slugs.add(slug);
  });
  for (const slug of slugs) {
    await CmsService.discard(slug).catch(() => null);
    localStorage.removeItem(draftKey(slug));
  }
  set({ docs: {}, dirty: {}, validationErrors: [], viewMode: "draft" });
  await loadDraftFor(state.pageSlug);
}

export function useCmsEditing(): {
  editing: boolean;
  epoch: number;
  ready: boolean;
} {
  const editing = useSyncExternalStore(
    subscribe,
    () => state.editing && state.viewMode === "draft",
    () => false,
  );
  const epoch = useSyncExternalStore(subscribe, () => state.epoch, () => 0);
  const ready = useSyncExternalStore(
    subscribe,
    () => !!state.docs[state.pageSlug] && !state.loading,
    () => false,
  );
  return { editing, epoch, ready };
}

export function useSection<T>(
  basePath: PathSegment[],
  fallback: T,
  scope: DocScope = "page",
): T {
  const slice = useSyncExternalStore(
    subscribe,
    () => {
      if (!state.editing) return null;
      const slug = slugForScope(scope);
      const doc =
        state.viewMode === "published"
          ? state.publishedDocs[slug]
          : state.docs[slug];
      if (!doc) return null;
      return (getAtPath(doc, basePath) ?? null) as T | null;
    },
    () => null,
  );
  return slice ?? fallback;
}

export function useDocumentBySlug<T>(slug: string, fallback: T): T {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      if (!state.editing) return null;
      return state.viewMode === "published"
        ? state.publishedDocs[slug] ?? null
        : state.docs[slug] ?? null;
    },
    () => null,
  );
  return (value as T | null) ?? fallback;
}

export function useEditingDoc(scope: DocScope = "page"): JsonObject | null {
  return useSyncExternalStore(
    subscribe,
    () => state.docs[slugForScope(scope)] ?? null,
    () => null,
  );
}

export function getEditingDoc(scope: DocScope = "page"): JsonObject | null {
  return state.docs[slugForScope(scope)] ?? null;
}

export function getPublishedDoc(scope: DocScope = "page"): JsonObject | null {
  return state.publishedDocs[slugForScope(scope)] ?? null;
}

export function getRenderableDoc(slug: string): JsonObject | null {
  return state.viewMode === "published"
    ? state.publishedDocs[slug] ?? null
    : state.docs[slug] ?? null;
}

export function useCmsViewMode(): CmsViewMode {
  return useSyncExternalStore(
    subscribe,
    () => state.viewMode,
    () => "draft",
  );
}

export function useCmsStatus() {
  return useSyncExternalStore(
    subscribe,
    () =>
      `${state.editing}|${Object.values(state.dirty).some(Boolean)}|${state.saving}|${state.loading}`,
    () => "false|false|false|false",
  );
}

export function useCmsValidationErrors(): CmsValidationError[] {
  return useSyncExternalStore(
    subscribe,
    () => state.validationErrors,
    () => [],
  );
}

export function useCmsAuthError(): boolean {
  return useSyncExternalStore(subscribe, () => state.authError, () => false);
}

export function clearAuthError(): void {
  if (state.authError) set({ authError: false });
}

export function getPageSlug(): string {
  return state.pageSlug;
}
