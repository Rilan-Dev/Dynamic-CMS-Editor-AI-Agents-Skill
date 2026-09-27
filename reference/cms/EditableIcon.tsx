"use client";

import type { ReactNode } from "react";
import { assetSrc } from "@/content/types";
import { EIcon } from "./editable";
import { ALL_ICONS } from "./icons";
import { resolveIconValue } from "./iconValue";
import type { PathSegment } from "./json";
import type { DocScope } from "./store";

export function EditableIcon({
  path,
  value,
  className,
  alt = "",
  scope = "page",
  fallback = "Settings",
}: {
  path: PathSegment[];
  value: unknown;
  className?: string;
  alt?: string;
  scope?: DocScope;
  fallback?: string;
}) {
  const normalizedValue = assetSrc(value);
  const resolved = resolveIconValue(value, fallback);
  let visual: ReactNode;

  if (resolved.kind === "image") {
    visual = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolved.src} alt={alt} className={className} />
    );
  } else {
    const Icon = ALL_ICONS[resolved.name];
    visual = <Icon className={className} aria-hidden="true" />;
  }

  return (
    <EIcon path={path} value={normalizedValue} scope={scope}>
      {visual}
    </EIcon>
  );
}
