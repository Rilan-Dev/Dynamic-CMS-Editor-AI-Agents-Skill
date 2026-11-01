"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, FileClock, History, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CmsHistoryPage, CmsHistorySnapshot, CmsVersionSummary } from "@/lib/server/cmsHistory";
import { CmsService } from "@/lib/services/cms.service";
import { previewCmsSnapshot } from "./cmsHistoryPreview";
import { CmsHistoryCompareRestore } from "./CmsHistoryCompareRestore";

function displayDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return "Date unavailable";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
function kindLabel(item: CmsVersionSummary): string {
  return item.action === "baseline" ? "Initial history snapshot"
    : item.action === "rollback" ? "Restored and published"
      : "Published changes";
}
function titleCase(key: string): string {
  return key.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[._-]/g," ").trim();
}

function HistoricalContent({ value }: { value: CmsHistorySnapshot }) {
  const rows = useMemo(()=>previewCmsSnapshot(value.snapshot),[value.snapshot]);
  return (
    <section aria-label="Historical content preview" className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="h-4 w-4 text-brand" />
        Version {value.revision.version} — Read-only content
      </div>
      <p className="text-xs text-muted-foreground">
        Saved at {displayDate(value.revision.publishedAt)}. This is a content snapshot,
        not a pixel-perfect copy of the website design at that date.
        Previewing never changes your current draft or live page.
      </p>
      {rows.length === 0 && (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
          This version has no text or same-site images available for the quick preview.
          Open the full snapshot below to inspect all fields.
        </p>
      )}
      <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
        {rows.map((node,i)=>(
          <div key={node.path+"-"+i} className="rounded-lg border border-border/70 bg-background p-3">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              {titleCase(node.path)}
            </span>
            {node.kind === "image" && node.imageUrl ? (
              // Historical media must be same-site, and HTML/SVG is not executed here.
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" src={node.imageUrl} alt={node.text}
                className="max-h-48 max-w-full rounded-lg border object-contain" />
            ) : node.kind === "heading" ? (
              <h3 className="break-words text-base font-semibold">{node.text}</h3>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm">{node.text}</p>
            )}
          </div>
        ))}
      </div>
      <details className="rounded-xl border p-3">
        <summary className="cursor-pointer text-sm font-medium">Inspect complete saved content (JSON)</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
          {JSON.stringify(value.snapshot,null,2)}
        </pre>
      </details>
    </section>
  );
}

