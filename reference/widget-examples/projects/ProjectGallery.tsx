"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { E, EAdd, EImg, ERemove } from "@/components/cms/editable";
import { createCmsItemId } from "@/components/cms/InlineListControls";
import type { JsonObject } from "@/components/cms/json";
import { setPath, useCmsEditing } from "@/components/cms/store";
import { assetSrc } from "@/content/types";
import { galleryItems } from "./projectDetail";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * One photo spans the row, two share it, three or more lead with a
 * double-size first tile — no count leaves a lonely thumbnail.
 */
const tileClass = (position: number, count: number): string => {
  if (count === 1) return "col-span-2 aspect-[16/9] md:col-span-4 md:row-span-2 md:aspect-auto";
  if (count === 2) return "col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto";
  if (position === 0) return "col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto";
  return "aspect-square md:aspect-auto";
};

/**
 * Bento grid: the first photo leads at double size, the rest tile around
 * it. A visitor opens any photo in a native <dialog> lightbox (focus trap
 * and Escape come free); an editor instead gets the image picker, a remove
 * control and an alt-text field on every tile.
 */
export function ProjectGallery({
  gallery,
  labels,
  projectTitle,
}: {
  /** The raw stored array, so edit paths index the document correctly. */
  gallery: unknown;
  labels: JsonObject;
  projectTitle: string;
}) {
  const { editing, ready } = useCmsEditing();
  const editActive = editing && ready;
  const items = galleryItems(gallery, editActive);
  const stored = Array.isArray(gallery) ? (gallery as JsonObject[]) : [];

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  const show = (position: number) => {
    setOpen(position);
    dialogRef.current?.showModal();
  };
  const step = useCallback(
    (delta: number) =>
      setOpen((current) =>
        current === null ? current : (current + delta + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(null);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  if (!items.length && !editActive) return null;

  const update = (next: JsonObject[]) => setPath(["gallery"], next);
  const add = () =>
    update([
      ...stored,
      { id: createCmsItemId("image"), src: "/placeholder.svg", alt: "", visible: true },
    ]);

  const current = open === null ? null : items[open];
  const altOf = (alt: string, position: number) =>
    alt || `${projectTitle} — photo ${position + 1}`;

  return (
    <AnimatedSection
      id="projectGallery"
      label="Project gallery"
      className="bg-muted/40 py-14 lg:py-20"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong">
              <E
                scope="doc:projects"
                path={["detail", "galleryEyebrow"]}
                value={text(labels.galleryEyebrow) || "Gallery"}
                as="span"
              />
            </p>
            <AnimatedElement
              id="gallery-title"
              type="heading"
              label="Gallery title"
              as="h2"
              className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              <E
                scope="doc:projects"
                path={["detail", "galleryTitle"]}
                value={text(labels.galleryTitle) || "Project Gallery"}
                as="span"
              />
            </AnimatedElement>
          </div>
          {items.length > 1 && (
            <p className="text-sm font-medium text-muted-foreground">
              {items.length} photos
            </p>
          )}
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-flow-dense md:grid-cols-4 md:auto-rows-[11rem] lg:auto-rows-[13rem]">
          {items.map((item, position) => {
            const alt = altOf(item.alt, position);
            return (
              <li
                key={item.id}
                className={`relative overflow-hidden rounded-2xl bg-muted ${tileClass(
                  position,
                  items.length,
                )}`}
              >
                {editActive ? (
                  <>
                    <ERemove
                      onRemove={() =>
                        update(stored.filter((_, index) => index !== item.index))
                      }
                      label="gallery image"
                    />
                    <EImg
                      path={["gallery", item.index, "src"]}
                      image={{ src: assetSrc(item.src), alt }}
                      storedAs="string"
                      className="h-full w-full object-cover"
                    />
                    <p className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-1.5 text-xs text-inverse-foreground">
                      <span className="text-inverse-foreground/70">Alt text: </span>
                      <E path={["gallery", item.index, "alt"]} value={item.alt} as="span" />
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => show(position)}
                    aria-label={`Open ${alt}`}
                    className="group block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={assetSrc(item.src)}
                      alt={alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/35"
                    >
                      <Expand
                        size={26}
                        className="text-inverse-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {editActive && (
          <div className="mt-6">
            <EAdd onAdd={add} label="Add image" />
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={current ? altOf(current.alt, open ?? 0) : "Photo viewer"}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
        onClick={(event) => {
          // Anywhere but the photo or a control dismisses, like a backdrop.
          if (!(event.target as HTMLElement).closest("img, button")) {
            dialogRef.current?.close();
          }
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/90"
      >
        {current && open !== null && (
          <figure className="flex h-[100dvh] w-screen flex-col items-center justify-center gap-4 px-4 py-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetSrc(current.src)}
              alt={altOf(current.alt, open)}
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <figcaption className="text-center text-sm text-inverse-foreground/70">
              {current.alt && <span className="text-inverse-foreground">{current.alt} · </span>}
              {open + 1} / {items.length}
            </figcaption>
          </figure>
        )}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close photo viewer"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-inverse-foreground/10 text-inverse-foreground transition-colors hover:bg-inverse-foreground/25"
        >
          <X size={22} aria-hidden="true" />
        </button>
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-inverse-foreground/10 text-inverse-foreground transition-colors hover:bg-inverse-foreground/25"
            >
              <ChevronLeft size={26} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-inverse-foreground/10 text-inverse-foreground transition-colors hover:bg-inverse-foreground/25"
            >
              <ChevronRight size={26} aria-hidden="true" />
            </button>
          </>
        )}
      </dialog>
    </AnimatedSection>
  );
}
