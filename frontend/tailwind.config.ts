import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
	darkMode: 'class',
	content: [
		'./app/**/*.{ts,tsx,js,jsx}',
		'./components/**/*.{ts,tsx,js,jsx}',
		'../src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['InterVariable', 'Inter', ...fontFamily.sans],
				mono: ['JetBrains Mono', ...fontFamily.mono],
				display: ['InterVariable', 'Inter', ...fontFamily.sans],
			},
			colors: {
				base: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					900: '#0f172a',
					950: '#020617',
				},
				accent: {
					primary: {
						50: '#eff6ff',
						100: '#dbeafe',
						200: '#bfdbfe',
						300: '#93c5fd',
						400: '#60a5fa',
						500: '#3b82f6',
						600: '#2563eb',
						700: '#1d4ed8',
						800: '#1e40af',
						900: '#1e3a8a',
					},
					cyan: {
						50: '#ecfeff',
						100: '#cffafe',
						200: '#a5f3fc',
						300: '#67e8f9',
						400: '#22d3ee',
						500: '#06b6d4',
						600: '#0891b2',
						700: '#0e7490',
						800: '#155e75',
						900: '#164e63',
					},
					purple: {
						50: '#faf5ff',
						100: '#f3e8ff',
						200: '#e9d5ff',
						300: '#d8b4fe',
						400: '#c084fc',
						500: '#a855f7',
						600: '#9333ea',
						700: '#7c3aed',
						800: '#6b21a8',
						900: '#581c87',
					}
				},
				glass: {
					white: 'rgba(255, 255, 255, 0.1)',
					dark: 'rgba(0, 0, 0, 0.2)',
					border: 'rgba(255, 255, 255, 0.18)',
				},
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-crypto': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
				'gradient-premium': 'linear-gradient(135deg, #f093fb 0%, #f5576c 25%, #4facfe 50%, #00f2fe 75%, #43e97b 100%)',
				'noise': "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"0.03\"/%3E%3C/svg%3E')",
			},
			backdropBlur: {
				xs: '2px',
			},
			boxShadow: {
				'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
				'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
				'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.4)',
				'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
				'glow-primary': '0 0 20px rgba(59, 130, 246, 0.4)',
				'premium': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
			},
			borderRadius: {
				'2xl': '1rem',
				'3xl': '1.5rem',
				'4xl': '2rem',
			},
			animation: {
				'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
				'float': 'float 6s ease-in-out infinite',
				'glow': 'glow 2s ease-in-out infinite alternate',
				'slide-in': 'slideIn 0.5s ease-out',
				'fade-in': 'fadeIn 0.3s ease-out',
				'scale-in': 'scaleIn 0.2s ease-out',
			},
			keyframes: {
				pulseSoft: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.4' },
				},
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' },
				},
				glow: {
					'from': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' },
					'to': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.8)' },
				},
				slideIn: {
					'from': { transform: 'translateX(-100%)', opacity: '0' },
					'to': { transform: 'translateX(0)', opacity: '1' },
				},
				fadeIn: {
					'from': { opacity: '0' },
					'to': { opacity: '1' },
				},
				scaleIn: {
					'from': { transform: 'scale(0.9)', opacity: '0' },
					'to': { transform: 'scale(1)', opacity: '1' },
				},
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem',
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
		function({ addUtilities }: { addUtilities: any }) {
			addUtilities({
				'.glass': {
					background: 'rgba(255, 255, 255, 0.1)',
					backdropFilter: 'blur(10px)',
					border: '1px solid rgba(255, 255, 255, 0.18)',
				},
				'.glass-dark': {
					background: 'rgba(0, 0, 0, 0.2)',
					backdropFilter: 'blur(10px)',
					border: '1px solid rgba(255, 255, 255, 0.1)',
				},
				'.glass-premium': {
					background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
					backdropFilter: 'blur(20px) saturate(180%)',
					border: '1px solid rgba(255, 255, 255, 0.125)',
					boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
				},
				'.text-gradient': {
					background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
					backgroundClip: 'text',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
				},
				'.text-gradient-premium': {
					background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 25%, #4facfe 50%, #00f2fe 75%, #43e97b 100%)',
					backgroundClip: 'text',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
				},
				'.noise': {
					position: 'relative',
					'&::before': {
						content: '""',
						position: 'absolute',
						top: '0',
						left: '0',
						right: '0',
						bottom: '0',
						backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\" opacity=\"0.03\"/%3E%3C/svg%3E')",
						pointerEvents: 'none',
					},
				},
				'.hover-glass': {
					transition: 'all 0.3s ease',
					'&:hover': {
						background: 'rgba(255, 255, 255, 0.15)',
						backdropFilter: 'blur(15px)',
						transform: 'translateY(-2px)',
					},
				},
			})
		},
	],
};

export default config;
