"use client";

import { useSyncExternalStore } from "react";
import {
  blogDocumentName,
  blogSlugFromDocument,
  isBlogDocument,
} from "@/components/blog/blogSlug";
import {
  isProjectDocument,
  projectDocumentName,
  projectSlugFromDocument,
} from "@/components/projects/projectSlug";
import { CmsService } from "@/lib/services/cms.service";
import type { CmsRestoreResult } from "@/lib/server/cmsRestore";
import { normalizeCmsDocument } from "./documentNormalization";
import {
  CmsDocumentValidationError,
  validateCmsDocuments,
  validateRelatedDocument,
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

const relatedSlugsFor = (
  pageSlug: string,
  pageDocument?: JsonObject | null,
): string[] => {
  const related: string[] = RELATED_DOCUMENT_SLUGS.filter(
    (slug) => slug !== pageSlug,
  );
  // A post needs the blog index for its categories.
  if (isBlogDocument(pageSlug)) return [...related, "blogs"];
  // A project needs the projects index for its categories.
  if (isProjectDocument(pageSlug)) return [...related, "projects"];
  // Load every rostered project into the CMS store so listing cards can edit
  // their own project document in place through the normal doc:<slug> scope.
  if (pageSlug === "projects") {
    const roster = Array.isArray(pageDocument?.projects) ? pageDocument.projects : [];
    const projectDocs = roster
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
        const slug = (entry as JsonObject).slug;
        return typeof slug === "string" && slug ? projectDocumentName(slug) : "";
      })
      .filter(Boolean);
    return [...new Set([...related, ...projectDocs])];
  }
  return related;
};

export function slugForPathname(pathname: string): string {
  if (pathname === "/") return "home";
  const [first, second] = pathname.replace(/^\//, "").split("/");
  // Each article is its own document, so /blogs/<slug> edits blog-<slug>.
  if (first === "blogs" && second) return blogDocumentName(second);
  // Each project is its own document, so /projects/<slug> edits project-<slug>.
  if (first === "projects" && second) return projectDocumentName(second);
  return first;
}

/**
 * Which document an edit targets: the current page, the shared site chrome,
 * or `doc:<slug>` — a related document already loaded alongside the page
 * (e.g. `doc:projects` on a project page). A `doc:` scope never loads
 * anything itself; when the document is not loaded, reads fall back and
 * writes are ignored, exactly as for a page whose document is missing.
 */
export type DocScope = "page" | "site" | `doc:${string}`;
/**
 * - `draft`: editing — draft documents with every editing control.
 * - `preview`: "View drafts" — the same draft documents and unpublished
 *   posts/projects, but read-only: links navigate, nothing is editable.
 * - `published`: the live site, for comparison.
 */
export type CmsViewMode = "draft" | "preview" | "published";

interface CmsState {
  editing: boolean;
  loading: boolean;
  pageSlug: string;
  docs: Record<string, JsonObject | null>;
  publishedDocs: Record<string, JsonObject | null>;
  dirty: Record<string, boolean>;
  versions: Record<string, { version: number; draftRevision: number }>;
  saveError: string | null;
  epoch: number;
  saving: boolean;
  publishing: boolean;
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
  versions: {},
  saveError: null,
  epoch: 0,
  saving: false,
  publishing: false,
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

export function slugForScope(scope: DocScope): string {
  if (scope === "site") return SITE_SLUG;
  if (scope.startsWith("doc:")) return scope.slice("doc:".length);
  return state.pageSlug;
}

const draftKey = (slug: string) => `cms:draft:${slug}`;
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const saveQueues: Record<string, Promise<void>> = {};
let pendingRelease: { fingerprint: string; requestId: string } | null = null;

function queueSave(slug: string, doc: JsonObject): Promise<void> {
  const previous = saveQueues[slug] ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(async () => {
    if (state.saveError?.startsWith("Recovered local draft conflicts")) {
      throw new Error(state.saveError);
    }
    const versions = state.versions[slug];
    if (!versions) throw new Error("Draft version unavailable. Reload the editor before saving.");
    const saved = await CmsService.saveDraft(slug, doc, versions.version, versions.draftRevision);
    set({
      versions: { ...state.versions,
        [slug]: {version: saved.version, draftRevision: saved.draftRevision} },
      saveError: null, authError: false,
    });
    try {
      const raw = localStorage.getItem(draftKey(slug));
      if (raw) {
        const local = JSON.parse(raw) as { __cmsDraft?: number; doc?: JsonObject };
        if (local.__cmsDraft === 1) {
          if (JSON.stringify(local.doc) === JSON.stringify(doc)) localStorage.removeItem(draftKey(slug));
          else localStorage.setItem(draftKey(slug), JSON.stringify({
            __cmsDraft: 1, doc: local.doc, version: saved.version, draftRevision: saved.draftRevision,
          }));
        }
      }
    } catch { /* optional storage */ }
  });
  saveQueues[slug] = current;
  set({ saving: true });
  void current.catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unable to save draft.";
    set({ saveError: message, authError: message === "Unauthorized" });
  }).finally(() => {
    if (saveQueues[slug] === current) delete saveQueues[slug];
    set({ saving: Object.keys(saveQueues).length > 0 });
  });
  return current;
}

