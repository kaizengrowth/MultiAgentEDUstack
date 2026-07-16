/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  // sql.js ships its .wasm as a runtime asset, loaded via a dynamic
  // require.resolve() in lib/db.ts. Left to webpack, that resolves as a
  // "context module" that tries to bundle every file in sql.js/dist,
  // including .wasm/.zip files webpack has no loader for. Marking the
  // package external hands the require to Node at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ["sql.js"],
  },
};

module.exports = nextConfig;
