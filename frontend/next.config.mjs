/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		externalDir: true, // allow importing shared source outside frontend (e.g. ../../src)
	},
	transpilePackages: ['@iqai/adk'],
	outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
