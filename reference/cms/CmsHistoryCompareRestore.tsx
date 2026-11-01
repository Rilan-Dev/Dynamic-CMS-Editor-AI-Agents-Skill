"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeftRight, Check, GitCompareArrows, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CmsHistorySnapshot } from "@/lib/server/cmsHistory";
import type { CmsRestoreMode } from "@/lib/server/cmsRestore";
import { CmsService } from "@/lib/services/cms.service";
import { applyRestoredCmsRevision, getState, prepareCmsRestoration } from "./store";
import { diffCmsSnapshots } from "./cmsHistoryDiff";
import { previewCmsSnapshot } from "./cmsHistoryPreview";
import type { JsonValue } from "./json";

function brief(value:JsonValue|undefined):string {
  if(value===undefined)return "(not present)";
  const text=typeof value==="string"?value:JSON.stringify(value);
  return text.length>360?text.slice(0,360)+"…":text;
}
function VisualVersion({item,label}:{item:CmsHistorySnapshot;label:string}){
  const parts=useMemo(()=>previewCmsSnapshot(item.snapshot,40),[item.snapshot]);
  return <section aria-label={label} className="min-w-0 space-y-2 rounded-xl border bg-muted/20 p-3">
    <p className="text-xs font-semibold">{label} · v{item.revision.version}</p>
    {parts.length===0&&<p className="text-xs text-muted-foreground">No previewable text or images</p>}
    {parts.map((part,i)=><div key={part.path+"-"+i} className="rounded-lg border bg-background p-2">
      <p className="mb-1 break-all text-[11px] text-muted-foreground">{part.path}</p>
      {part.imageUrl ? (
        // Only same-origin media URLs are allowed by previewCmsSnapshot.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={part.imageUrl} alt={part.text} loading="lazy"
          className="max-h-36 max-w-full rounded object-contain"/>
      ):<p className={`whitespace-pre-wrap break-words text-sm ${
        part.kind==="heading"?"font-semibold":""
      }`}>{part.text}</p>}
    </div>)}
  </section>;
}

