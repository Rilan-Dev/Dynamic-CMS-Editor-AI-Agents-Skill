"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAnimationPreviewConfig } from "@/components/animation-editor/runtime/AnimationEditorProvider";
import type { JsonObject, JsonValue } from "@/components/cms/json";
import { useSection } from "@/components/cms/store";
import { resolveAnimationConfig } from "./resolveAnimationConfig";
import type {
  AnimationConfig,
  AnimationDevice,
  AnimationTargetType,
  ResolvedAnimationConfig,
} from "./types";

const SiteAnimationsContext = createContext<JsonObject>({});
const PageAnimationsContext = createContext<JsonObject>({});
const PageIdContext = createContext<string>("page");
const SectionContext = createContext<string | undefined>(undefined);

const asObject = (value: JsonValue | undefined): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asAnimationConfig = (value: JsonValue | undefined): AnimationConfig | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as unknown as AnimationConfig)
    : undefined;

export function selectPreviewOrDraft<T>(preview: T | undefined, draft: T): T {
  return preview ?? draft;
}

const useDevicePreferences = (): {
  device: AnimationDevice;
  reducedMotion: boolean;
} => {
  const [state, setState] = useState<{
    device: AnimationDevice;
    reducedMotion: boolean;
  }>({ device: "desktop", reducedMotion: false });

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const width = window.innerWidth;
      setState({
        device: width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop",
        reducedMotion: reducedQuery.matches,
      });
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    reducedQuery.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      reducedQuery.removeEventListener?.("change", update);
    };
  }, []);

  return state;
};

export function AnimationProvider({
  siteAnimations,
  children,
}: {
  siteAnimations: JsonObject;
  children: ReactNode;
}) {
  const liveAnimations = useSection(["animations"], siteAnimations, "site");
  return (
    <SiteAnimationsContext.Provider value={liveAnimations}>
      {children}
    </SiteAnimationsContext.Provider>
  );
}

export function PageAnimationProvider({
  pageId,
  pageAnimations,
  children,
}: {
  pageId: string;
  pageAnimations: JsonObject;
  children: ReactNode;
}) {
  const liveAnimations = useSection(["animations"], pageAnimations);
  return (
    <PageIdContext.Provider value={pageId}>
      <PageAnimationsContext.Provider value={liveAnimations}>
        {children}
      </PageAnimationsContext.Provider>
    </PageIdContext.Provider>
  );
}

export function SectionAnimationProvider({
  sectionId,
  children,
}: {
  sectionId: string;
  children: ReactNode;
}) {
  return <SectionContext.Provider value={sectionId}>{children}</SectionContext.Provider>;
}

export function useCurrentAnimationPage(): string {
  return useContext(PageIdContext);
}

export function useCurrentAnimationSection(): string | undefined {
  return useContext(SectionContext);
}

export function useResolvedAnimationConfig({
  type,
  targetId,
  sectionId,
}: {
  type: AnimationTargetType;
  targetId?: string;
  sectionId?: string;
}): ResolvedAnimationConfig {
  const siteAnimations = useContext(SiteAnimationsContext);
  const pageAnimations = useContext(PageAnimationsContext);
  const preferences = useDevicePreferences();
  const previewConfig = useAnimationPreviewConfig(targetId);

  return useMemo(() => {
    const defaultsByType = asObject(siteAnimations.defaultsByType);
    const sections = asObject(pageAnimations.sections);
    const components = asObject(pageAnimations.components);

    const layers: Array<AnimationConfig | undefined> = [
      asAnimationConfig(siteAnimations.global),
      asAnimationConfig(defaultsByType[type]),
      asAnimationConfig(pageAnimations.page),
      sectionId ? asAnimationConfig(sections[sectionId]) : undefined,
      targetId ? asAnimationConfig(components[targetId]) : undefined,
      previewConfig,
    ];

    return resolveAnimationConfig(
      layers,
      preferences.device,
      preferences.reducedMotion,
    );
  }, [
    pageAnimations,
    preferences.device,
    preferences.reducedMotion,
    previewConfig,
    sectionId,
    siteAnimations,
    targetId,
    type,
  ]);
}
