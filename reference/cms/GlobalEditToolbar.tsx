"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Eye,
  Globe,
  History,
  Loader2,
  Palette,
  Pencil,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CmsService } from "@/lib/services/cms.service";
import { AdvancedEditorPanel } from "./AdvancedEditorPanel";
import { ThemeEditorPanel } from "./ThemeEditorPanel";
import { IssuesPanel } from "./IssuesPanel";
import { CmsVersionHistoryPanel } from "./CmsVersionHistoryPanel";
import { isBlogDocument } from "@/components/blog/blogSlug";
import { isProjectDocument } from "@/components/projects/projectSlug";
import { CmsDocumentValidationError } from "./documentValidation";
import { enterEditMode, loginAndEnterEditMode } from "./editSession";
import {
  clearAuthError,
  getState,
  discardDraft,
  loadDraftFor,
  publishDraft,
  retrySave,
  setCmsViewMode,
  slugForPathname,
  startEditing,
  stopEditing,
  useCmsAuthError,
  useCmsSaveError,
  useCmsStatus,
  useCmsPublishedVersion,
  useCmsValidationErrors,
  useCmsViewMode,
  type CmsViewMode,
} from "./store";

/** Global inline-editor dock for content, structure, draft comparison and publishing. */
export function GlobalEditToolbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [editing, dirty, saving, loading] = useCmsStatus()
    .split("|")
    .map((value) => value === "true");
  const viewMode = useCmsViewMode();
  const validationErrors = useCmsValidationErrors();
  const [isPublishing, setIsPublishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [askKey, setAskKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [submittingKey, setSubmittingKey] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [hasDoc, setHasDoc] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const publishedVersion = useCmsPublishedVersion();
  const authError = useCmsAuthError();
  const saveError = useCmsSaveError();

  useEffect(() => {
    if (authError) {
      setLoginError("Your CMS session expired. Enter the edit key again.");
      setAskKey(true);
    }
  }, [authError]);

  useEffect(() => {
    let cancelled = false;
    import("@/content/registry.extended").then(({ CONTENT_REGISTRY }) => {
      const slug = slugForPathname(pathname ?? "/");
      // Post and project documents are created by editors, so they are
      // never in the registry; their templates stand in as fallbacks.
      if (!cancelled)
        setHasDoc(
          !!CONTENT_REGISTRY[slug] || isBlogDocument(slug) || isProjectDocument(slug),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (editing && hasDoc) void loadDraftFor(slugForPathname(pathname ?? "/"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hasDoc]);

  if (!hasDoc) return null;

  const closeKeyDialog = () => {
    setAskKey(false);
    setKeyInput("");
    setLoginError(null);
  };

  const toggle = async (on: boolean) => {
    if (on) {
      setCheckingAuth(true);
      setLoginError(null);
      try {
        const result = await enterEditMode(slugForPathname(pathname ?? "/"), {
          sessionStatus: CmsService.sessionStatus,
          startEditing,
        });
        if (result === "login-required") {
          setAskKey(true);
          return;
        }
        toast("Edit mode on", {
          description: "Edit the page directly. Hover an item and use ✨ to add motion.",
        });
      } catch (error) {
        toast.error("Unable to check CMS session", {
          description: (error as Error).message,
        });
      } finally {
        setCheckingAuth(false);
      }
    } else {
      setAdvancedOpen(false);
      setThemeOpen(false);
      setIssuesOpen(false);
      setHistoryOpen(false);
      stopEditing();
    }
  };

  const submitKey = async () => {
    const key = keyInput;
    setSubmittingKey(true);
    setLoginError(null);
    try {
      if (authError) {
        await CmsService.login(key);
        clearAuthError();
        await retrySave();
        toast.success("Editor unlocked", {
          description: "Your changes are saving again.",
        });
      } else {
        await loginAndEnterEditMode(key, slugForPathname(pathname ?? "/"), {
          login: CmsService.login,
          startEditing,
        });
        toast("Edit mode on", {
          description: "Edit the page directly. Hover an item and use ✨ to add motion.",
        });
      }
      setAskKey(false);
    } catch (error) {
      setLoginError(
        (error as Error).message === "Unauthorized"
          ? "Invalid CMS edit key."
          : "Unable to verify the CMS edit key. Try again.",
      );
    } finally {
      setKeyInput("");
      setSubmittingKey(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publishDraft();
      setHistoryRefresh(value=>value+1);
      setCmsViewMode("draft");
      toast.success("Changes published", {
        description: "Page and shared site updates are now live. You can keep editing.",
      });
      router.refresh();
    } catch (error) {
      if ((error as Error).message === "Unauthorized") {
        setAskKey(true);
      } else if (error instanceof CmsDocumentValidationError) {
        toast.error("Publishing blocked", {
          description: `${error.errors.length} issue${
            error.errors.length === 1 ? " needs" : "s need"
          } fixing first — they are listed in the Issues panel.`,
          duration: 6000,
        });
        setThemeOpen(false);
        setIssuesOpen(true);
      } else if ((error as Error).message.includes("Another editor")) {
        toast.error("Publishing paused: content changed elsewhere", {
          description: "Your draft is preserved locally. Refresh and review the latest content before publishing.",
          duration: 10000,
        });
      } else {
        toast.error("Publish failed", { description: (error as Error).message });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const VIEW_MESSAGES: Record<CmsViewMode, [string, string]> = {
    draft: ["Editing drafts", "Your unpublished work is visible and editable."],
    preview: [
      "Viewing drafts",
      "See unpublished pages, posts and projects exactly as they will look. Links work; nothing is editable.",
    ],
    published: ["Viewing published version", "Your drafts are safe. This is the live website."],
  };

  const chooseView = (next: CmsViewMode) => {
    if (next === viewMode) return;
    if (next !== "draft") {
      setAdvancedOpen(false);
      setThemeOpen(false);
      setIssuesOpen(false);
    }
    setCmsViewMode(next);
    const [title, description] = VIEW_MESSAGES[next];
    toast(title, { description });
  };

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 z-[1290] w-auto max-w-[96vw] -translate-x-1/2 transition-all duration-300"
        data-cms-ui
      >
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-popover/90 py-2 pl-4 pr-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
          <label className="flex cursor-pointer items-center gap-2.5">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">Edit mode</span>
            <Switch
              checked={editing}
              disabled={checkingAuth || submittingKey}
              onCheckedChange={toggle}
              aria-label="Toggle edit mode"
            />
          </label>

          {editing && (
            <div className="flex items-center gap-1.5 transition-all duration-200">
              <span
                className={`hidden whitespace-nowrap text-xs font-semibold xl:inline-block ${
                  viewMode === "published"
                      ? "text-purple-700"
                      : "text-muted-foreground"
                }`}
              >
                {viewMode === "published"
                  ? "Live version"
                  : viewMode === "preview"
                    ? "Draft preview"
                    : loading
                    ? "Loading…"
                    : saveError
                      ? "Draft save needs attention"
                    : saving
                      ? "Saving…"
                      : dirty
                          ? "Draft saved locally"
                          : "Draft up to date"}
              </span>

              {saveError && (
                <Button variant="outline" size="sm"
                  className="h-9 rounded-full"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(getState().docs, null, 2));
                      toast.success("Local draft copied", {description:"Keep this copy before discarding or reloading."});
                    } catch {
                      toast.error("Unable to copy draft", {description:"Allow clipboard access, then try again."});
                    }
                  }}
                  title="Copy all locally loaded CMS documents before resolving a conflict">
                  <Save className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Copy draft</span>
                </Button>
              )}
              {saveError && (
                <Button variant="outline" size="sm"
                  className="h-9 rounded-full border-destructive/50 text-destructive"
                  onClick={() => toast.error("Draft not saved to server", {
                    description: saveError + " Your local draft remains available. Refresh and review before retrying.",
                    duration: 10000,
                  })}
                  title="Draft save conflict or error — click for details">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Save issue</span>
                </Button>
              )}

              {validationErrors.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 gap-1.5 rounded-full px-3 text-destructive hover:bg-destructive/10 hover:text-destructive ${
                    issuesOpen ? "bg-destructive/10" : ""
                  }`}
                  title="Show the issues blocking Publish"
                  aria-label="Show the issues blocking Publish"
                  onClick={() => {
                    setThemeOpen(false);
                    setIssuesOpen(true);
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    {validationErrors.length} issue{validationErrors.length === 1 ? "" : "s"}
                  </span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                aria-label="Open version history"
                aria-expanded={historyOpen}
                className={`h-9 gap-1.5 rounded-full px-3 hover:bg-brand-soft hover:text-brand-strong ${
                  historyOpen ? "bg-brand-soft text-brand-strong" : "text-muted-foreground"
                }`}
                title="Browse past publications without changing the live website"
                onClick={() => {
                  setAdvancedOpen(false);
                  setThemeOpen(false);
                  setIssuesOpen(false);
                  setHistoryOpen(true);
                }}
              >
                <History className="h-4 w-4"/>
                <span className="hidden text-xs font-semibold sm:inline">
                  History{publishedVersion === null ? "" : ` · v${publishedVersion}`}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 rounded-full px-3 text-muted-foreground hover:bg-brand-soft hover:text-brand-strong"
                onClick={() => setAdvancedOpen(true)}
                disabled={viewMode !== "draft"}
                title="Advanced fields — add, reorder or remove page and site data"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden text-xs font-semibold sm:inline">Fields</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-9 gap-1.5 rounded-full px-3 hover:bg-brand-soft hover:text-brand-strong ${
                  themeOpen ? "bg-brand-soft text-brand-strong" : "text-muted-foreground"
                }`}
                onClick={() => {
                  setIssuesOpen(false);
                  setThemeOpen((open) => !open);
                }}
                disabled={viewMode !== "draft"}
                aria-pressed={themeOpen}
                title="Site theme — colour scheme and light/dark colours"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden text-xs font-semibold sm:inline">Theme</span>
              </Button>

<div
                role="radiogroup"
                aria-label="What to show"
                className="flex items-center rounded-full border border-border bg-muted/60 p-0.5"
              >
                {(
                  [
                    ["draft", "Edit", Pencil, "Edit the draft"],
                    ["preview", "Drafts", Eye, "View drafts without editing — unpublished posts and projects open normally"],
                    ["published", "Live", Globe, "Compare with the published website"],
                  ] as const
                ).map(([mode, label, Icon, title]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={viewMode === mode}
                    title={title}
                    onClick={() => chooseView(mode)}
                    className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${
                      viewMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
                onClick={() => setConfirmDiscard(true)}
                disabled={viewMode !== "draft"}
                title="Discard page and site drafts"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                onClick={handlePublish}
                disabled={isPublishing || loading || viewMode === "published"}
                className="h-9 gap-2 rounded-full bg-brand px-5 text-brand-contrast shadow-lg transition-all hover:bg-brand-strong active:scale-95"
              >
                {isPublishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : dirty ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {isPublishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={askKey}
        onOpenChange={(open) => {
          if (open) setAskKey(true);
          else closeKeyDialog();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editor key required</DialogTitle>
            <DialogDescription>
              Enter the CMS edit key to unlock editing for this browser session.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Edit key"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && keyInput && !submittingKey) void submitKey();
            }}
          />
          {loginError && <p className="text-sm font-medium text-red-600">{loginError}</p>}
          <DialogFooter>
            <Button variant="ghost" disabled={submittingKey} onClick={closeKeyDialog}>
              Cancel
            </Button>
            <Button
              disabled={!keyInput || submittingKey}
              onClick={() => void submitKey()}
            >
              {submittingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlock editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard drafts?</AlertDialogTitle>
            <AlertDialogDescription>
              All unpublished changes for this page and shared site settings will be
              reset to their live versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                setConfirmDiscard(false);
                await discardDraft();
                toast("Drafts discarded");
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <CmsVersionHistoryPanel
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          pageSlug={slugForPathname(pathname ?? "/")}
          refreshToken={historyRefresh}
        />
      )}
      {editing && viewMode === "draft" && issuesOpen && (
        <IssuesPanel
          onClose={() => setIssuesOpen(false)}
          onOpenFields={() => {
            setIssuesOpen(false);
            setAdvancedOpen(true);
          }}
        />
      )}

      {editing && viewMode === "draft" && themeOpen && (
        <ThemeEditorPanel onClose={() => setThemeOpen(false)} />
      )}

      {editing && viewMode === "draft" && (
        <AdvancedEditorPanel open={advancedOpen} onOpenChange={setAdvancedOpen} />
      )}
    </>
  );
}
