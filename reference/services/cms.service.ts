import type { JsonObject } from "@/components/cms/json";
import type { PageContentEntry } from "@/lib/server/contentStore";
import type { CmsReleaseRequest, CmsReleaseResult } from "@/lib/server/cmsRelease";
import type { CmsHistoryPage, CmsHistorySnapshot } from "@/lib/server/cmsHistory";
import type { CmsRestoreResult, CmsRestoreMode } from "@/lib/server/cmsRestore";

/** Remove the raw-key storage used by older CMS builds. */
export function clearLegacyCmsKey(): void {
  try {
    sessionStorage.removeItem("cms:key");
  } catch {
    // Storage may be unavailable; the server cookie remains authoritative.
  }
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

async function sessionResponse(
  response: Response,
): Promise<{ authenticated: boolean }> {
  const body = (await response.json()) as {
    authenticated: boolean;
    error?: string;
  };
  if (!response.ok) throw new Error(body.error ?? "Unauthorized");
  return { authenticated: body.authenticated };
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json()) as { data: T; error: string | null };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body.data;
}

export const CmsService = {
  sessionStatus(): Promise<{ authenticated: boolean }> {
    return fetch("/api/cms/session", { cache: "no-store" }).then(
      sessionResponse,
    );
  },
  async login(key: string): Promise<void> {
    await fetch("/api/cms/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    }).then(sessionResponse);
  },
  async logout(): Promise<void> {
    await fetch("/api/cms/session", { method: "DELETE" }).then(sessionResponse);
  },
  listHistory(slug: string, before: number | null = null): Promise<CmsHistoryPage> {
    const suffix = before === null ? "" : `?before=${before}`;
    return fetch(`/api/cms/history/${encodeURIComponent(slug)}${suffix}`, {
      cache: "no-store",
    }).then((r)=>unwrap<CmsHistoryPage>(r));
  },
  restoreHistory(slug: string, sourceVersion: number, input: {
    requestId: string; mode: CmsRestoreMode;
    expectedVersion: number; expectedDraftRevision: number;
  }): Promise<CmsRestoreResult> {
    return fetch(`/api/cms/history/${encodeURIComponent(slug)}/${sourceVersion}/restore`,{
      method:"POST",headers:headers(),body:JSON.stringify(input),
    }).then(r=>unwrap<CmsRestoreResult>(r));
  },
  historicalSnapshot(slug: string, version: number): Promise<CmsHistorySnapshot> {
    return fetch(`/api/cms/history/${encodeURIComponent(slug)}/${version}`, {
      cache: "no-store",
    }).then((r)=>unwrap<CmsHistorySnapshot>(r));
  },
  getEntry(slug: string): Promise<PageContentEntry | null> {
    return fetch(`/api/cms/pages/${slug}`, { cache: "no-store" }).then((r) =>
      unwrap<PageContentEntry | null>(r),
    );
  },
  saveDraft(slug: string, draft: JsonObject, expectedVersion: number, expectedDraftRevision: number): Promise<PageContentEntry> {
    return fetch(`/api/cms/pages/${slug}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ draft, expectedVersion, expectedDraftRevision }),
    }).then((r) => unwrap<PageContentEntry>(r));
  },
  publishRelease(request: CmsReleaseRequest): Promise<CmsReleaseResult> {
    return fetch("/api/cms/releases", {
      method: "POST", headers: headers(), body: JSON.stringify(request),
    }).then((r) => unwrap<CmsReleaseResult>(r));
  },
  discard(slug: string, expectedVersion: number, expectedDraftRevision: number): Promise<PageContentEntry> {
    return fetch(`/api/cms/pages/${slug}`, {
      method: "DELETE", headers: headers(),
      body: JSON.stringify({ expectedVersion, expectedDraftRevision }),
    }).then((r) => unwrap<PageContentEntry>(r));
  },
};
