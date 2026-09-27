import { ALL_ICONS } from "./icons";
import { resolveIconValue } from "./iconValue";

export function ReadOnlyIcon({
  value,
  className,
  alt = "",
  fallback = "Wrench",
}: {
  value: unknown;
  className?: string;
  alt?: string;
  fallback?: string;
}) {
  const resolved = resolveIconValue(value, fallback);

  if (resolved.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolved.src} alt={alt} className={className} />
    );
  }

  const Icon = ALL_ICONS[resolved.name];
  return alt ? (
    <Icon className={className} role="img" aria-label={alt} />
  ) : (
    <Icon className={className} aria-hidden="true" />
  );
}
