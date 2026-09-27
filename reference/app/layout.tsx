import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import "@/components/animation-editor/styles/animation-editor.css"
import "@/components/footer/footer-inline-cms.css"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { AnimationProvider } from "@/components/animations/AnimationProvider"
import { PageTransitionBoundary } from "@/components/animations/PageTransitionBoundary"
import { ThemeProvider } from "@/components/theme-provider"
import { CmsRoot } from "@/components/cms/CmsRoot"
import { SmtsAnimationEditorProvider } from "@/components/cms/animation/SmtsAnimationEditorProvider"
import type { JsonObject } from "@/components/cms/json"
import { CONTENT_REGISTRY } from "@/content/registry"
import { getPageContent } from "@/lib/server/getPageContent"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, organizationJsonLd } from "@/lib/seo"
import { RevealObserver } from "@/motion/RevealObserver"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Building the Future with Trust and Excellence`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "SMTS Contracting",
    "contracting company Dubai",
    "building contracting UAE",
    "steel structure fabrication",
    "building maintenance Dubai",
    "shade installation UAE",
  ],
  authors: [{ name: SITE_NAME }],
  icons: { icon: "/favicon.ico" },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Building the Future with Trust and Excellence`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/images/home_image.jpg", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Building the Future with Trust and Excellence`,
    description: SITE_DESCRIPTION,
    images: ["/images/home_image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [siteContent, servicesContent] = await Promise.all([
    getPageContent("site", CONTENT_REGISTRY.site),
    getPageContent("services", CONTENT_REGISTRY.services),
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body className={`${montserrat.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AnimationProvider siteAnimations={siteAnimations}>
            <SmtsAnimationEditorProvider>
              <PageTransitionBoundary config={pageTransition}>
                <div className="flex min-h-screen flex-col">
                  <Navbar content={siteContent} />
                  <main className="flex-1">{children}</main>
                  <Footer content={siteContent} servicesContent={servicesContent} />
                </div>
              </PageTransitionBoundary>
              <CmsRoot />
              <RevealObserver />
            </SmtsAnimationEditorProvider>
          </AnimationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
