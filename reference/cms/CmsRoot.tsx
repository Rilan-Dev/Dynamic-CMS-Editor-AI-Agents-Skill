"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { clearLegacyCmsKey } from "@/lib/services/cms.service";

/**
 * CMS entry point mounted in the root layout. The editing bundle
 * (context, toolbar, panel, content registry) is code-split and only
 * loads after the editor is unlocked with `?edit=1` — visitors never
 * download it.
 */

const CmsTools = dynamic(() => import("./CmsTools").then((m) => m.CmsTools));

const UNLOCK_FLAG = "cms:unlocked";
const UNLOCK_EVENT = "cms:unlocked-change";

function readUnlockedSnapshot() {
  try {
    return (
      typeof window !== "undefined" &&
      sessionStorage.getItem(UNLOCK_FLAG) === "1"
    );
  } catch {
    return false;
  }
}

function subscribeUnlocked(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(UNLOCK_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(UNLOCK_EVENT, onStoreChange);
  };
}

function CmsGate() {
  const searchParams = useSearchParams();
  const editParam = searchParams?.get("edit");
  const unlocked = useSyncExternalStore(
    subscribeUnlocked,
    readUnlockedSnapshot,
    () => false,
  );

  useEffect(() => {
    clearLegacyCmsKey();
  }, []);

  useEffect(() => {
    try {
      if (editParam === "1") {
        sessionStorage.setItem(UNLOCK_FLAG, "1");
        window.dispatchEvent(new Event(UNLOCK_EVENT));
      }
      if (editParam === "0") {
        sessionStorage.removeItem(UNLOCK_FLAG);
        window.dispatchEvent(new Event(UNLOCK_EVENT));
      }
    } catch {
      // Private browsing or disabled storage should leave the editor locked.
    }
  }, [editParam]);

  if (!unlocked) return null;
  return <CmsTools />;
}

export function CmsRoot() {
  return (
    <Suspense fallback={null}>
      <CmsGate />
    </Suspense>
  );
}
