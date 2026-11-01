import { revalidatePath } from "next/cache";
import { isBlogDocument } from "@/components/blog/blogSlug";
import { isProjectDocument } from "@/components/projects/projectSlug";

/** Revalidate only after the atomic release has committed. */
export function revalidateCmsPaths(slugs: string[]): void {
  for (const slug of slugs) {
    if (slug === "site") {
      revalidatePath("/", "layout");
    } else if (slug === "blogs" || isBlogDocument(slug)) {
      revalidatePath("/blogs");
      revalidatePath("/blogs/[slug]", "page");
    } else if (slug === "projects" || isProjectDocument(slug)) {
      revalidatePath("/projects");
      revalidatePath("/projects/[slug]", "page");
      revalidatePath("/services/[slug]", "page");
      revalidatePath("/services/[slug]/[child]", "page");
    } else if (slug === "updates") {
      revalidatePath("/updates");
      revalidatePath("/", "layout");
    } else {
      revalidatePath(slug === "home" ? "/" : `/${slug}`);
      if (slug === "services") {
        revalidatePath("/services/[slug]", "page");
        revalidatePath("/services/[slug]/[child]", "page");
        revalidatePath("/", "layout");
      }
    }
  }
}