function scheduleSave(slug: string, doc: JsonObject) {
  const revision = state.versions[slug] ?? {version: 0, draftRevision: 0};
  try { localStorage.setItem(draftKey(slug), JSON.stringify({
    __cmsDraft: 1, doc, version: revision.version, draftRevision: revision.draftRevision,
  })); } catch {
    // Keeping a server-side draft is still possible if localStorage is disabled.
  }
  if (saveTimers[slug]) clearTimeout(saveTimers[slug]);
  saveTimers[slug] = setTimeout(() => {
    delete saveTimers[slug];
    if (state.publishing) {
      const latest = state.docs[slug];
      if (latest) scheduleSave(slug, latest);
      return;
    }
    void queueSave(slug, doc);
  }, 1200);
}

/**
 * Restore operations intentionally discard the selected document's local draft.
 * The UI must first obtain explicit editor confirmation. Wait for outstanding
 * writes before reading the latest CAS counters.
 */
export async function prepareCmsRestoration(slug:string):Promise<{version:number;draftRevision:number}> {
  if (!state.editing || state.publishing) throw new Error("Finish the current editing action before restoring.");
  if (state.saveError) throw new Error("Resolve the current draft save conflict before restoring. Copy your local draft and reload first.");
  if(!state.docs[slug]) throw new Error("Load this document in the editor before restoring.");
  if(saveTimers[slug]) {clearTimeout(saveTimers[slug]);delete saveTimers[slug];}
  const pending=saveQueues[slug];
  if(pending) {
    const result=await Promise.allSettled([pending]);
    if(result[0].status==="rejected")throw new Error("A draft is still failing to save. Copy your local changes before restoring.");
  }
  const v=state.versions[slug];
  if(!v)throw new Error("Reload this document to get its current version.");
  return {version:v.version,draftRevision:v.draftRevision};
}

/** Adopt a committed server response, never stale browser JSON. */
export function applyRestoredCmsRevision(result:CmsRestoreResult):void {
  if(!state.editing || !state.docs[result.slug])return;
  const docs={...state.docs,
    [result.slug]:normalizeCmsDocument(result.slug,result.snapshot)};
  const publishedDocs=result.mode==="publish"
    ? {...state.publishedDocs,[result.slug]:normalizeCmsDocument(result.slug,result.snapshot)}
    : state.publishedDocs;
  const dirty={...state.dirty};
  delete dirty[result.slug];
  const versions={...state.versions,[result.slug]:{
    version:result.version,draftRevision:result.draftRevision,
  }};
  try{localStorage.removeItem(draftKey(result.slug));}catch{/* optional */}
  pendingRelease=null;
  set({docs,publishedDocs,dirty,versions,validationErrors:[],saveError:null,
    viewMode:"draft",epoch:state.epoch+1});
}

