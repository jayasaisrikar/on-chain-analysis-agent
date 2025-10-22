/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		externalDir: true, // allow importing shared source outside frontend (e.g. ../../src)
		serverComponentsExternalPackages: ['@iqai/adk']
	},
	transpilePackages: ['@iqai/adk'],
	outputFileTracingRoot: process.cwd(),
	distDir: '.next',
	trailingSlash: false,
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: '/api/:path*'
			}
		];
	}
};
export default nextConfig;
