"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Loader2,
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
import { CmsDocumentValidationError } from "./documentValidation";
import { enterEditMode, loginAndEnterEditMode } from "./editSession";
import {
  clearAuthError,
  discardDraft,
  loadDraftFor,
  publishDraft,
  retrySave,
  setCmsViewMode,
  slugForPathname,
  startEditing,
  stopEditing,
  useCmsAuthError,
  useCmsStatus,
  useCmsValidationErrors,
  useCmsViewMode,
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
  const authError = useCmsAuthError();

  useEffect(() => {
    if (authError) {
      setLoginError("Your CMS session expired. Enter the edit key again.");
      setAskKey(true);
    }
  }, [authError]);

  useEffect(() => {
    let cancelled = false;
    import("@/content/registry.extended").then(({ CONTENT_REGISTRY }) => {
      if (!cancelled) setHasDoc(!!CONTENT_REGISTRY[slugForPathname(pathname ?? "/")]);
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
      setCmsViewMode("draft");
      toast.success("Changes published", {
        description: "Page and shared site updates are now live. You can keep editing.",
      });
      router.refresh();
    } catch (error) {
      if ((error as Error).message === "Unauthorized") {
        setAskKey(true);
      } else if (error instanceof CmsDocumentValidationError) {
        const first = error.errors[0];
        toast.error("Publishing blocked", {
          description: `${first?.message ?? "Fix invalid CMS fields."}${
            error.errors.length > 1 ? ` Plus ${error.errors.length - 1} more.` : ""
          }`,
          duration: 8000,
        });
        setAdvancedOpen(true);
      } else {
        toast.error("Publish failed", { description: (error as Error).message });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleView = () => {
    const next = viewMode === "draft" ? "published" : "draft";
    setCmsViewMode(next);
    toast(next === "published" ? "Viewing published version" : "Returned to draft preview", {
      description:
        next === "published"
          ? "Your draft is safe. Editing controls are temporarily hidden."
          : "Your unpublished work is visible and editable again.",
    });
  };

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 z-[1290] w-auto max-w-[96vw] -translate-x-1/2 transition-all duration-300"
        data-cms-ui
      >
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/90 py-2 pl-4 pr-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
          <label className="flex cursor-pointer items-center gap-2.5">
            <Pencil className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">Edit mode</span>
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
                className={`hidden whitespace-nowrap text-xs font-semibold sm:inline-block ${
                  validationErrors.length
                    ? "text-red-600"
                    : viewMode === "published"
                      ? "text-purple-700"
                      : "text-slate-500"
                }`}
              >
                {viewMode === "published"
                  ? "Viewing published version"
                  : loading
                    ? "Loading…"
                    : saving
                      ? "Saving…"
                      : validationErrors.length
                        ? `${validationErrors.length} issue${validationErrors.length === 1 ? "" : "s"}`
                        : dirty
                          ? "Draft saved locally"
                          : "Draft up to date"}
              </span>

              {validationErrors.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50"
                  title={validationErrors[0]?.message}
                  onClick={() => setAdvancedOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 rounded-full px-3 text-slate-600 hover:bg-green-50 hover:text-green-700"
                onClick={() => setAdvancedOpen(true)}
                disabled={viewMode === "published"}
                title="Advanced fields — add, reorder or remove page and site data"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden text-xs font-semibold sm:inline">Fields</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 rounded-full px-3 text-slate-600 hover:bg-purple-50 hover:text-purple-700"
                onClick={toggleView}
                title={viewMode === "draft" ? "Compare with the public website" : "Return to your draft"}
              >
                {viewMode === "draft" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="hidden text-xs font-semibold sm:inline">
                  {viewMode === "draft" ? "View published" : "Return to draft"}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => setConfirmDiscard(true)}
                disabled={viewMode === "published"}
                title="Discard page and site drafts"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                onClick={handlePublish}
                disabled={isPublishing || loading || viewMode === "published"}
                className="h-9 gap-2 rounded-full bg-green-700 px-5 text-white shadow-lg transition-all hover:bg-green-800 active:scale-95"
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

      {editing && viewMode === "draft" && (
        <AdvancedEditorPanel open={advancedOpen} onOpenChange={setAdvancedOpen} />
      )}
    </>
  );
}