export async function retrySave(): Promise<void> {
  const jobs = Object.entries(state.dirty).filter(([, dirty]) => dirty)
    .map(([slug]) => state.docs[slug] ? queueSave(slug, state.docs[slug]!) : Promise.resolve());
  await Promise.all(jobs);
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
  const registered = (CONTENT_REGISTRY[slug] ?? null) as JsonObject | null;
  if (registered) return registered;

  // Posts are created by editors, so they never appear in the registry.
  if (isBlogDocument(slug)) {
    const { defaultBlogPost } = await import("@/content/blogDefaults");
    return defaultBlogPost({
      title: "New Article",
      slug: blogSlugFromDocument(slug) ?? "post",
      category: "",
    });
  }
  // Projects are created by editors, so they never appear in the registry.
  if (isProjectDocument(slug)) {
    const { defaultProject } = await import("@/content/projectDefaults");
    return defaultProject({
      title: "New Project",
      slug: projectSlugFromDocument(slug) ?? "project",
      category: "",
    });
  }
  return null;
}

const normalizeWithFallback = (
  slug: string,
  fallback: JsonObject | null,
  doc: JsonObject,
): JsonObject => {
  const merged = fallback ? (deepMerge(fallback, doc) as JsonObject) : doc;
  return normalizeCmsDocument(slug, merged);
};

const isUnauthorized = (error: unknown): boolean =>
  (error as Error)?.message === "Unauthorized";

/**
 * A missing or unreachable entry falls back to registry defaults, but an
 * expired session must not: loading defaults there would let an editor save
 * them over the real draft. Auth failures propagate to loadDraftFor.
 */
async function fetchEntry(slug: string, trackVersion = true) {
  try {
    const entry = await CmsService.getEntry(slug);
    if (trackVersion) set({ versions: { ...state.versions,
      [slug]: { version: entry?.version ?? 0, draftRevision: entry?.draftRevision ?? 0 },
    } });
    return entry;
  } catch (error) {
    if (isUnauthorized(error)) throw error;
    return null;
  }
}

async function resolveDraft(slug: string): Promise<JsonObject | null> {
  const fallback = await registryFallback(slug);
  // Always read the current version before considering locally recovered content.
  const entry = await fetchEntry(slug);
  try {
    const local = localStorage.getItem(draftKey(slug));
    if (local) {
      const parsed = JSON.parse(local) as JsonObject;
      const envelope = parsed.__cmsDraft === 1 && parsed.doc && typeof parsed.doc === "object"
        ? parsed : null;
      const restored = (envelope ? envelope.doc : parsed) as JsonObject;
      const version = entry?.version ?? 0, draftRevision = entry?.draftRevision ?? 0;
      const stale = envelope
        ? envelope.version !== version || envelope.draftRevision !== draftRevision
        : !!entry && JSON.stringify(restored) !== JSON.stringify(entry.draft ?? entry.published);
      if (stale) set({ saveError: "Recovered local draft conflicts with newer server content. Copy your changes or discard this local copy before continuing." });
      return normalizeWithFallback(slug, fallback, restored);
    }
  } catch {
    // Corrupt or blocked local storage falls through to the server.
  }
  if (entry?.draft) return normalizeWithFallback(slug, fallback, entry.draft);
  if (entry?.published) return normalizeWithFallback(slug, fallback, entry.published);
  return fallback
    ? normalizeCmsDocument(slug, structuredClone(fallback))
    : null;
}

async function resolvePublished(slug: string): Promise<JsonObject | null> {
  const fallback = await registryFallback(slug);
  const entry = await fetchEntry(slug, false);
  if (entry?.published) return normalizeWithFallback(slug, fallback, entry.published);
  return fallback
    ? normalizeCmsDocument(slug, structuredClone(fallback))
    : null;
}

export async function loadDraftFor(pageSlug: string): Promise<void> {
  set({ loading: true, pageSlug, validationErrors: [] });
  try {
    await loadDocumentsFor(pageSlug);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    // Leave the documents unloaded; the toolbar reacts to authError by
    // asking for the edit key again.
    set({ loading: false, authError: true });
  }
}

