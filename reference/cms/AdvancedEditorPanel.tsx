"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicContentEditor } from "./DynamicFieldEditor";
import { SiteNavigationEditor } from "./SiteNavigationEditor";
import {
  getPageSlug,
  replaceDoc,
  setPath,
  useEditingDoc,
  type DocScope,
} from "./store";
import type { JsonObject } from "./json";

/**
 * Advanced structural editor for either the current page document or the
 * shared site document. Both surfaces mutate the same scoped store used by
 * inline editing, so add/reorder/delete operations remain part of the normal
 * draft and publish flow.
 */
export function AdvancedEditorPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [scope, setScope] = useState<DocScope>("page");
  const doc = useEditingDoc(scope);
  const slug = getPageSlug();
  const documentLabel = scope === "site" ? "Site settings" : `${slug} page`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-cms-ui
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="capitalize">{documentLabel} — advanced fields</SheetTitle>
          <SheetDescription>
            Add, reorder, rename or remove sections and list items. Select Site
            settings to manage navbar, footer and shared animation defaults.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={scope}
          onValueChange={(value) => setScope(value as DocScope)}
          className="mb-5"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="page">Current page</TabsTrigger>
            <TabsTrigger value="site">Site settings</TabsTrigger>
          </TabsList>
        </Tabs>

        {doc ? (
          <>
            {scope === "site" && <SiteNavigationEditor document={doc as JsonObject} />}
            <DynamicContentEditor
              value={doc as JsonObject}
              onChange={(next) => replaceDoc(next, scope)}
              onPathChange={(path, value) => setPath(path, value, scope)}
              title=""
              description={
                scope === "site"
                  ? "Shared changes appear across every page after publishing."
                  : "These fields belong only to the current page."
              }
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Turn on edit mode to load this document.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
