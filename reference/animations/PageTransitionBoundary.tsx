"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { JsonObject } from "@/components/cms/json";
import { useSection } from "@/components/cms/store";

export interface TransitionNavigationCheck {
  currentOrigin: string;
  currentPath: string;
  href: string;
  target: string;
  download: boolean;
  modified: boolean;
  editorActive: boolean;
  excludedPaths: string[];
}

export function shouldTransitionNavigation({
  currentOrigin,
  currentPath,
  href,
  target,
  download,
  modified,
  editorActive,
  excludedPaths,
}: TransitionNavigationCheck): boolean {
  if (!href || modified || download || editorActive || target === "_blank") return false;
  let url: URL;
  try {
    url = new URL(href, currentOrigin);
  } catch {
    return false;
  }
  if (url.origin !== currentOrigin) return false;
  if (!["http:", "https:"].includes(url.protocol)) return false;
  if (url.pathname === currentPath && url.hash) return false;
  if (excludedPaths.some((path) => path && url.pathname.startsWith(path))) return false;
  return true;
}

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const framesForPreset = (
  preset: string,
  phase: "enter" | "exit",
): Keyframe[] => {
  const entering = phase === "enter";
  switch (preset) {
    case "slide-left":
      return entering
        ? [{ opacity: 0, transform: "translateX(3rem)" }, { opacity: 1, transform: "none" }]
        : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-3rem)" }];
    case "slide-right":
      return entering
        ? [{ opacity: 0, transform: "translateX(-3rem)" }, { opacity: 1, transform: "none" }]
        : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(3rem)" }];
    case "scale":
      return entering
        ? [{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "scale(1)" }]
        : [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.025)" }];
    case "wipe":
      return entering
        ? [{ clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }]
        : [{ clipPath: "inset(0 0 0 0)", opacity: 1 }, { clipPath: "inset(0 0 0 100%)", opacity: 1 }];
    case "curtain":
      return entering
        ? [{ clipPath: "inset(50% 0 50% 0)", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }]
        : [{ clipPath: "inset(0 0 0 0)", opacity: 1 }, { clipPath: "inset(50% 0 50% 0)", opacity: 1 }];
    case "fade":
    default:
      return entering ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
  }
};

export function PageTransitionBoundary({
  config,
  children,
}: {
  config: JsonObject;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const liveConfig = useSection(
    ["animations", "pageTransition"],
    config,
    "site",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const excludedPaths = useMemo(
    () =>
      Array.isArray(liveConfig.excludedPaths)
        ? liveConfig.excludedPaths.filter((item): item is string => typeof item === "string")
        : [],
    [liveConfig.excludedPaths],
  );

  const enabled = liveConfig.enabled === true;
  const preset = String(liveConfig.preset ?? "fade");
  const easing = String(liveConfig.easing ?? "ease-in-out");
  const enterDuration = Math.max(0, Number(liveConfig.enterDurationMs ?? 300));
  const exitDuration = Math.max(0, Number(liveConfig.exitDurationMs ?? 220));
  const showOverlay = liveConfig.showOverlay === true;

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !enabled) {
      pendingRef.current = false;
      setOverlayVisible(false);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reducedBehavior = String(liveConfig.reducedMotion ?? "disable");
    if (reduced && reducedBehavior === "disable") {
      pendingRef.current = false;
      setOverlayVisible(false);
      return;
    }
    const effectiveDuration = reduced ? Math.min(enterDuration, 160) : enterDuration;
    const effectivePreset = reduced ? "fade" : preset;
    const animation = element.animate(framesForPreset(effectivePreset, "enter"), {
      duration: effectiveDuration,
      easing,
      fill: "both",
    });
    animation.finished.finally(() => {
      pendingRef.current = false;
      setOverlayVisible(false);
    }).catch(() => undefined);
    return () => animation.cancel();
  }, [easing, enabled, enterDuration, liveConfig.reducedMotion, pathname, preset]);

  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      if (!enabled || event.defaultPrevented || event.button !== 0 || pendingRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.closest("[data-cms-ui]")) return;
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      const editorActive = document.body.classList.contains("cms-editing");
      if (
        !shouldTransitionNavigation({
          currentOrigin: window.location.origin,
          currentPath: window.location.pathname,
          href: anchor.href,
          target: anchor.target,
          download: anchor.hasAttribute("download"),
          modified,
          editorActive,
          excludedPaths,
        })
      ) {
        return;
      }

      event.preventDefault();
      const destination = new URL(anchor.href);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const reducedBehavior = String(liveConfig.reducedMotion ?? "disable");
      if (reduced && reducedBehavior === "disable") {
        router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        return;
      }

      pendingRef.current = true;
      if (showOverlay) setOverlayVisible(true);
      const element = rootRef.current;
      const effectiveDuration = reduced ? Math.min(exitDuration, 120) : exitDuration;
      const effectivePreset = reduced ? "fade" : preset;
      let completed = false;
      const navigate = () => {
        if (completed) return;
        completed = true;
        router.push(`${destination.pathname}${destination.search}${destination.hash}`);
      };
      const timeout = window.setTimeout(navigate, effectiveDuration + 500);
      if (!element || effectiveDuration === 0) {
        window.clearTimeout(timeout);
        navigate();
        return;
      }
      try {
        await element.animate(framesForPreset(effectivePreset, "exit"), {
          duration: effectiveDuration,
          easing,
          fill: "both",
        }).finished;
      } catch {
        // The timeout remains the navigation fallback.
      } finally {
        window.clearTimeout(timeout);
        navigate();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [
    easing,
    enabled,
    excludedPaths,
    exitDuration,
    liveConfig.reducedMotion,
    preset,
    router,
    showOverlay,
  ]);

  return (
    <>
      <div ref={rootRef} data-page-transition-root>
        {children}
      </div>
      {showOverlay && overlayVisible && (
        <div
          className="pointer-events-none fixed inset-0 z-[1280] flex items-center justify-center"
          style={{ background: String(liveConfig.overlayBackground ?? "#ffffff") }}
          aria-hidden="true"
        >
          {asObject(liveConfig.overlayLogo).src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(asObject(liveConfig.overlayLogo).src)}
              alt=""
              className="max-h-20 max-w-52 object-contain"
            />
          ) : null}
        </div>
      )}
    </>
  );
}
