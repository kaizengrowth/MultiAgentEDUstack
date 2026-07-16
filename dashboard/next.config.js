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
  // Keep the file watcher inside the dashboard package. Without this,
  // Watchpack can walk parent dirs until it hits EMFILE, and CSS/HMR die.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          "**/.git/**",
          "**/node_modules/**",
          "**/.next/**",
          "**/transcripts/**",
          "**/db/*.sqlite3",
        ],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
