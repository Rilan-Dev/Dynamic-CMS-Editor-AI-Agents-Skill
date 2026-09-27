import type { JsonObject } from "@/components/cms/json";
import type { PageContentEntry } from "@/lib/server/contentStore";

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
  getEntry(slug: string): Promise<PageContentEntry | null> {
    return fetch(`/api/cms/pages/${slug}`, { cache: "no-store" }).then((r) =>
      unwrap<PageContentEntry | null>(r),
    );
  },
  saveDraft(slug: string, draft: JsonObject): Promise<PageContentEntry> {
    return fetch(`/api/cms/pages/${slug}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ draft }),
    }).then((r) => unwrap<PageContentEntry>(r));
  },
  publish(slug: string): Promise<PageContentEntry> {
    return fetch(`/api/cms/pages/${slug}`, {
      method: "POST",
      headers: headers(),
    }).then((r) => unwrap<PageContentEntry>(r));
  },
  discard(slug: string): Promise<PageContentEntry | null> {
    return fetch(`/api/cms/pages/${slug}`, {
      method: "DELETE",
      headers: headers(),
    }).then((r) => unwrap<PageContentEntry | null>(r));
  },
};
