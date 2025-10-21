/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// Remove externalDir to reduce RSC manifest complexity; transpile ADK for compatibility
	experimental: {},
	transpilePackages: ['@iqai/adk'],
	outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
