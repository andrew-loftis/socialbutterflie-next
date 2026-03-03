import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Keep config minimal for Netlify Next runtime compatibility.
  // This repo contains multiple lockfiles; pin tracing root to this app to avoid monorepo inference warnings.
  outputFileTracingRoot: configDir,
  eslint: {
    // Our ESLint flat-config setup is still in flux; do not block prod builds/deploys on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
