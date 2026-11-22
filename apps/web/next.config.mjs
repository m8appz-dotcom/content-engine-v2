/** @type {import('next').NextConfig} */
const workspace = process.env.CONTENT_ORIGINAL_WORKSPACE === '1';
const nextConfig = {
  transpilePackages: [],
  serverExternalPackages: ['@mariozechner/pi-ai'],
  basePath: workspace ? '/app' : '',
  env: { NEXT_PUBLIC_CONTENT_BASE_PATH: workspace ? '/app' : '', NEXT_PUBLIC_CONTENT_WORKSPACE: workspace ? '1' : '0' },
};
export default nextConfig;