async function loadDocumentsFor(pageSlug: string): Promise<void> {
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
    relatedSlugsFor(pageSlug, pageDoc).map(async (relatedSlug) => {
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
    versions: {},
    saveError: null,
    validationErrors: [],
    viewMode: "draft",
    publishing: false,
    epoch: state.epoch + 1,
  });
  pendingRelease = null;
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

/**
 * Everything that would block Publish right now, for the current page, the
 * site document and any related documents edited alongside. The Issues
 * panel re-runs this live so its list shrinks as editors fix things.
 */
export function collectValidationErrors(): CmsValidationError[] {
  const publishingServices =
    state.pageSlug === "services" || state.dirty.services === true;
  const errors = validateCmsDocuments(
    state.docs[state.pageSlug] ?? null,
    state.docs[SITE_SLUG] ?? null,
    {
      servicesDraft: state.docs.services ?? null,
      servicesPublished: state.publishedDocs.services ?? null,
      publishingServices,
      sitePublished: state.publishedDocs[SITE_SLUG] ?? null,
      blogIndexDraft: state.docs.blogs ?? null,
      projectIndexDraft: state.docs.projects ?? null,
    },
  );
  // Documents edited through a `doc:` scope publish alongside the page, so
  // they get the same structural and URL-safety pass before anything ships.
  Object.keys(state.dirty).forEach((slug) => {
    if (!state.dirty[slug] || slug === state.pageSlug || slug === SITE_SLUG) return;
    const doc = state.docs[slug];
    if (doc) errors.push(...validateRelatedDocument(slug, doc));
  });
  return errors;
}

export async function publishDraft(): Promise<void> {
  Object.values(saveTimers).forEach(clearTimeout);
  Object.keys(saveTimers).forEach((slug) => delete saveTimers[slug]);
  // An in-flight autosave must finish before acquiring the final draft revision.
  // Failed saves block publishing so we never pretend an older edit succeeded.
  const pending = await Promise.allSettled(Object.values(saveQueues));
  const rejected = pending.find((result) => result.status === "rejected");
  if (rejected?.status === "rejected") throw rejected.reason;
  if (state.saveError) throw new Error(state.saveError);
  const errors = collectValidationErrors();
  if (errors.length) {
    set({ validationErrors: errors });
    throw new CmsDocumentValidationError(errors);
  }
  const slugs = new Set<string>([state.pageSlug]);
  Object.keys(state.dirty).forEach((slug) => state.dirty[slug] && slugs.add(slug));
  const documents = [...slugs].flatMap((slug) => {
    const doc = state.docs[slug], version = state.versions[slug];
    if (!doc) return [];
    if (!version) throw new Error("Draft version unavailable. Reload before publishing.");
    return [{ slug, document: doc, expectedVersion: version.version,
      expectedDraftRevision: version.draftRevision }];
  });
  if (!documents.length) return;
  set({ saving: true, publishing: true, validationErrors: [] });
  try {
    const fingerprint = JSON.stringify(documents);
    if (pendingRelease?.fingerprint !== fingerprint) {
      pendingRelease = { fingerprint, requestId: crypto.randomUUID() };
    }
    const published = await CmsService.publishRelease({ requestId: pendingRelease.requestId, documents });
    const versions = { ...state.versions };
    const publishedDocs = { ...state.publishedDocs };
    const dirty = { ...state.dirty };
    const changedDuringPublish: string[] = [];
    for (const result of published.documents) {
      versions[result.slug] = { version: result.version, draftRevision: result.draftRevision };
      const submitted = documents.find((d) => d.slug === result.slug)?.document;
      const latest = state.docs[result.slug];
      if (submitted) publishedDocs[result.slug] = structuredClone(submitted);
      if (latest && submitted && JSON.stringify(latest) !== JSON.stringify(submitted)) {
        dirty[result.slug] = true;
        changedDuringPublish.push(result.slug);
      } else {
        delete dirty[result.slug];
        try { localStorage.removeItem(draftKey(result.slug)); } catch { /* optional storage */ }
      }
    }
    pendingRelease = null;
    set({ dirty, versions, publishedDocs, saveError: null, publishing: false });
    for (const slug of changedDuringPublish) {
      const latest = state.docs[slug];
      if (latest) scheduleSave(slug, latest);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish release.";
    if (message.includes("Another editor")) set({ saveError: message });
    throw error;
  } finally {
    set({ saving: false, publishing: false });
  }
}

export async function discardDraft(): Promise<void> {
  Object.values(saveTimers).forEach(clearTimeout);
  Object.keys(saveTimers).forEach((slug) => delete saveTimers[slug]);
  const pending = await Promise.allSettled(Object.values(saveQueues));
  const rejected = pending.find((result) => result.status === "rejected");
  if (rejected?.status === "rejected") throw rejected.reason;
  // A stale recovered browser draft must never discard another editor's server draft.
  if (state.saveError?.startsWith("Recovered local draft conflicts") ||
      state.saveError?.includes("Another editor changed")) {
    for (const slug of Object.keys(state.docs)) {
      try { localStorage.removeItem(draftKey(slug)); } catch { /* optional */ }
    }
    set({ docs: {}, dirty: {}, validationErrors: [], saveError: null });
    await loadDraftFor(state.pageSlug);
    return;
  }
  const slugs = new Set<string>([state.pageSlug, SITE_SLUG]);
  Object.entries(state.dirty).forEach(([slug, dirty]) => { if (dirty) slugs.add(slug); });
  for (const slug of slugs) {
    const v = state.versions[slug];
    if (!v || (v.version === 0 && v.draftRevision === 0)) {
      try { localStorage.removeItem(draftKey(slug)); } catch { /* optional */ }
      continue;
    }
    const saved = await CmsService.discard(slug, v.version, v.draftRevision);
    set({ versions: { ...state.versions,
      [slug]: { version: saved.version, draftRevision: saved.draftRevision } } });
    try { localStorage.removeItem(draftKey(slug)); } catch { /* optional */ }
  }
  set({ docs: {}, dirty: {}, validationErrors: [], viewMode: "draft", saveError: null });
  await loadDraftFor(state.pageSlug);
}

export function useCmsEditing(): {
  editing: boolean;
  epoch: number;
  ready: boolean;
  /** Unpublished content is visible: editing, or viewing drafts. */
  showDrafts: boolean;
} {
  const editing = useSyncExternalStore(
    subscribe,
    () => state.editing && state.viewMode === "draft",
    () => false,
  );
  const showDrafts = useSyncExternalStore(
    subscribe,
    () => state.editing && state.viewMode !== "published",
    () => false,
  );
  const epoch = useSyncExternalStore(subscribe, () => state.epoch, () => 0);
  const ready = useSyncExternalStore(
    subscribe,
    () => !!state.docs[state.pageSlug] && !state.loading,
    () => false,
  );
  return { editing, epoch, ready, showDrafts };
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

/** Current page's live CMS version; null before initial editor entry read. */
export function useCmsPublishedVersion(): number | null {
  return useSyncExternalStore(subscribe,
    ()=>state.versions[state.pageSlug]?.version ?? null, ()=>null);
}

export function useCmsStatus() {
  return useSyncExternalStore(
    subscribe,
    () =>
      `${state.editing}|${Object.values(state.dirty).some(Boolean)}|${state.saving}|${state.loading}`,
    () => "false|false|false|false",
  );
}

/** The docs object changes identity on every edit — a cheap "something changed" signal. */
export function useCmsDocsVersion(): unknown {
  return useSyncExternalStore(subscribe, () => state.docs, () => null);
}

export function useCmsValidationErrors(): CmsValidationError[] {
  return useSyncExternalStore(
    subscribe,
    () => state.validationErrors,
    () => [],
  );
}

export function useCmsSaveError(): string | null {
  return useSyncExternalStore(subscribe, () => state.saveError, () => null);
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
