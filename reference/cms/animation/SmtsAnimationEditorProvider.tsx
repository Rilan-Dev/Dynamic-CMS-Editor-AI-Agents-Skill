"use client";

import { useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { AnimationEditorProvider } from "@/components/animation-editor/runtime/AnimationEditorProvider";
import { cmsActivePopover } from "../activePopover";
import { useCmsEditing } from "../store";
import { createSmtsAnimationEditorAdapter } from "./SmtsAnimationEditorAdapter";

export function SmtsAnimationEditorProvider({ children }: { children: ReactNode }) {
  const { editing, ready } = useCmsEditing();
  const adapter = useMemo(() => createSmtsAnimationEditorAdapter(), []);
  const slots = useMemo(
    () => ({
      renderToast(message: string, tone: "success" | "error" | "info") {
        if (tone === "success") toast.success(message);
        else if (tone === "error") toast.error(message);
        else toast(message);
      },
    }),
    [],
  );

  return (
    <AnimationEditorProvider
      enabled={editing && ready}
      adapter={adapter}
      coordinator={cmsActivePopover}
      slots={slots}
    >
      {children}
    </AnimationEditorProvider>
  );
}
