import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import "@/components/animation-editor/styles/animation-editor.css"
import "@/components/footer/footer-inline-cms.css"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { AnimationProvider } from "@/components/animations/AnimationProvider"
import { PageTransitionBoundary } from "@/components/animations/PageTransitionBoundary"
import { ThemeProvider } from "@/components/theme-provider"
import { fontVariables } from "./fonts"
import { SiteThemeStyle } from "@/components/theme/SiteThemeStyle"
import { CmsRoot } from "@/components/cms/CmsRoot"
import { SmtsAnimationEditorProvider } from "@/components/cms/animation/SmtsAnimationEditorProvider"
import type { JsonObject } from "@/components/cms/json"
import { CONTENT_REGISTRY } from "@/content/registry"
import { getPageContent } from "@/lib/server/getPageContent"
import { latestUpdatesPayload } from "@/components/updates/updatesModel"
import { organizationJsonLd } from "@/lib/seo"
import { buildRootMetadata } from "@/lib/seo/rootMetadata"
import { RevealObserver } from "@/motion/RevealObserver"
import { AnalyticsRuntime } from "@/components/analytics/AnalyticsRuntime"

export const metadata: Metadata = buildRootMetadata()

// CMS content is environment-specific database data. Never bake it into
// shared static HTML at build time; read it from the schema selected by the
// active deployment on each request.
export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [siteContent, servicesContent, updatesContent] = await Promise.all([
    getPageContent("site", CONTENT_REGISTRY.site),
    getPageContent("services", CONTENT_REGISTRY.services),
    getPageContent("updates", CONTENT_REGISTRY.updates),
  ])
  const siteAnimations =
    siteContent.animations && typeof siteContent.animations === "object"
      ? (siteContent.animations as JsonObject)
      : {}
  const pageTransition =
    siteAnimations.pageTransition && typeof siteAnimations.pageTransition === "object"
      ? (siteAnimations.pageTransition as JsonObject)
      : {}

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body className="font-sans">
        <SiteThemeStyle siteContent={siteContent} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AnimationProvider siteAnimations={siteAnimations}>
            <SmtsAnimationEditorProvider>
              <PageTransitionBoundary config={pageTransition}>
                <div className="flex min-h-screen flex-col">
                  <Navbar
                    content={siteContent}
                    servicesContent={servicesContent}
                    updatesContent={latestUpdatesPayload(updatesContent as JsonObject)}
                  />
                  <main className="flex-1">{children}</main>
                  <Footer content={siteContent} servicesContent={servicesContent} />
                </div>
              </PageTransitionBoundary>
              <CmsRoot />
              <RevealObserver />
            </SmtsAnimationEditorProvider>
          </AnimationProvider>
          <AnalyticsRuntime />
        </ThemeProvider>
      </body>
    </html>
  )
}