/** Human confirmation is mandatory for overwriting draft or live content. */
export function CmsHistoryCompareRestore({
  slug,selected,live,onRestored,
}:{
  slug:string;
  selected:CmsHistorySnapshot;
  live:CmsHistorySnapshot|null;
  onRestored:()=>void;
}){
  const router=useRouter();
  const [dialogMode,setDialogMode]=useState<CmsRestoreMode|null>(null);
  const [busy,setBusy]=useState(false);
  const [failure,setFailure]=useState<string|null>(null);
  const pending=useRef<{fingerprint:string;id:string}|null>(null);
  const diff=useMemo(()=>live?diffCmsSnapshots(selected.snapshot,live.snapshot):[],[selected,live]);
  const changed=diff.length;
  const draftDirty=!!getState().dirty[slug];
  const site=slug==="site";
  const restoringLive=dialogMode==="publish";

  const restore=async()=>{
    if(!dialogMode || busy)return;
    setBusy(true);setFailure(null);
    try{
      const expected=await prepareCmsRestoration(slug);
      const fingerprint=JSON.stringify([slug,selected.revision.version,dialogMode,expected]);
      if(pending.current?.fingerprint!==fingerprint)pending.current={
        fingerprint,id:crypto.randomUUID(),
      };
      const result=await CmsService.restoreHistory(slug,selected.revision.version,{
        expectedVersion:expected.version,
        expectedDraftRevision:expected.draftRevision,
        requestId:pending.current.id,mode:dialogMode,
      });
      applyRestoredCmsRevision(result);
      pending.current=null;
      setDialogMode(null);
      if(dialogMode==="publish")router.refresh();
      toast.success(dialogMode==="publish"
        ? `Restored v${selected.revision.version} as new live v${result.version}`
        : `Version ${selected.revision.version} is now your editable draft`,{
        description:dialogMode==="publish"
          ?"History is preserved. Reversing this restoration creates another new version."
          :"Your live website is unchanged. Review changes before pressing Publish.",
      });
      onRestored();
    }catch(error){
      const message=error instanceof Error?error.message:"Restoration failed";
      const friendly=message.includes("Another editor")
        ?"Another editor changed this document. Close this dialog, refresh History and review the latest draft."
        :message;
      setFailure(friendly);
      toast.error("Restore was not completed",{description:friendly});
    }finally{setBusy(false);}
  };

  return <section className="mt-5 space-y-4 border-t pt-5" aria-label="Compare and restore">
    <header>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <GitCompareArrows className="h-4 w-4 text-brand"/> Compare with live version
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Structured changes and read-only side-by-side content previews. These previews
        show saved content, not an exact historical website rendering.
      </p>
    </header>
    {live ? <Tabs defaultValue="changes">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="changes">Changes ({changed})</TabsTrigger>
        <TabsTrigger value="visual">Before / After</TabsTrigger>
      </TabsList>
      <TabsContent value="changes" className="space-y-2 pt-3">
        {changed===0?<p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          This version matches the current live content.
        </p>:diff.map((change,i)=><article key={change.path+"-"+i}
          className="space-y-1 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="break-all text-xs font-semibold">{change.label}</h4>
            <div className="flex gap-1">
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]">{change.category}</span>
              <span className="rounded-md border px-1.5 py-0.5 text-[10px]">{change.type}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div><span className="text-muted-foreground">Version {selected.revision.version}</span>
              <p className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/50 p-2">{brief(change.before)}</p>
            </div>
            <div><span className="text-muted-foreground">Live v{live.revision.version}</span>
              <p className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/50 p-2">{brief(change.after)}</p>
            </div>
          </div>
        </article>)}
        {changed>=120&&<p className="text-xs text-muted-foreground">
          Showing the first 120 differences. Open the saved JSON in Preview to inspect the rest.
        </p>}
      </TabsContent>
      <TabsContent value="visual" className="pt-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <VisualVersion item={selected} label="Before · selected"/>
          <VisualVersion item={live} label="After · live"/>
        </div>
      </TabsContent>
    </Tabs>:<p className="rounded-lg border p-3 text-sm text-muted-foreground">
      A current published snapshot is required for side-by-side comparison.
      Publish once or refresh the history after the baseline is available.
    </p>}
    <div className="space-y-3 rounded-xl border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <RotateCcw className="h-4 w-4"/> Restore version {selected.revision.version}
      </h3>
      <p className="text-xs text-muted-foreground">
        Restore to draft is recommended: it does not change the live website.
        Publishing a restoration creates a new version without removing existing history.
      </p>
      {site&&<p className="flex gap-2 rounded-lg bg-muted p-3 text-xs">
        <AlertTriangle className="h-4 w-4 shrink-0"/>
        Site settings affect the navbar, footer, theme and other shared pages.
      </p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={()=>setDialogMode("draft")}>
          <RotateCcw className="mr-2 h-4 w-4"/> Restore to draft
        </Button>
        <Button className="flex-1" onClick={()=>setDialogMode("publish")}
          disabled={selected.revision.isCurrent}>
          <ArrowLeftRight className="mr-2 h-4 w-4"/> Restore &amp; Publish
        </Button>
      </div>
      {selected.revision.isCurrent&&<p className="text-xs text-muted-foreground">
        The selected version is already live. You can still restore it as your draft.
      </p>}
      {selected.revision.action==="rollback"&&
        <p className="text-xs text-muted-foreground">
          This version was itself a rollback. To reverse it, select the publication
          from before that rollback and restore it as a new version.
        </p>}
    </div>

    <AlertDialog open={dialogMode!==null} onOpenChange={open=>{if(!open&&!busy){setDialogMode(null);setFailure(null);}}}>
      <AlertDialogContent data-cms-ui overlayClassName="z-[1500]" className="z-[1510]">
        <AlertDialogHeader>
          <AlertDialogTitle>{restoringLive
            ?`Publish version ${selected.revision.version} again?`
            :`Restore version ${selected.revision.version} to your draft?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {restoringLive
              ? "This will replace the current published content with the selected historical snapshot. A NEW version will be created; the other published versions stay available."
              : "This will replace this document's editable draft with the selected historical content. Your live website will not change until you choose Publish."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {draftDirty&&<p className="rounded-lg border border-destructive/30 p-3 text-sm">
          <AlertTriangle className="mr-1 inline h-4 w-4"/>
          You have current draft changes. Confirming will replace them for this document.
          Copy your changes first if you need them.
        </p>}
        {site&&<p className="rounded-lg bg-muted p-3 text-sm">
          This action targets shared site settings across the entire website.
        </p>}
        {failure&&<p role="alert" className="text-sm text-destructive">{failure}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep current content</AlertDialogCancel>
          <Button disabled={busy} onClick={()=>void restore()}>
            {busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Check className="mr-2 h-4 w-4"/>}
            {restoringLive?"Confirm Restore & Publish":"Confirm Restore to Draft"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
