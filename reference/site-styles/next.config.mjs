/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Next stops warning about the sibling
  // lockfile in the parent Urban-Nexus directory and always resolves
  // modules/output relative to this app.
  turbopack: {
    root: import.meta.dirname,
  },
  // Images are served as-is (no built-in optimizer): the production
  // container runs read-only, so there is no writable optimizer cache.
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['100.72.192.28', '192.168.1.3'],
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
    ]
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // User-uploaded assets: neutralise any active content (a hostile
        // SVG cannot run script) and forbid MIME sniffing.
        source: '/uploads/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'sandbox; default-src \'none\'; img-src \'self\' data:; style-src \'unsafe-inline\'' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // Database-stored uploads (lib/server/mediaStore.ts): same lock-down.
        source: '/media/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'sandbox; default-src \'none\'; img-src \'self\' data:; style-src \'unsafe-inline\'' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