/** History is lazy-loaded only while the editor has opened the drawer. */
export function CmsVersionHistoryPanel({
  open, onOpenChange, pageSlug, refreshToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageSlug: string;
  refreshToken: number;
}) {
  const [scope,setScope] = useState<"page"|"site">("page");
  const slug = scope === "site" ? "site" : pageSlug;
  const [page,setPage] = useState<CmsHistoryPage | null>(null);
  const [selectedVersion,setSelectedVersion] = useState<number | null>(null);
  const [snapshot,setSnapshot] = useState<CmsHistorySnapshot | null>(null);
  const [liveSnapshot,setLiveSnapshot] = useState<CmsHistorySnapshot | null>(null);
  const [loading,setLoading] = useState(false);
  const [previewLoading,setPreviewLoading] = useState(false);
  const [loadingMore,setLoadingMore] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [previewError,setPreviewError] = useState<string | null>(null);
  const [reload,setReload] = useState(0);
  const active = useRef(slug);
  const historyEpoch = useRef(0);
  active.current = slug;

  useEffect(()=>{
    historyEpoch.current += 1;
    if(!open) return;
    let ignore=false;
    setLoading(true);
    setLoadingMore(false);
    setPage(null);setSnapshot(null);setSelectedVersion(null);setError(null);setPreviewError(null);
    void CmsService.listHistory(slug).then((history)=>{
      if(ignore) return;
      setPage(history);
      setSelectedVersion(history.items[0]?.version ?? null);
    }).catch((reason:unknown)=>{
      if(!ignore) setError(reason instanceof Error ? reason.message : "Unable to load history.");
    }).finally(()=>{if(!ignore) setLoading(false);});
    return ()=>{ignore=true;};
  },[open,slug,reload,refreshToken]);

  useEffect(()=>{
    if(!open || selectedVersion === null) return;
    let ignore=false;
    setPreviewLoading(true);setSnapshot(null);setPreviewError(null);
    void CmsService.historicalSnapshot(slug,selectedVersion).then((data)=>{
      if(!ignore) setSnapshot(data);
    }).catch((reason:unknown)=>{
      if(!ignore) setPreviewError(reason instanceof Error ? reason.message : "Unable to preview this version.");
    }).finally(()=>{if(!ignore) setPreviewLoading(false);});
    return ()=>{ignore=true;};
  },[open,slug,selectedVersion,reload,refreshToken]);

  useEffect(()=>{
    if(!open || !page || page.currentVersion < 0) return;
    let ignore=false;
    setLiveSnapshot(null);
    void CmsService.historicalSnapshot(slug,page.currentVersion).then(result=>{
      if(!ignore)setLiveSnapshot(result);
    }).catch(()=>{if(!ignore)setLiveSnapshot(null);});
    return ()=>{ignore=true;};
  },[open,slug,page?.currentVersion,reload,refreshToken]);

  const loadOlder = async () => {
    if(loadingMore || !page || page.nextBefore === null) return;
    setLoadingMore(true);setError(null);
    const requestedSlug = slug, before = page.nextBefore, epoch = historyEpoch.current;
    try {
      const next = await CmsService.listHistory(slug,before);
      if(active.current !== requestedSlug || historyEpoch.current !== epoch) return;
      setPage(current => current ? {
        ...current,
        items:[...current.items,...next.items.filter(item=>!current.items.some(old=>old.version===item.version))],
        nextBefore:next.nextBefore,
        currentVersion:next.currentVersion,
      } : current);
    } catch(reason) {
      if(active.current === requestedSlug && historyEpoch.current === epoch)
        setError(reason instanceof Error ? reason.message : "Unable to load older versions.");
    } finally { if(active.current === requestedSlug && historyEpoch.current === epoch) setLoadingMore(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" overlayClassName="z-[1390]"
        className="z-[1400] flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        data-cms-ui aria-label="Version history">
        <div className="border-b px-5 pb-4 pt-6">
          <SheetHeader className="pr-8">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand" /> Version history
            </SheetTitle>
            <SheetDescription>
              Inspect older versions, compare changes and safely restore any saved publication.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Tabs value={scope} onValueChange={value=>setScope(value as "page"|"site")}>
              <TabsList>
                <TabsTrigger value="page">Current page</TabsTrigger>
                <TabsTrigger value="site">Site settings</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button type="button" size="sm" variant="outline"
              onClick={()=>setReload(value=>value+1)} title="Refresh published version history">
              <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Document: <code className="font-mono">{slug}</code>
            {page && <> · Live version {page.currentVersion}</>}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:overflow-hidden">
          <section aria-label="Published versions" className="border-b p-4 md:overflow-y-auto md:border-b-0 md:border-r">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileClock className="h-4 w-4" /> Published versions
            </h3>
            {loading && <div role="status" className="flex gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
            </div>}
            {error && (
              <div role="alert" className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p>{error}</p>
                <Button size="sm" variant="outline" onClick={()=>setReload(x=>x+1)}>Try again</Button>
              </div>
            )}
            {!loading && page?.items.length === 0 && !error && (
              <div className="rounded-xl border border-dashed p-4">
                <p className="text-sm font-semibold">No published versions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  History starts with the first archived publication. Older versions from before versioning was enabled cannot be reconstructed.
                </p>
              </div>
            )}
            <ol className="space-y-2">
              {page?.items.map(item=>(
                <li key={item.version}>
                  <button type="button"
                    onClick={()=>setSelectedVersion(item.version)}
                    aria-current={item.version===selectedVersion?"true":undefined}
                    className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                      item.version===selectedVersion
                        ?"border-brand bg-brand-soft":"border-border hover:bg-muted"
                    }`}>
                    <span className="flex flex-wrap items-center justify-between gap-1 text-sm font-semibold">
                      Version {item.version}
                      {item.isCurrent && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-strong">Live</span>}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{kindLabel(item)}{item.restoredFromVersion != null ? ` from v${item.restoredFromVersion}` : ""}</span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3 shrink-0"/>
                      {displayDate(item.publishedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {page?.nextBefore !== null && page?.nextBefore !== undefined && (
              <Button type="button" variant="outline" className="mt-3 w-full" size="sm"
                onClick={()=>void loadOlder()} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> :
                  <ChevronLeft className="mr-2 h-4 w-4 -rotate-90"/>}
                Load older versions
              </Button>
            )}
          </section>
          <section aria-label="Selected version" className="min-w-0 overflow-y-auto p-4 md:p-5">
            {selectedVersion===null && !loading && (
              <p className="text-sm text-muted-foreground">Select a version to preview its saved content.</p>
            )}
            {previewLoading && <div role="status" className="flex gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin"/> Loading saved content…
            </div>}
            {previewError && <div role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
              {previewError}
              <Button type="button" size="sm" variant="outline" className="mt-2 block"
                onClick={()=>setReload(x=>x+1)}>Retry</Button>
            </div>}
            {snapshot && !previewLoading && snapshot.revision.slug===slug && snapshot.revision.version===selectedVersion && (
              <>
                <HistoricalContent value={snapshot}/>
                <CmsHistoryCompareRestore
                  slug={slug}
                  selected={snapshot}
                  live={liveSnapshot}
                  onRestored={()=>{
                    setReload(value=>value+1);
                    onOpenChange(false);
                  }}
                />
              </>
            )}
          </section>
        </div>
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          History remains immutable · Restoring publishes a new version, never deletes old versions.
        </p>
      </SheetContent>
    </Sheet>
  );
}
