/** @type {import('next').NextConfig} */
const buildSha =
  process.env.COMMIT_REF ||
  process.env.NETLIFY_COMMIT_REF ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "";

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildSha,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
