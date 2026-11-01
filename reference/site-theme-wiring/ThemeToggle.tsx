"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Light/dark switch for the navbar.
 *
 * next-themes resolves the theme on the client, so the icon is unknowable
 * during SSR. Rendering it anyway causes a hydration mismatch and a visible
 * flash of the wrong icon, so the control renders an inert placeholder of
 * the same size until mounted — which also stops the navbar shifting.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-full " +
    "text-muted-foreground transition-colors hover:bg-accent hover:text-brand " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (!mounted) {
    return <span aria-hidden="true" className={`${base} ${className}`} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`${base} ${className}`}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
