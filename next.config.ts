import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Serveur autonome pour l'image Docker (Dockerfile) : seul le nécessaire est embarqué.
  output: "standalone",
  // Pilotes de base de données : chargés tels quels côté serveur (PGlite embarque du WebAssembly).
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  // PGlite (base embarquée de développement) n'est pas utilisé en production : il reste hors de l'image.
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/pglite/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
